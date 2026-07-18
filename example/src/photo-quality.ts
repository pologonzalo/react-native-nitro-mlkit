// Reusable on-device photo-quality utilities — the bit you'd lift straight into
// the main app. Given ML Kit face classification (eyes-open + smiling per face)
// plus capture time and labels, it:
//   • scores how "keepable" a shot is (open eyes >> closed; a smile is a bonus),
//   • groups near-duplicate shots (bursts / retakes taken seconds apart),
//   • picks the best frame in each group,
//   • flags screenshots / text clutter.
// Pure functions, no native and no React — trivially testable and portable.

/** The only face fields the scorer needs (subset of DetectedFace). */
export type FaceQuality = {
  smilingProbability: number;
  leftEyeOpenProbability: number;
  rightEyeOpenProbability: number;
};

/** One analysed photo. `id` is the MediaLibrary asset id (for deletion). */
export type CleanerPhoto = {
  id: string;
  uri: string;
  time: number; // creationTime ms epoch (0 if unknown)
  faces: FaceQuality[];
  labels: string[];
};

// ML Kit returns a negative probability when it wasn't computed; treat that as
// "unknown" rather than "closed / not smiling" so missing data isn't punished.
const known = (v: number, fallback: number) => (v < 0 ? fallback : v);

/**
 * How good a single face looks in a shot, 0..1. Open eyes dominate — a blink
 * ruins a photo — and a smile is a strong bonus on top.
 */
export function faceShotScore(f: FaceQuality): number {
  const eyes = (known(f.leftEyeOpenProbability, 0.5) + known(f.rightEyeOpenProbability, 0.5)) / 2;
  const smile = known(f.smilingProbability, 0.3);
  return eyes * (0.55 + 0.45 * smile);
}

/**
 * Best-shot score for a whole photo, 0..1. A group photo is only as good as its
 * worst face (one person blinking spoils it), so the minimum is weighted heavily
 * alongside the mean.
 */
export function bestShotScore(faces: FaceQuality[]): number {
  if (faces.length === 0) return 0;
  const scores = faces.map(faceShotScore);
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const min = Math.min(...scores);
  return 0.4 * mean + 0.6 * min;
}

/**
 * Cluster near-duplicate shots: photos with faces taken within `gapMs` of each
 * other and a similar face count — i.e. burst frames / retakes of one moment.
 * Only groups of 2+ are returned (a lone photo isn't a duplicate).
 */
export function groupSimilar(photos: CleanerPhoto[], gapMs = 8000): CleanerPhoto[][] {
  const seq = photos
    .filter((p) => p.faces.length > 0 && p.time > 0)
    .sort((a, b) => a.time - b.time);

  const groups: CleanerPhoto[][] = [];
  let cur: CleanerPhoto[] = [];
  for (const p of seq) {
    const last = cur[cur.length - 1];
    if (last && p.time - last.time <= gapMs && Math.abs(p.faces.length - last.faces.length) <= 1) {
      cur.push(p);
    } else {
      if (cur.length >= 2) groups.push(cur);
      cur = [p];
    }
  }
  if (cur.length >= 2) groups.push(cur);
  return groups;
}

export type Burst = { best: CleanerPhoto; rest: CleanerPhoto[]; bestScore: number };

/** Rank a group by best-shot score; the top frame is the keeper. */
export function pickBest(group: CleanerPhoto[]): Burst {
  const scored = group
    .map((p) => ({ p, s: bestShotScore(p.faces) }))
    .sort((a, b) => b.s - a.s);
  return { best: scored[0].p, rest: scored.slice(1).map((x) => x.p), bestScore: scored[0].s };
}

const SCREEN_WORDS = ["screenshot", "web page", "text", "document", "menu", "receipt", "font", "number"];

/** Screenshot / text-clutter detector (whole-token match, like the memories). */
export function isScreenshot(labels: string[]): boolean {
  return labels.some((l) => {
    const toks = l.split(/\s+/);
    return SCREEN_WORDS.some((w) => (w.includes(" ") ? l.includes(w) : l === w || toks.includes(w)));
  });
}

export type CleanupPlan = {
  bursts: Burst[];
  duplicates: number; // total non-best frames across all bursts
  screenshots: CleanerPhoto[];
  totalPhotos: number;
  reclaimable: number; // duplicates + screenshots
};

/** Turn analysed photos into a review-ready cleanup plan. */
export function buildCleanupPlan(photos: CleanerPhoto[]): CleanupPlan {
  const bursts = groupSimilar(photos)
    .map(pickBest)
    // Biggest / messiest bursts first.
    .sort((a, b) => b.rest.length - a.rest.length);
  const duplicates = bursts.reduce((n, b) => n + b.rest.length, 0);
  const screenshots = photos
    .filter((p) => isScreenshot(p.labels))
    .sort((a, b) => b.time - a.time);
  return {
    bursts,
    duplicates,
    screenshots,
    totalPhotos: photos.length,
    reclaimable: duplicates + screenshots.length,
  };
}

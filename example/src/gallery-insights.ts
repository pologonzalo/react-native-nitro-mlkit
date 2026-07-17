// Turns raw ML Kit batch output into a smart, Google-Photos-style set of
// "Memories". Each photo carries its labels + face stats + capture time; a
// rule engine (multi-signal, not just single labels) sorts them into ~20
// curated memories. Only memories that actually have photos are surfaced, so
// nothing shows up empty on a real camera roll. Pure aggregation, no native.

import { C } from "./theme";

/** One photo after the native scan: labels + faces + capture time, merged. */
export type ScannedPhoto = {
  uri: string;
  time: number; // creationTime, ms epoch (0 if unknown)
  labels: string[]; // lowercased ML Kit label texts
  faces: number; // face count
  smiles: number; // faces with smilingProbability > 0.6
};

// ─── Memory rule engine ─────────────────────────────────────────────────────

type Ctx = { hour: number }; // derived per-photo signals
type MemoryDef = {
  key: string;
  emoji: string;
  title: string;
  accent: string;
  /** Playful one-liner; gets the memory's photo count. */
  blurb: (n: number) => string;
  /** Does this photo belong to this memory? (a photo can match several) */
  match: (p: ScannedPhoto, c: Ctx) => boolean;
};

// Whole-token match, NOT arbitrary substring: a label matches a word only if
// the label equals it or contains it as a space-delimited token. This is what
// keeps "cat" from matching "va·cat·ion" and "text" from matching "textile"
// (both real false positives that exploded the pets/screens memories). Words
// that themselves contain a space (e.g. "web page") fall back to substring.
const has = (p: ScannedPhoto, ...words: string[]) =>
  p.labels.some((l) => {
    const toks = l.split(/\s+/);
    return words.some((w) => (w.includes(" ") ? l.includes(w) : l === w || toks.includes(w)));
  });

/** Ordered by how headline-worthy a memory is when counts tie. */
const MEMORIES: MemoryDef[] = [
  {
    key: "babies", emoji: "👶", title: "Tiny humans", accent: "#F59E0B",
    blurb: (n) => `${n} baby moments — the cutest corner of your roll.`,
    match: (p) => has(p, "baby", "infant", "toddler", "child", "children", "kid"),
  },
  {
    key: "trips", emoji: "✈️", title: "On tour", accent: "#0EA5E9",
    blurb: (n) => `${n} shots from your travels — you get around.`,
    match: (p) => has(p, "vacation", "trip", "travel", "tourism", "tourist", "luggage", "resort", "hotel", "airport", "landmark", "sightseeing"),
  },
  {
    key: "party", emoji: "🎉", title: "Party mode", accent: C.orange,
    blurb: (n) => `${n} celebrations — crowds, events and good times.`,
    // Drinks labels rarely fire on a real roll, so anchor on a social scene
    // (event / crowd / celebration) backed by an actual group of people.
    match: (p, c) =>
      has(p, "party", "nightclub", "disco", "dance", "cocktail", "wine", "beer", "drink", "champagne", "toast", "festival", "celebration", "concert") ||
      (has(p, "event", "crowd", "community", "audience") && (p.faces >= 3 || c.hour >= 21 || c.hour <= 3)),
  },
  {
    key: "squad", emoji: "👯", title: "The squad", accent: "#EC4899",
    blurb: (n) => `${n} group shots — you + the whole crew.`,
    match: (p) => p.faces >= 3,
  },
  {
    key: "smiles", emoji: "😄", title: "Say cheese", accent: C.yellow,
    blurb: (n) => `${n} big smiles caught in the act.`,
    // Face classification (smilingProbability) needs a native rebuild to turn
    // on, so we lean on the labeler's own "smile" label, which is free here.
    match: (p) => p.smiles >= 1 || has(p, "smile", "laugh", "grin"),
  },
  {
    key: "selfies", emoji: "🤳", title: "Selfie season", accent: "#8B5CF6",
    blurb: (n) => `${n} selfies. Absolutely iconic.`,
    match: (p) => has(p, "selfie") || (p.faces === 1 && has(p, "portrait", "face")),
  },
  {
    key: "duo", emoji: "💑", title: "Just us two", accent: "#F472B6",
    blurb: (n) => `${n} two-person moments.`,
    match: (p) => p.faces === 2,
  },
  {
    key: "glam", emoji: "👗", title: "Dressed up", accent: "#DB2777",
    blurb: (n) => `${n} times you turned up in your best fit.`,
    match: (p) => has(p, "dress", "gown", "suit", "tuxedo", "fashion", "outfit", "formal wear"),
  },
  {
    key: "foodie", emoji: "🍽️", title: "Foodie files", accent: "#EF4444",
    blurb: (n) => `${n} plates photographed before the first bite.`,
    match: (p) => has(p, "food", "dish", "cuisine", "meal", "breakfast", "brunch", "pizza", "sushi", "burger", "bread", "coffee", "snack", "tableware", "fast food"),
  },
  {
    key: "sweet", emoji: "🍰", title: "Sweet tooth", accent: "#F9A8D4",
    blurb: (n) => `${n} desserts, documented.`,
    match: (p) => has(p, "dessert", "cake", "ice cream", "chocolate", "pastry", "candy", "cupcake", "cookie"),
  },
  {
    key: "pets", emoji: "🐾", title: "Team pet", accent: "#22C55E",
    blurb: (n) => `${n} very good bois & girls.`,
    match: (p) => has(p, "dog", "cat", "pet", "puppy", "kitten", "bird", "rabbit", "animal"),
  },
  {
    key: "golden", emoji: "🌅", title: "Golden hour", accent: "#FB923C",
    blurb: (n) => `${n} skies worth stopping for.`,
    match: (p, c) => has(p, "sunset", "sunrise", "dusk", "dawn") || ((c.hour >= 18 && c.hour <= 20) && has(p, "sky", "cloud")),
  },
  {
    key: "night", emoji: "🌙", title: "After dark", accent: "#6366F1",
    blurb: (n) => `${n} late-night captures.`,
    // Content-anchored (a real night label, optionally boosted by a late hour)
    // so it doesn't swallow every evening photo.
    match: (p, c) =>
      has(p, "night", "neon", "fireworks", "moon", "concert", "stage", "nightlife") ||
      ((c.hour >= 22 || c.hour <= 4) && has(p, "light", "city", "bar", "party", "crowd")),
  },
  {
    key: "beach", emoji: "🏖️", title: "Beach days", accent: "#06B6D4",
    blurb: (n) => `${n} reasons you already miss summer.`,
    match: (p) => has(p, "beach", "sea", "ocean", "wave", "coast", "sand", "pool", "swimming", "swimwear", "surf"),
  },
  {
    key: "outdoors", emoji: "🏔️", title: "Great outdoors", accent: "#10B981",
    blurb: (n) => `${n} escapes into nature.`,
    match: (p) => has(p, "mountain", "forest", "tree", "trail", "hiking", "landscape", "valley", "waterfall", "snow", "meadow"),
  },
  {
    key: "flowers", emoji: "🌸", title: "Flower power", accent: "#F472B6",
    blurb: (n) => `${n} times you stopped for flowers.`,
    match: (p) => has(p, "flower", "petal", "blossom", "bouquet", "garden", "rose"),
  },
  {
    key: "city", emoji: "🏙️", title: "City lights", accent: "#3B82F6",
    blurb: (n) => `${n} urban wanders.`,
    match: (p) => has(p, "building", "city", "street", "architecture", "skyline", "urban", "skyscraper", "tower", "downtown"),
  },
  {
    key: "road", emoji: "🚗", title: "On the road", accent: "#0EA5E9",
    blurb: (n) => `${n} journeys, big and small.`,
    match: (p) => has(p, "car", "vehicle", "motorcycle", "bicycle", "road", "traffic", "train", "airplane", "boat", "bus"),
  },
  {
    key: "sports", emoji: "🏀", title: "Game on", accent: "#84CC16",
    blurb: (n) => `${n} moments of motion.`,
    match: (p) => has(p, "sport", "ball", "football", "basketball", "soccer", "stadium", "gym", "fitness", "running", "athlete", "team", "workout"),
  },
  {
    key: "art", emoji: "🎨", title: "Art & design", accent: "#A855F7",
    blurb: (n) => `${n} things that caught your eye.`,
    match: (p) => has(p, "art", "painting", "sculpture", "museum", "pattern", "drawing", "design", "mural", "graffiti"),
  },
  {
    key: "screens", emoji: "📱", title: "Screenshots", accent: "#64748B",
    blurb: (n) => `${n} screenshots & text. We won't tell.`,
    match: (p) => has(p, "screenshot", "web page", "text", "font", "document", "menu", "receipt", "number"),
  },
  {
    key: "pretty", emoji: "☁️", title: "Sky watch", accent: "#38BDF8",
    blurb: (n) => `${n} skies, clouds and daydreams.`,
    match: (p) => has(p, "sky", "cloud") && !has(p, "building", "car"),
  },
];

const MAX_PHOTOS_PER_MEMORY = 40;
/** A memory needs at least this many photos to be worth showing. */
const MIN_PHOTOS = 4;

export type Memory = {
  key: string;
  emoji: string;
  title: string;
  accent: string;
  blurb: string;
  count: number;
  photos: string[]; // photos[0] = cover
};

export type FaceStats = {
  photosWithFaces: number;
  totalFaces: number;
  smiles: number;
  biggestGroup: number;
  soloShots: number;
};

export type Insights = {
  scanned: number;
  elapsedMs: number;
  memories: Memory[];
  faces: FaceStats;
  persona: { emoji: string; title: string; blurb: string };
  allPhotos: string[];
};

/** Persona headline derived from the top memory. */
const PERSONA: Record<string, { emoji: string; title: string; blurb: string }> = {
  babies: { emoji: "👶", title: "Family Historian", blurb: "Your roll is full of tiny humans and big moments." },
  trips: { emoji: "✈️", title: "Frequent Flyer", blurb: "Your camera roll is basically a travel diary." },
  glam: { emoji: "👗", title: "Dressed to Impress", blurb: "Every occasion gets the outfit it deserves." },
  party: { emoji: "🥂", title: "Life of the Party", blurb: "The night out lives on in your camera roll." },
  squad: { emoji: "👯", title: "People Person", blurb: "You collect faces, not things — the crew is always in frame." },
  smiles: { emoji: "😄", title: "Joy Collector", blurb: "Your gallery is basically a smile archive." },
  selfies: { emoji: "🤳", title: "Main Character", blurb: "Front camera, front and centre. As it should be." },
  foodie: { emoji: "🍕", title: "Certified Foodie", blurb: "Your camera eats first. Every dish gets a portrait." },
  pets: { emoji: "🐾", title: "Pet Paparazzi", blurb: "Cutest subjects on the planet — and you know it." },
  golden: { emoji: "🌅", title: "Golden Hour Chaser", blurb: "You stop the car for a good sky." },
  night: { emoji: "🌙", title: "Night Owl", blurb: "Neon, moonlight and long exposures — you shoot after dark." },
  beach: { emoji: "🏝️", title: "Beach Bum", blurb: "Salt water, blue skies, and a camera roll to prove it." },
  outdoors: { emoji: "🏔️", title: "Trailblazer", blurb: "The great outdoors is your favourite studio." },
  city: { emoji: "🏙️", title: "Urban Explorer", blurb: "Skylines, streets and architecture — the city is your muse." },
  road: { emoji: "🚗", title: "Always Going Somewhere", blurb: "If it moves, it's in your gallery." },
  sweet: { emoji: "🍰", title: "Sweet Tooth", blurb: "Dessert always makes the cut." },
  duo: { emoji: "💑", title: "Better Together", blurb: "Your gallery is full of two-person moments." },
  flowers: { emoji: "🌸", title: "Flower Whisperer", blurb: "You never walk past a good bloom." },
  sports: { emoji: "🏀", title: "Always in Motion", blurb: "Game day, gym, or trail — you capture the action." },
  pretty: { emoji: "☁️", title: "Sky Gazer", blurb: "You look up, a lot. And you photograph it." },
  art: { emoji: "🎨", title: "Aesthete", blurb: "Patterns, style and design catch your eye everywhere." },
  screens: { emoji: "📱", title: "Screenshot Archivist", blurb: "Half your gallery is receipts, menus and memes. No regrets." },
  mixed: { emoji: "👁️", title: "Eclectic Eye", blurb: "A little bit of everything — your gallery refuses to be boxed in." },
};

/** Aggregate the merged scan into memories + face stats + persona. */
export function buildInsights(photos: ScannedPhoto[], elapsedMs = 0): Insights {
  const scanned = photos.length;
  const counts = new Map<string, number>();
  const covers: Record<string, string[]> = {};

  // Face stats
  let photosWithFaces = 0, totalFaces = 0, smiles = 0, biggestGroup = 0, soloShots = 0;

  for (const p of photos) {
    const c: Ctx = { hour: p.time > 0 ? new Date(p.time).getHours() : -1 };
    for (const m of MEMORIES) {
      if (m.match(p, c)) {
        counts.set(m.key, (counts.get(m.key) ?? 0) + 1);
        const list = (covers[m.key] ??= []);
        if (list.length < MAX_PHOTOS_PER_MEMORY) list.push(p.uri);
      }
    }
    if (p.faces > 0) photosWithFaces++;
    if (p.faces === 1) soloShots++;
    totalFaces += p.faces;
    // Per-face smilingProbability needs a native rebuild to populate, so count
    // "smiley photos" from the labeler's smile label (matches the memory rule).
    if (p.smiles >= 1 || has(p, "smile", "laugh", "grin")) smiles++;
    if (p.faces > biggestGroup) biggestGroup = p.faces;
  }

  const memories: Memory[] = MEMORIES.map((m) => {
    const count = counts.get(m.key) ?? 0;
    return {
      key: m.key, emoji: m.emoji, title: m.title, accent: m.accent,
      count, blurb: m.blurb(count), photos: covers[m.key] ?? [],
    };
  })
    .filter((m) => m.count >= MIN_PHOTOS)
    .sort((a, b) => b.count - a.count);

  const persona = PERSONA[memories[0]?.key ?? "mixed"] ?? PERSONA.mixed;
  const allPhotos = photos.map((p) => p.uri);

  return {
    scanned,
    elapsedMs,
    memories,
    faces: { photosWithFaces, totalFaces, smiles, biggestGroup, soloShots },
    persona,
    allPhotos,
  };
}

// ─── Stories (Google-Photos-style highlight reel) ──────────────────────────

export type Slide = {
  key: string;
  emoji: string;
  title: string;
  subtitle: string;
  accent: string;
  photos: string[]; // photos[0] = hero; the rest form a montage
};

/** Evenly sample up to `n` items (keeps variety across the roll). */
function sample<T>(arr: T[], n: number): T[] {
  if (arr.length <= n) return arr;
  const step = arr.length / n;
  const out: T[] = [];
  for (let i = 0; i < n; i++) out.push(arr[Math.floor(i * step)]);
  return out;
}

/** Build the swipeable Story slides from insights. */
export function buildStories(insights: Insights): Slide[] {
  const { scanned, elapsedMs } = insights;
  const perSec = elapsedMs > 0 ? Math.round(scanned / (elapsedMs / 1000)) : 0;
  const slides: Slide[] = [];

  slides.push({
    key: "intro", emoji: "✨", title: "Your gallery, wrapped",
    subtitle: `${scanned} photos · analysed on-device`,
    accent: C.orange, photos: sample(insights.allPhotos, 9),
  });

  slides.push({
    key: "speed", emoji: "⚡", title: `${scanned} photos in ${(elapsedMs / 1000).toFixed(1)}s`,
    subtitle: `~${perSec}/sec · 0 bytes left your phone`,
    accent: C.blue, photos: sample(insights.allPhotos, 6),
  });

  // One slide per top memory
  insights.memories.slice(0, 8).forEach((m) => {
    if (m.photos.length === 0) return;
    const pct = Math.round((m.count / scanned) * 100);
    slides.push({
      key: `mem-${m.key}`, emoji: m.emoji, title: m.title,
      subtitle: `${m.count} photos · ${pct}% of your roll`,
      accent: m.accent, photos: sample(m.photos, 9),
    });
  });

  if (insights.faces.totalFaces > 0) {
    slides.push({
      key: "people", emoji: "👥", title: `${insights.faces.totalFaces} faces`,
      subtitle: `${insights.faces.smiles} smiling · biggest group: ${insights.faces.biggestGroup}`,
      accent: C.mint, photos: sample(insights.allPhotos, 9),
    });
  }

  slides.push({
    key: "persona", emoji: insights.persona.emoji, title: insights.persona.title,
    subtitle: insights.persona.blurb, accent: C.orange, photos: sample(insights.allPhotos, 6),
  });

  slides.push({
    key: "outro", emoji: "🔒", title: "That's a wrap",
    subtitle: "Every photo analysed on-device with Nitro ML Kit — nothing uploaded.",
    accent: C.mint, photos: sample(insights.allPhotos, 9),
  });

  return slides;
}

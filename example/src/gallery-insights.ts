// Turns raw ML Kit batch output (labels + faces, each carrying its photo uri)
// into a fun "Gallery Wrapped" + a Google-Photos-style set of Story slides.
// Pure aggregation — no native calls — so it's trivial to reason about.

/** One labelled photo coming out of the batch scan. */
export type LabeledPhoto = { uri: string; labels: { text: string }[] };
/** One face-detected photo coming out of the batch scan. */
export type FacedPhoto = { uri: string; faces: { smilingProbability: number }[] };

/** One "theme" bucket a photo can fall into (a photo may hit several). */
type BucketDef = { key: string; emoji: string; label: string; match: string[] };

// Ordered by how "headline-worthy" a theme is when it ties on count.
const BUCKETS: BucketDef[] = [
  { key: "food", emoji: "🍕", label: "Food & Drink", match: ["food", "dish", "cuisine", "dessert", "drink", "coffee", "breakfast", "brunch", "meal", "baking", "fruit", "junk", "fast food", "recipe", "tableware", "plate", "cake", "pizza", "wine", "cocktail", "beer", "sushi", "bread", "snack", "burger"] },
  { key: "people", emoji: "🎉", label: "People & Parties", match: ["person", "people", "selfie", "crowd", "party", "event", "wedding", "fun", "team", "ceremony", "portrait", "child", "bride", "smile", "facial", "friendship", "toddler", "dance"] },
  { key: "animals", emoji: "🐾", label: "Animals", match: ["dog", "cat", "pet", "wildlife", "bird", "animal", "horse", "zoo", "fish", "puppy", "kitten", "paw", "mammal", "reptile"] },
  { key: "nature", emoji: "🌿", label: "Nature", match: ["plant", "tree", "grass", "flower", "sky", "cloud", "mountain", "landscape", "garden", "forest", "leaf", "sunlight", "nature", "meadow", "hill", "petal", "botany", "flora"] },
  { key: "beach", emoji: "🏖️", label: "Beach & Water", match: ["beach", "sea", "water", "ocean", "wave", "coast", "sand", "swimming", "pool", "lake", "river", "shore", "surf", "boat"] },
  { key: "city", emoji: "🏙️", label: "City & Places", match: ["building", "city", "street", "architecture", "urban", "house", "landmark", "monument", "skyline", "town", "bridge", "tower", "downtown", "facade", "window", "road"] },
  { key: "vehicles", emoji: "🚗", label: "Vehicles", match: ["car", "vehicle", "wheel", "motorcycle", "bicycle", "truck", "transport", "automotive", "tire", "traffic"] },
  { key: "screens", emoji: "📱", label: "Screens & Text", match: ["font", "text", "screenshot", "document", "paper", "newspaper", "menu", "poster", "brand", "logo", "number", "receipt", "screen", "web page", "diagram"] },
  { key: "night", emoji: "🌙", label: "Night & Lights", match: ["night", "moon", "star", "darkness", "fireworks", "light", "neon", "sunset", "dusk", "dawn"] },
  { key: "sports", emoji: "🏀", label: "Sports & Fitness", match: ["sport", "ball", "muscle", "gym", "fitness", "running", "football", "basketball", "soccer", "athlete", "yoga", "cycling", "skiing"] },
  { key: "art", emoji: "🎨", label: "Art & Style", match: ["art", "fashion", "drawing", "painting", "pattern", "design", "craft", "hairstyle", "eyewear", "jewellery", "beauty", "textile"] },
];

const LABEL_EMOJI: Record<string, string> = {
  sky: "☁️", cloud: "☁️", tree: "🌳", plant: "🌱", flower: "🌸", grass: "🌿",
  water: "💧", sea: "🌊", beach: "🏖️", mountain: "⛰️", sunset: "🌅", night: "🌙",
  food: "🍽️", coffee: "☕", drink: "🥤", dessert: "🍰", fruit: "🍓",
  dog: "🐕", cat: "🐈", bird: "🐦", pet: "🐾",
  car: "🚗", building: "🏢", city: "🏙️", room: "🛋️", furniture: "🪑",
  person: "🧑", people: "👥", selfie: "🤳", smile: "😄", fun: "🎉",
  font: "🔤", text: "🔤", art: "🎨", fashion: "👗", light: "💡",
};

const MAX_PHOTOS_PER_BUCKET = 40;

export type Bucket = { key: string; emoji: string; label: string; count: number };
export type FaceStats = {
  photosWithFaces: number;
  totalFaces: number;
  smiles: number;
  biggestGroup: number;
  soloShots: number;
};
export type Insights = {
  scanned: number;
  buckets: Bucket[];
  topLabels: { text: string; emoji: string; count: number }[];
  faces: FaceStats;
  persona: { emoji: string; title: string; blurb: string };
  bucketPhotos: Record<string, string[]>;
  smilePhotos: string[];
  peoplePhotos: string[];
  biggestGroupPhoto?: string;
  allPhotos: string[];
};

const PERSONA: Record<string, { emoji: string; title: string; blurb: string }> = {
  food: { emoji: "🍕", title: "Certified Foodie", blurb: "Your camera eats first. Every dish gets a portrait." },
  people: { emoji: "🥂", title: "People Person", blurb: "You collect faces, not things. The party lives in your gallery." },
  animals: { emoji: "🐾", title: "Pet Paparazzi", blurb: "Cutest subjects on the planet — and you know it." },
  nature: { emoji: "🌿", title: "Nature Lover", blurb: "You touch grass, then photograph it. Golden hour is your happy place." },
  beach: { emoji: "🏝️", title: "Beach Bum", blurb: "Salt water, blue skies, and a camera roll to prove it." },
  city: { emoji: "🏙️", title: "Urban Explorer", blurb: "Skylines, streets and architecture — the city is your muse." },
  vehicles: { emoji: "🚗", title: "Gearhead", blurb: "If it has wheels, it has a spot in your gallery." },
  screens: { emoji: "📱", title: "Screenshot Archivist", blurb: "Half your gallery is receipts, menus and memes. No regrets." },
  night: { emoji: "🌙", title: "Night Owl", blurb: "Neon, moonlight and long exposures. You shoot after dark." },
  sports: { emoji: "🏀", title: "Always in Motion", blurb: "Game day, gym, or trail — you capture the action." },
  art: { emoji: "🎨", title: "Aesthete", blurb: "Patterns, style and design catch your eye everywhere." },
  mixed: { emoji: "👁️", title: "Eclectic Eye", blurb: "A little bit of everything — your gallery refuses to be boxed in." },
};

function bucketsFor(labels: string[]): Set<string> {
  const hit = new Set<string>();
  for (const raw of labels) {
    const l = raw.toLowerCase();
    for (const b of BUCKETS) {
      if (b.match.some((m) => l.includes(m))) hit.add(b.key);
    }
  }
  return hit;
}

/** Aggregate one native scan pass (each photo carries its uri) into insights. */
export function buildInsights(
  labeled: LabeledPhoto[],
  faced: FacedPhoto[],
  scanned: number,
): Insights {
  const bucketCount = new Map<string, number>();
  const labelCount = new Map<string, number>();
  const bucketPhotos: Record<string, string[]> = {};

  for (const p of labeled) {
    if (!p.labels?.length) continue;
    const texts = p.labels.map((x) => x.text);
    for (const key of bucketsFor(texts)) {
      bucketCount.set(key, (bucketCount.get(key) ?? 0) + 1);
      const list = (bucketPhotos[key] ??= []);
      if (list.length < MAX_PHOTOS_PER_BUCKET) list.push(p.uri);
    }
    for (const t of texts) {
      const k = t.toLowerCase();
      labelCount.set(k, (labelCount.get(k) ?? 0) + 1);
    }
  }

  const buckets: Bucket[] = BUCKETS.map((b) => ({
    key: b.key,
    emoji: b.emoji,
    label: b.label,
    count: bucketCount.get(b.key) ?? 0,
  }))
    .filter((b) => b.count > 0)
    .sort((a, b) => b.count - a.count);

  const topLabels = [...labelCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([text, count]) => ({ text, emoji: LABEL_EMOJI[text] ?? "•", count }));

  // Faces
  let photosWithFaces = 0;
  let totalFaces = 0;
  let smiles = 0;
  let biggestGroup = 0;
  let soloShots = 0;
  let biggestGroupPhoto: string | undefined;
  const smilePhotos: string[] = [];
  const peoplePhotos: string[] = [];
  for (const p of faced) {
    const n = p.faces?.length ?? 0;
    if (n > 0) {
      photosWithFaces++;
      if (peoplePhotos.length < MAX_PHOTOS_PER_BUCKET) peoplePhotos.push(p.uri);
    }
    if (n === 1) soloShots++;
    totalFaces += n;
    if (n > biggestGroup) {
      biggestGroup = n;
      biggestGroupPhoto = p.uri;
    }
    let smiled = false;
    for (const f of p.faces ?? []) {
      if (f.smilingProbability > 0.6) {
        smiles++;
        smiled = true;
      }
    }
    if (smiled && smilePhotos.length < MAX_PHOTOS_PER_BUCKET) smilePhotos.push(p.uri);
  }

  const persona = PERSONA[buckets[0]?.key ?? "mixed"] ?? PERSONA.mixed;
  const allPhotos = labeled.map((p) => p.uri);

  return {
    scanned,
    buckets,
    topLabels,
    faces: { photosWithFaces, totalFaces, smiles, biggestGroup, soloShots },
    persona,
    bucketPhotos,
    smilePhotos,
    peoplePhotos,
    biggestGroupPhoto,
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

const ACCENTS = ["#a78bfa", "#f472b6", "#34d399", "#60a5fa", "#fbbf24", "#fb7185", "#22d3ee"];

/** Evenly sample up to `n` items from an array (keeps variety across the roll). */
function sample<T>(arr: T[], n: number): T[] {
  if (arr.length <= n) return arr;
  const step = arr.length / n;
  const out: T[] = [];
  for (let i = 0; i < n; i++) out.push(arr[Math.floor(i * step)]);
  return out;
}

/** Build the swipeable Story slides from insights + timing. */
export function buildStories(insights: Insights, elapsedMs: number): Slide[] {
  const slides: Slide[] = [];
  const perSec = elapsedMs > 0 ? Math.round(insights.scanned / (elapsedMs / 1000)) : 0;

  // Intro
  slides.push({
    key: "intro",
    emoji: "✨",
    title: "Your gallery, wrapped",
    subtitle: `${insights.scanned} photos · analysed on-device`,
    accent: "#a78bfa",
    photos: sample(insights.allPhotos, 9),
  });

  // Speed flex
  slides.push({
    key: "speed",
    emoji: "⚡",
    title: `${insights.scanned} photos in ${(elapsedMs / 1000).toFixed(1)}s`,
    subtitle: `~${perSec} photos/sec · 0 bytes left your phone`,
    accent: "#22d3ee",
    photos: sample(insights.allPhotos, 6),
  });

  // Top themes (one slide each)
  insights.buckets.slice(0, 5).forEach((b, i) => {
    const photos = insights.bucketPhotos[b.key] ?? [];
    if (photos.length === 0) return;
    const pct = Math.round((b.count / insights.scanned) * 100);
    slides.push({
      key: `theme-${b.key}`,
      emoji: b.emoji,
      title: b.label,
      subtitle: `${b.count} photos · ${pct}% of your roll`,
      accent: ACCENTS[i % ACCENTS.length],
      photos: sample(photos, 9),
    });
  });

  // Smiles
  if (insights.faces.smiles > 0) {
    slides.push({
      key: "smiles",
      emoji: "😄",
      title: `${insights.faces.smiles} smiles`,
      subtitle: "caught across your photos",
      accent: "#fbbf24",
      photos: sample(insights.smilePhotos, 9),
    });
  }

  // People
  if (insights.faces.totalFaces > 0) {
    slides.push({
      key: "people",
      emoji: "👥",
      title: `${insights.faces.totalFaces} faces`,
      subtitle: `across ${insights.faces.photosWithFaces} photos · biggest group: ${insights.faces.biggestGroup}`,
      accent: "#f472b6",
      photos: sample(insights.peoplePhotos, 9),
    });
  }

  // Persona
  slides.push({
    key: "persona",
    emoji: insights.persona.emoji,
    title: insights.persona.title,
    subtitle: insights.persona.blurb,
    accent: "#a78bfa",
    photos: sample(insights.allPhotos, 6),
  });

  // Outro
  slides.push({
    key: "outro",
    emoji: "🔒",
    title: "That's a wrap",
    subtitle: "Every photo analysed on-device with Nitro ML Kit — nothing uploaded.",
    accent: "#34d399",
    photos: sample(insights.allPhotos, 9),
  });

  return slides;
}

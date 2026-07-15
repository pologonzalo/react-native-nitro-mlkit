// Turns raw ML Kit batch output (labels + faces) into a fun "Gallery Wrapped".
// Everything here is pure aggregation — no native calls, so it's trivial to
// reason about and test.

import type { BatchLabelResult } from "@nitro-mlkit/image-labeling";

/** One "theme" bucket a photo can fall into (a photo may hit several). */
type BucketDef = { key: string; emoji: string; label: string; match: string[] };

// Ordered by how "headline-worthy" a theme is when it ties on count.
const BUCKETS: BucketDef[] = [
  { key: "food", emoji: "🍕", label: "Food & Drink", match: ["food", "dish", "cuisine", "dessert", "drink", "coffee", "breakfast", "brunch", "meal", "baking", "fruit", "junk", "fast food", "recipe", "tableware", "plate", "cake", "pizza", "wine", "cocktail", "beer", "sushi", "bread", "snack"] },
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

// Emoji for a raw label when it isn't inside a bucket (nice touch on the list).
const LABEL_EMOJI: Record<string, string> = {
  sky: "☁️", cloud: "☁️", tree: "🌳", plant: "🌱", flower: "🌸", grass: "🌿",
  water: "💧", sea: "🌊", beach: "🏖️", mountain: "⛰️", sunset: "🌅", night: "🌙",
  food: "🍽️", coffee: "☕", drink: "🥤", dessert: "🍰", fruit: "🍓",
  dog: "🐕", cat: "🐈", bird: "🐦", pet: "🐾", flower_2: "🌺",
  car: "🚗", building: "🏢", city: "🏙️", room: "🛋️", furniture: "🪑",
  person: "🧑", people: "👥", selfie: "🤳", smile: "😄", fun: "🎉",
  font: "🔤", text: "🔤", art: "🎨", fashion: "👗", light: "💡",
};

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

/**
 * Aggregate one native scan pass into insights.
 * @param labelResults  BatchLabelResult[] from NitroLabeler.labelBatch
 * @param faceResults   { faces: {smilingProbability:number}[] }[] from face detect
 * @param scanned       how many photos were actually scanned
 */
export function buildInsights(
  labelResults: BatchLabelResult[],
  faceResults: { faces: { smilingProbability: number }[] }[],
  scanned: number,
): Insights {
  const bucketCount = new Map<string, number>();
  const labelCount = new Map<string, number>();

  for (const r of labelResults) {
    if (!r?.success || !r.labels?.length) continue;
    const texts = r.labels.map((x) => x.text);
    for (const key of bucketsFor(texts)) {
      bucketCount.set(key, (bucketCount.get(key) ?? 0) + 1);
    }
    // Raw label popularity (photo-level de-dup already: one label per image).
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
    .map(([text, count]) => ({
      text,
      emoji: LABEL_EMOJI[text] ?? "•",
      count,
    }));

  // Faces
  let photosWithFaces = 0;
  let totalFaces = 0;
  let smiles = 0;
  let biggestGroup = 0;
  let soloShots = 0;
  for (const r of faceResults) {
    const n = r?.faces?.length ?? 0;
    if (n > 0) photosWithFaces++;
    if (n === 1) soloShots++;
    totalFaces += n;
    if (n > biggestGroup) biggestGroup = n;
    for (const f of r?.faces ?? []) {
      if (f.smilingProbability > 0.6) smiles++;
    }
  }

  const persona = PERSONA[buckets[0]?.key ?? "mixed"] ?? PERSONA.mixed;

  return {
    scanned,
    buckets,
    topLabels,
    faces: { photosWithFaces, totalFaces, smiles, biggestGroup, soloShots },
    persona,
  };
}

import { C } from "./theme";

export type Shelf = "Crowd-pleasers" | "Body & Motion" | "Words" | "Capture";

export type Feature = {
  route: string; // expo-router route name (file in app/)
  title: string;
  emoji: string; // mascot
  tag: string;
  accent: string;
  android?: boolean; // Android-only (Google ships no iOS SDK / deferred)
  shelf: Shelf;
};

/** The 16 ML Kit feature pages, grouped into toy-box shelves. */
export const FEATURES: Feature[] = [
  // Crowd-pleasers
  { route: "faces", title: "Face Detection", emoji: "🙂", tag: "smile · eyes · crop", accent: C.blue, shelf: "Crowd-pleasers" },
  { route: "barcode", title: "Barcode / QR", emoji: "🔳", tag: "1D + 2D scan", accent: C.orange, shelf: "Crowd-pleasers" },
  { route: "ocr", title: "Text (OCR)", emoji: "🔤", tag: "blocks & lines", accent: C.purple, shelf: "Crowd-pleasers" },
  { route: "labeling", title: "Image Labeling", emoji: "🏷️", tag: "400+ labels", accent: C.green, shelf: "Crowd-pleasers" },

  // Body & Motion
  { route: "pose", title: "Pose Detection", emoji: "🤸", tag: "33 landmarks", accent: C.red, shelf: "Body & Motion" },
  { route: "facemesh", title: "Face Mesh", emoji: "🕸️", tag: "468 3D points", accent: C.purple, android: true, shelf: "Body & Motion" },
  { route: "selfieseg", title: "Selfie Seg", emoji: "✂️", tag: "foreground mask", accent: C.green, shelf: "Body & Motion" },
  { route: "subjectseg", title: "Subject Seg", emoji: "🪄", tag: "cut out subject", accent: C.blue, android: true, shelf: "Body & Motion" },
  { route: "recognition", title: "Face Recognition", emoji: "🧑‍🤝‍🧑", tag: "register → find people", accent: C.blueDeep, android: true, shelf: "Body & Motion" },

  // Words
  { route: "langid", title: "Language ID", emoji: "🌐", tag: "text → BCP-47", accent: C.blue, shelf: "Words" },
  { route: "translate", title: "Translation", emoji: "🌍", tag: "50+ languages", accent: C.blueDeep, shelf: "Words" },
  { route: "digitalink", title: "Digital Ink", emoji: "✍️", tag: "handwriting → text", accent: C.purple, shelf: "Words" },
  { route: "smartreply", title: "Smart Reply", emoji: "💬", tag: "chat replies", accent: C.orange, android: true, shelf: "Words" },
  { route: "entity", title: "Entity Extraction", emoji: "🔍", tag: "phones · dates · $", accent: C.red, android: true, shelf: "Words" },

  // Capture
  { route: "objects", title: "Object Detection", emoji: "📦", tag: "boxes + labels", accent: C.green, shelf: "Capture" },
  { route: "docscanner", title: "Document Scanner", emoji: "📄", tag: "scan → JPEG + PDF", accent: C.orange, android: true, shelf: "Capture" },
];

export const SHELVES: Shelf[] = ["Crowd-pleasers", "Body & Motion", "Words", "Capture"];

export function featuresByShelf(shelf: Shelf): Feature[] {
  return FEATURES.filter((f) => f.shelf === shelf);
}

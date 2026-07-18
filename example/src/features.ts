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
  { route: "barcode", title: "Barcode / QR", emoji: "🔳", tag: "1D + 2D scan", accent: "#D97706", shelf: "Crowd-pleasers" },
  { route: "ocr", title: "Text (OCR)", emoji: "🔤", tag: "blocks & lines", accent: "#EC4899", shelf: "Crowd-pleasers" },
  { route: "labeling", title: "Image Labeling", emoji: "🏷️", tag: "400+ labels", accent: "#06B6D4", shelf: "Crowd-pleasers" },

  // Body & Motion
  { route: "pose", title: "Pose Detection", emoji: "🤸", tag: "33 landmarks", accent: "#8B5CF6", shelf: "Body & Motion" },
  { route: "facemesh", title: "Face Mesh", emoji: "🕸️", tag: "468 3D points", accent: "#F43F5E", android: true, shelf: "Body & Motion" },
  { route: "selfieseg", title: "Selfie Seg", emoji: "✂️", tag: "foreground mask", accent: C.mint, shelf: "Body & Motion" },
  { route: "subjectseg", title: "Subject Seg", emoji: "🪄", tag: "cut out subject", accent: "#10B981", android: true, shelf: "Body & Motion" },
  { route: "recognition", title: "Face Recognition", emoji: "🧑‍🤝‍🧑", tag: "register → find people", accent: "#EF4444", android: true, shelf: "Body & Motion" },

  // Words
  { route: "langid", title: "Language ID", emoji: "🌐", tag: "text → BCP-47", accent: "#0EA5E9", shelf: "Words" },
  { route: "translate", title: "Translation", emoji: "🌍", tag: "50+ languages", accent: "#6366F1", shelf: "Words" },
  { route: "digitalink", title: "Digital Ink", emoji: "✍️", tag: "handwriting → text", accent: "#D946EF", shelf: "Words" },
  { route: "smartreply", title: "Smart Reply", emoji: "💬", tag: "chat replies", accent: C.orange, android: true, shelf: "Words" },
  { route: "entity", title: "Entity Extraction", emoji: "🔍", tag: "phones · dates · $", accent: "#A855F7", android: true, shelf: "Words" },

  // Capture
  { route: "objects", title: "Object Detection", emoji: "📦", tag: "boxes + labels", accent: "#22C55E", shelf: "Capture" },
  { route: "docscanner", title: "Document Scanner", emoji: "📄", tag: "scan → JPEG + PDF", accent: "#F97316", android: true, shelf: "Capture" },
];

export const SHELVES: Shelf[] = ["Crowd-pleasers", "Body & Motion", "Words", "Capture"];

export function featuresByShelf(shelf: Shelf): Feature[] {
  return FEATURES.filter((f) => f.shelf === shelf);
}

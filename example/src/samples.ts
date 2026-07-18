import type { Sample } from "./ui";

// ---- URL builders (deterministic, downloaded on selection) ----------------

const qr = (data: string): string =>
  `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=10&data=${encodeURIComponent(data)}`;

const bar = (type: string, data: string): string =>
  `https://barcodeapi.org/api/${type}/${encodeURIComponent(data)}`;

const textImg = (t: string): string =>
  `https://dummyimage.com/1200x360/ffffff/111111.png&text=${encodeURIComponent(t)}`;

const photo = (seed: string): string =>
  `https://picsum.photos/seed/${seed}/640/480`;

const person = (gender: "men" | "women", n: number): string =>
  `https://randomuser.me/api/portraits/${gender}/${n}.jpg`;

// ---- Faces (face-detection, face-mesh, selfie-segmentation, pose) ---------

export const FACES: Sample[] = [
  { label: "Woman 1", url: person("women", 44), name: "face-w44.jpg" },
  { label: "Man 1", url: person("men", 32), name: "face-m32.jpg" },
  { label: "Woman 2", url: person("women", 68), name: "face-w68.jpg" },
  { label: "Man 2", url: person("men", 75), name: "face-m75.jpg" },
  { label: "Woman 3", url: person("women", 21), name: "face-w21.jpg" },
  { label: "Man 3", url: person("men", 11), name: "face-m11.jpg" },
  { label: "Woman 4", url: person("women", 26), name: "face-w26.jpg" },
  { label: "Man 4", url: person("men", 67), name: "face-m67.jpg" },
  { label: "Woman 5", url: person("women", 90), name: "face-w90.jpg" },
  { label: "Man 5", url: person("men", 83), name: "face-m83.jpg" },
];

// ---- Scenes (image-labeling, object-detection) ----------------------------

export const SCENES: Sample[] = [
  { label: "Scene 1", url: photo("nitro-a"), name: "scene-a.jpg" },
  { label: "Scene 2", url: photo("nitro-b"), name: "scene-b.jpg" },
  { label: "Scene 3", url: photo("nitro-c"), name: "scene-c.jpg" },
  { label: "Scene 4", url: photo("nitro-d"), name: "scene-d.jpg" },
  { label: "Scene 5", url: photo("nitro-e"), name: "scene-e.jpg" },
  { label: "Scene 6", url: photo("nitro-f"), name: "scene-f.jpg" },
  { label: "Scene 7", url: photo("nitro-g"), name: "scene-g.jpg" },
  { label: "Scene 8", url: photo("nitro-h"), name: "scene-h.jpg" },
  { label: "Scene 9", url: photo("nitro-i"), name: "scene-i.jpg" },
  { label: "Scene 10", url: photo("nitro-j"), name: "scene-j.jpg" },
];

// ---- Barcodes & QR (barcode-scanning) -------------------------------------

export const CODES: Sample[] = [
  { label: "QR url", url: qr("https://github.com/nitro-mlkit"), name: "qr1.png" },
  { label: "QR text", url: qr("Nitro ML Kit — on-device, zero bridge"), name: "qr2.png" },
  { label: "QR wifi", url: qr("WIFI:S:NitroNet;T:WPA;P:nitro1234;;"), name: "qr3.png" },
  { label: "QR tel", url: qr("tel:+34600000000"), name: "qr4.png" },
  { label: "QR geo", url: qr("geo:40.4168,-3.7038"), name: "qr5.png" },
  { label: "EAN-13", url: bar("ean13", "5901234123457"), name: "ean1.png" },
  { label: "EAN-13", url: bar("ean13", "4006381333931"), name: "ean2.png" },
  { label: "UPC-A", url: bar("upca", "036000291452"), name: "upca.png" },
  { label: "Code128", url: bar("128", "NITRO-128"), name: "c128.png" },
  { label: "Code39", url: bar("39", "MLKIT39"), name: "c39.png" },
];

// ---- Text images (text-recognition / OCR) ---------------------------------

export const TEXTS: Sample[] = [
  { label: "Hello", url: textImg("Hello Nitro MLKit"), name: "ocr1.png" },
  { label: "On-device", url: textImg("On-device OCR"), name: "ocr2.png" },
  { label: "React Native", url: textImg("React Native + Nitro"), name: "ocr3.png" },
  { label: "ML Kit", url: textImg("Google ML Kit"), name: "ocr4.png" },
  { label: "Scan me", url: textImg("Scan this text"), name: "ocr5.png" },
  { label: "Digits", url: textImg("1234 5678 90"), name: "ocr6.png" },
  { label: "Symbols", url: textImg("Price: 19,99 EUR"), name: "ocr7.png" },
  { label: "Zero bridge", url: textImg("Zero bridge overhead"), name: "ocr8.png" },
  { label: "Fast", url: textImg("Fast and local"), name: "ocr9.png" },
  { label: "Multi line", url: textImg("Line one\nLine two"), name: "ocr10.png" },
];

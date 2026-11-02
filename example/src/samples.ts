import type { Sample } from "./ui";

// ---- Curated stock photos, one set per feature ----------------------------
//
// Every sample carries an `expect` line saying what it exercises, so the strip
// advertises its hard cases instead of hiding them: a 128px headshot proves
// nothing about pose detection, and a random picsum seed proves nothing about
// object detection. Each set therefore mixes a happy path, the awkward angles,
// and one case that legitimately returns nothing.
//
// Unsplash photo ids are pinned: images.unsplash.com needs no API key and the
// URLs are stable. Note downloadSample() re-fetches on every tap rather than
// caching, so the stock strip needs a connection each time (BENCH does cache).
// Photo credits live in SAMPLES.md.

const u = (photo: string, w: number): string =>
  `https://images.unsplash.com/${photo}?w=${w}&q=80&fm=jpg&fit=max`;

// ---- Generated codes (deterministic, always decodable) --------------------

const qr = (data: string): string =>
  `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=10&data=${encodeURIComponent(data)}`;

const bar = (type: string, data: string): string =>
  `https://barcodeapi.org/api/${type}/${encodeURIComponent(data)}`;

// ---- Benchmark corpus ----------------------------------------------------
//
// 40 photos at ~4 MP: 16 with one face, 10 with a handful, 6 crowds, and 8
// with no face at all. The mix comes from the search each URL was drawn from,
// not from a per-photo count, so treat the split as approximate.
//
// This replaces 40 randomuser.me avatars of 128x128 (3.5 KB each). Detecting
// faces in a 0.016 MP thumbnail measures bridge overhead, not detection, so
// the old numbers flattered every library equally. First run downloads about
// 11 MB and caches it.

export const BENCH: string[] = [
  u("photo-1534528741775-53994a69daeb", 2000),
  u("photo-1568038479111-87bf80659645", 2000),
  u("photo-1587397845856-e6cf49176c70", 2000),
  u("photo-1541715301255-12a4839b424a", 2000),
  u("photo-1618835962148-cf177563c6c0", 2000),
  u("photo-1601412436009-d964bd02edbc", 2000),
  u("photo-1509460913899-515f1df34fea", 2000),
  u("photo-1674932668403-33398b81c92f", 2000),
  u("photo-1520529277867-dbf8c5e0b340", 2000),
  u("photo-1557296387-5358ad7997bb", 2000),
  u("photo-1563170446-9c3c0622d8a9", 2000),
  u("photo-1574526783053-c3afac70d448", 2000),
  u("photo-1517462964-21fdcec3f25b", 2000),
  u("photo-1617746652908-91e66c07499a", 2000),
  u("photo-1542534759-05f6c34a9e63", 2000),
  u("photo-1504275490777-45f30792f13f", 2000),
  u("photo-1511988617509-a57c8a288659", 2000),
  u("photo-1491438590914-bc09fcaaf77a", 2000),
  u("photo-1569617084133-26942bb441f2", 2000),
  u("photo-1536010305525-f7aa0834e2c7", 2000),
  u("photo-1498661694102-0a3793edbe74", 2000),
  u("photo-1504022462188-88f023db97bf", 2000),
  u("photo-1702564635728-7aeacaa370c8", 2000),
  u("photo-1739301674016-45dddb02e2dd", 2000),
  u("photo-1764006195843-e6f9a5781500", 2000),
  u("photo-1758613171187-9a41d0fc93ab", 2000),
  u("photo-1459749411175-04bf5292ceea", 2000),
  u("photo-1470229722913-7c0e2dbbafd3", 2000),
  u("photo-1501386761578-eac5c94b800a", 2000),
  u("photo-1429962714451-bb934ecdc4ec", 2000),
  u("photo-1533174072545-7a4b6ad7a6c3", 2000),
  u("photo-1540039155733-5bb30b53aa14", 2000),
  u("photo-1630699144919-681cf308ae82", 2000),
  u("photo-1630699375895-fe5996d163ee", 2000),
  u("photo-1724582586529-62622e50c0b3", 2000),
  u("photo-1687075196974-ea71a55cc9f8", 2000),
  u("photo-1668910242969-bd2933e7a5cf", 2000),
  u("photo-1687075197041-91fba1013e1d", 2000),
  u("photo-1630699144867-37acec97df5a", 2000),
  u("photo-1687075197066-eb8bb5e91b16", 2000),
];

// ---- Pose detection — needs a whole body in frame, one person at a time
export const POSES: Sample[] = [
  { label: "Standing", expect: "🧍 Standing · knees ~180°", url: u("photo-1590750093844-bc3ae9e48f9c", 1200), name: "pose-standing.jpg" },
  { label: "Sitting", expect: "🪑 Sitting · knees ~90°", url: u("photo-1768696082055-1f2360d7ee15", 1200), name: "pose-sitting.jpg" },
  { label: "Squat", expect: "🏃 Crouched · knees 130–150°", url: u("photo-1649887974297-4be052375a67", 1200), name: "pose-squat.jpg" },
  { label: "Lying down", expect: "🛏️ Lying down · torso >55° off vertical", url: u("photo-1649844231692-1ee77d6ceeee", 1200), name: "pose-lying.jpg" },
  { label: "Jumping", expect: "both arms raised 💪", url: u("photo-1592851323839-de05217067ae", 1200), name: "pose-jump.jpg" },
  { label: "Yoga", expect: "one leg airborne · extreme joint angles", url: u("photo-1599447292180-45fd84092ef0", 1200), name: "pose-yoga.jpg" },
  { label: "Running", expect: "asymmetric legs · side view", url: u("photo-1685122089837-9eda7396bf86", 1200), name: "pose-run.jpg" },
  { label: "Sitting group", expect: "one person only — ML Kit Pose isn't multi-person", url: u("photo-1758274533219-cc0ef0af4f60", 1400), name: "pose-group.jpg" },
  { label: "Headshot", expect: "🤷 Can't tell · torso out of frame", url: u("photo-1534528741775-53994a69daeb", 1000), name: "pose-headshot.jpg" },
];

// ---- Face detection / recognition — counts, angles, classification, occlusion
export const FACES: Sample[] = [
  { label: "One face", expect: "1 frontal face · the easy case", url: u("photo-1520529277867-dbf8c5e0b340", 1200), name: "face-one.jpg" },
  { label: "Group", expect: "5 faces at different scales", url: u("photo-1569617084133-26942bb441f2", 1600), name: "face-group5.jpg" },
  { label: "Big group", expect: "many faces, several in profile", url: u("photo-1498661694102-0a3793edbe74", 1600), name: "face-groupbig.jpg" },
  { label: "Crowd", expect: "tiny faces · exercises minFaceSize", url: u("photo-1537228783107-df09e892bdbb", 2000), name: "face-crowd.jpg" },
  { label: "Profile", expect: "high eulerAngleY (or 0 faces — the limit)", url: u("photo-1637722883499-7782c2a64f07", 1200), name: "face-profile.jpg" },
  { label: "Eyes closed", expect: "eyeOpenProbability ≈ 0", url: u("photo-1582557492456-c53214c03e18", 1200), name: "face-eyesshut.jpg" },
  { label: "Smile", expect: "smilingProbability ≈ 1", url: u("photo-1573515159471-0eb7ec72912c", 1200), name: "face-smile.jpg" },
  { label: "Sunglasses", expect: "eyes occluded · landmarks unreliable", url: u("photo-1624372462825-73d8bda469e1", 1200), name: "face-shades.jpg" },
  { label: "From behind", expect: "0 faces · the honest case", url: u("photo-1625339957674-3d65f3748332", 1200), name: "face-none.jpg" },
];

// ---- Face recognition — three distinct individuals, one face each
//
// Registering a group photo would be meaningless, so this set is separate from
// FACES. Note the demo queries with the *same* photo it registered, which is
// identity rather than recognition: for the real test, register from stock and
// then query from the camera.

export const PERSONS: Sample[] = [
  { label: "Person A", expect: "registered · queries back at ~1.0", url: u("photo-1520529277867-dbf8c5e0b340", 1000), name: "person-a.jpg" },
  { label: "Person B", expect: "registered · queries back at ~1.0", url: u("photo-1534528741775-53994a69daeb", 1000), name: "person-b.jpg" },
  { label: "Stranger", expect: "never registered · should match nobody", url: u("photo-1573515159471-0eb7ec72912c", 1000), name: "person-c.jpg" },
];

// ---- Selfie segmentation — person vs background, including no person at all
export const PEOPLE: Sample[] = [
  { label: "Busy background", expect: "sharp subject over a crowded market", url: u("photo-1780504863219-af22752a8cbf", 1400), name: "seg-busy.jpg" },
  { label: "Backlit hair", expect: "mask edge against loose strands", url: u("photo-1758845986246-9588d6dc4762", 1400), name: "seg-hair.jpg" },
  { label: "Several people", expect: "mask covers all five, not just one", url: u("photo-1569617084133-26942bb441f2", 1600), name: "seg-group.jpg" },
  { label: "Empty room", expect: "no person · empty mask", url: u("photo-1630699144919-681cf308ae82", 1400), name: "seg-empty.jpg" },
];

// ---- Subject segmentation — one salient subject to cut out
export const SUBJECTS: Sample[] = [
  { label: "Plant", expect: "single subject on a flat background", url: u("photo-1604762512526-b7ce049b5764", 1200), name: "sub-plant.jpg" },
  { label: "Bicycle", expect: "complex silhouette (spokes, frame)", url: u("photo-1777675024325-d93b5c5fc71c", 1400), name: "sub-bike.jpg" },
  { label: "Dog", expect: "moving subject on grass", url: u("photo-1770154306369-14eb73a6eb87", 1400), name: "sub-dog.jpg" },
  { label: "Cluttered desk", expect: "which one is *the* subject?", url: u("photo-1643115022315-742bb771a8ef", 1400), name: "sub-desk.jpg" },
];

// ---- Object detection — the base model's coarse categories, plus a miss
export const OBJECTS: Sample[] = [
  { label: "Desk", expect: "3 boxes: laptop · mug · camera", url: u("photo-1643115022315-742bb771a8ef", 1400), name: "obj-desk.jpg" },
  { label: "Laid table", expect: "several Home good boxes", url: u("photo-1718203817319-8e1ca8a0d233", 1400), name: "obj-table.jpg" },
  { label: "Bread", expect: "1 box · Food", url: u("photo-1669034937803-862fe581fc92", 1200), name: "obj-bread.jpg" },
  { label: "Flat lay", expect: "Fashion good", url: u("photo-1548606703-580672e56c26", 1400), name: "obj-fashion.jpg" },
  { label: "Street", expect: "cars and signs · dense scene", url: u("photo-1512607138614-afef095b4390", 1400), name: "obj-street.jpg" },
  { label: "Texture", expect: "no objects · Unknown or empty", url: u("photo-1771930075484-a8aa68322ba9", 1200), name: "obj-none.jpg" },
];

// ---- Image labeling — scenes that map onto the 400+ label set
export const SCENES: Sample[] = [
  { label: "Beach", expect: "beach · sky · palm · water", url: u("photo-1515238152791-8216bfdf89a7", 1400), name: "sc-beach.jpg" },
  { label: "Dog", expect: "dog · grass · pet", url: u("photo-1770154306369-14eb73a6eb87", 1400), name: "sc-dog.jpg" },
  { label: "Bread", expect: "bread · food · baked goods", url: u("photo-1669034937803-862fe581fc92", 1200), name: "sc-bread.jpg" },
  { label: "Street", expect: "street · car · sign · city", url: u("photo-1512607138614-afef095b4390", 1400), name: "sc-street.jpg" },
  { label: "Bicycle", expect: "bicycle · wall · wheel", url: u("photo-1777675024325-d93b5c5fc71c", 1400), name: "sc-bike.jpg" },
  { label: "Picnic", expect: "people · park · leisure", url: u("photo-1758274533219-cc0ef0af4f60", 1400), name: "sc-people.jpg" },
  { label: "Texture", expect: "generic labels, or none", url: u("photo-1771930075484-a8aa68322ba9", 1200), name: "sc-none.jpg" },
];

// ---- Text recognition — real-world text, not rendered placeholders
export const TEXTS: Sample[] = [
  { label: "Street sign", expect: "big clean text · the easy case", url: u("photo-1764351661264-ada16f8052b2", 1400), name: "ocr-sign.jpg" },
  { label: "Many signs", expect: "many blocks and lines at once", url: u("photo-1764351661278-bddc78a02b42", 1600), name: "ocr-manyblocks.jpg" },
  { label: "Book page", expect: "dense two-column paragraph", url: u("photo-1715458472038-351026267944", 1600), name: "ocr-book.jpg" },
  { label: "Price list", expect: "small print + figures", url: u("photo-1558274849-f9fa5f16dee8", 1400), name: "ocr-menu.jpg" },
  { label: "Chalkboard", expect: "handwritten chalk · hard", url: u("photo-1778053696802-33e7becb4588", 1600), name: "ocr-chalk.jpg" },
  { label: "Handwriting", expect: "real cursive · the recognizer's limit", url: u("photo-1688488496674-e0e5a5ba426b", 1600), name: "ocr-hand.jpg" },
  { label: "Licence plate", expect: "high-contrast digits", url: u("photo-1785184949309-ec25441f7757", 1200), name: "ocr-plate.jpg" },
  { label: "Perspective", expect: "skewed text on a kraft envelope", url: u("photo-1623668192062-a4053bb17064", 1400), name: "ocr-persp.jpg" },
  { label: "Korean + Latin", expect: "two scripts in one image", url: u("photo-1764853467738-93ee25b0ad1e", 1400), name: "ocr-kr.jpg" },
  { label: "Japanese", expect: "the Latin recognizer returns noise", url: u("photo-1769870738355-fefc0647a9f2", 1600), name: "ocr-jp.jpg" },
];

// ---- Barcode / QR — generated codes first, then codes in the wild ---------
//
// The generated PNGs are flat, perfect and always decode: they prove the API
// is wired up. The photographed ones are the actual test — angled, small, on
// a screen — and some may legitimately return nothing.

export const CODES: Sample[] = [
  { label: "QR url", expect: "https://github.com/nitro-mlkit", url: qr("https://github.com/nitro-mlkit"), name: "qr1.png" },
  { label: "QR text", expect: "raw text payload", url: qr("Nitro ML Kit — on-device, zero bridge"), name: "qr2.png" },
  { label: "QR wifi", expect: "parsed as WIFI credentials", url: qr("WIFI:S:NitroNet;T:WPA;P:nitro1234;;"), name: "qr3.png" },
  { label: "QR tel", expect: "parsed as a phone number", url: qr("tel:+34600000000"), name: "qr4.png" },
  { label: "QR geo", expect: "parsed as geo coordinates", url: qr("geo:40.4168,-3.7038"), name: "qr5.png" },
  { label: "EAN-13", expect: "5901234123457", url: bar("ean13", "5901234123457"), name: "ean1.png" },
  { label: "UPC-A", expect: "036000291452", url: bar("upca", "036000291452"), name: "upca.png" },
  { label: "Code128", expect: "NITRO-128", url: bar("128", "NITRO-128"), name: "c128.png" },
  { label: "Code39", expect: "MLKIT39", url: bar("39", "MLKIT39"), name: "c39.png" },
  { label: "Many QR", expect: "several codes in one frame", url: u("photo-1608226929860-81311de7541c", 1600), name: "code-manyqr.jpg" },
  { label: "QR on screen", expect: "code on a monitor · moiré", url: u("photo-1685575112968-7dd67bc447b4", 1400), name: "code-screen.jpg" },
];

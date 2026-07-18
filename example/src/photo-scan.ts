// Shared on-device gallery scan — one place that reads the camera roll and runs
// the ML Kit label + face(+classification) batch, returning rich per-photo data
// (labels + per-face eyes/smile). Both Gallery Wrapped and the Cleaner consume
// it, and the result is cached for the session so opening the second feature
// doesn't re-scan. This is the reusable "scan" util for the main app.

import { NitroFace, PerformanceMode } from "@nitro-mlkit/face-detection";
import { NitroLabeler } from "@nitro-mlkit/image-labeling";
import * as MediaLibrary from "expo-media-library";
import { Platform } from "react-native";
import type { CleanerPhoto } from "./photo-quality";

const SCAN_CAP = 1000;
const CHUNK = 40;
const CONCURRENCY = 6;

export type ScanProgress = { done: number; total: number };
export type ScanResult = { photos: CleanerPhoto[]; skipped: number; elapsedMs: number };

/** Thrown when the user declines the photo-library permission. */
export const PERMISSION_DENIED = "PERMISSION_DENIED";

let cached: ScanResult | null = null;

/** detectBatch gained an optional options arg (classification) in a native
 *  update. Ask for real per-face eyes/smile; fall back to the plain fast batch
 *  on an older native binary so a JS-only reload still scans. */
async function detectFaces(uris: string[]) {
  try {
    return await NitroFace.detectBatch(uris, CONCURRENCY, {
      performanceMode: PerformanceMode.FAST,
      landmarks: false,
      classifications: true,
      minFaceSize: 0.1,
      tracking: false,
    });
  } catch {
    return NitroFace.detectBatch(uris, CONCURRENCY);
  }
}

/**
 * Scan up to `cap` recent photos. Resolves URIs per-chunk (progress moves from
 * the first chunk) and never downloads iCloud-only originals — those are
 * skipped and counted. Cached per session; pass `force` to rescan.
 */
export async function scanGallery(
  onProgress: (p: ScanProgress) => void,
  opts: { force?: boolean } = {},
): Promise<ScanResult> {
  if (cached && !opts.force) {
    onProgress({ done: cached.photos.length, total: cached.photos.length });
    return cached;
  }

  const perm = await MediaLibrary.requestPermissionsAsync(false, ["photo"]);
  if (!perm.granted) throw new Error(PERMISSION_DENIED);

  const page = await MediaLibrary.getAssetsAsync({
    mediaType: "photo",
    first: SCAN_CAP,
    sortBy: [[MediaLibrary.SortBy.creationTime, false]],
  });
  const assets = page.assets;
  const cap = Math.min(assets.length, SCAN_CAP);
  onProgress({ done: 0, total: cap });

  const photos: CleanerPhoto[] = [];
  let skipped = 0;
  const chunkMs: number[] = [];

  for (let i = 0; i < cap; i += CHUNK) {
    const chunkStart = Date.now();
    const slice = assets.slice(i, i + CHUNK);

    let chunkUris: (string | null)[];
    if (Platform.OS === "ios") {
      const infos = await Promise.all(
        slice.map((a) =>
          MediaLibrary.getAssetInfoAsync(a, { shouldDownloadFromNetwork: false }).catch(() => null),
        ),
      );
      chunkUris = infos.map((x) => x?.localUri ?? null);
    } else {
      chunkUris = slice.map((a) => a.uri);
    }

    const decodable: string[] = [];
    const slotOf: number[] = [];
    for (let j = 0; j < chunkUris.length; j++) {
      const u = chunkUris[j];
      if (u) {
        decodable.push(u);
        slotOf.push(j);
      } else {
        skipped++;
      }
    }

    const [labels, faces] = decodable.length
      ? await Promise.all([
          NitroLabeler.labelBatch(decodable, {
            concurrency: CONCURRENCY,
            maxLabels: 5,
            confidenceThreshold: 0.55,
          }),
          detectFaces(decodable),
        ])
      : [[], []];

    const labelByIdx = new Map<number, { text: string }[]>();
    for (const r of labels) labelByIdx.set(r.index, r.labels);
    const faceByIdx = new Map<
      number,
      { smilingProbability: number; leftEyeOpenProbability: number; rightEyeOpenProbability: number }[]
    >();
    for (const r of faces) faceByIdx.set(r.index, r.faces);

    for (let k = 0; k < decodable.length; k++) {
      const slot = slotOf[k];
      const asset = slice[slot];
      const fs = faceByIdx.get(k) ?? [];
      photos.push({
        id: asset.id,
        uri: decodable[k],
        time: asset.creationTime ?? 0,
        labels: (labelByIdx.get(k) ?? []).map((l) => l.text.toLowerCase()),
        faces: fs.map((f) => ({
          smilingProbability: f.smilingProbability,
          leftEyeOpenProbability: f.leftEyeOpenProbability,
          rightEyeOpenProbability: f.rightEyeOpenProbability,
        })),
      });
    }

    chunkMs.push(Date.now() - chunkStart);
    onProgress({ done: Math.min(i + CHUNK, cap), total: cap });
  }

  // Robust elapsed: sum per-chunk times, clamping suspension outliers (iOS
  // pauses the JS thread when backgrounded mid-scan) to the median.
  const sorted = [...chunkMs].sort((a, b) => a - b);
  const med = sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0;
  const elapsedMs = Math.round(
    chunkMs.reduce((s, ms) => s + (med > 0 && ms > med * 5 ? med : ms), 0),
  );

  cached = { photos, skipped, elapsedMs };
  return cached;
}

/** Drop the cached scan (e.g. a "rescan" button). */
export function clearScanCache() {
  cached = null;
}

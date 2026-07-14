# Benchmark — `@nitro-mlkit/face-detection` vs the classic bridge

This measures the cost of the **JS ↔ native architecture**, not of face
detection itself. Every library here wraps the **same Google ML Kit
face-detection `16.1.7`** on Android with the **same options** (fast mode, no
landmarks, no classification). The ML Kit inference is therefore identical — the
only variable is how the call crosses into native and how results come back.

| Library | Architecture |
| ------- | ------------ |
| `@nitro-mlkit/face-detection` (this repo) | **Nitro** — JSI, synchronous, no JSON serialization + **native batch** with coroutine concurrency |
| `@react-native-ml-kit/face-detection` `2.0.1` | **Classic bridge** — asynchronous, JSON-serialized, one round-trip per call, no batch API |
| `@infinitered/react-native-mlkit-face-detection` `5.0.0` | **Expo module** — expo-modules-core async functions, one round-trip per call, no batch API |

## What we measure

1. **Single-call latency** — median of 40 `detect()` calls on one image. Isolates
   per-call bridge overhead.
2. **Sequential scan of 500** — a `for` loop of 500 `detect()` calls on both
   libraries. Same access pattern on both sides → the fairest apples-to-apples
   comparison of overhead at scale.
3. **Batch scan of 500** — our `detectBatch(uris, concurrency)` (one native call,
   N detections run concurrently) vs the competitor's only option (the sequential
   loop above, because it has no batch API). This is how a real "scan the gallery"
   feature is actually written with each library.

A warm-up pass (12 detections/lib) runs first to load the ML Kit model and let
the JIT settle. The harness lives in [`example/app/benchmark.tsx`](../example/app/benchmark.tsx).

## Results — Android

Device: **Pixel 9 emulator, API 36 (Android 16), arm64**, 500 images.
Images: 50 distinct real faces (randomuser.me, 128×128) cycled to 500.
Representative clean run (see the variance caveat below).

**Single-call & sequential (all three libraries, same options):**

| Metric | Nitro | RN-ML-Kit (bridge) | InfiniteRed (Expo) |
| ------ | ----: | -----------------: | -----------------: |
| Single call (median of 40) | **2.98 ms** | 3.35 ms | 3.92 ms |
| Sequential scan ×500 | **1545 ms** | 1965 ms | 2917 ms |
| vs Nitro | — | 1.27× slower | 1.89× slower |

**Native batch — concurrency sweep (Nitro only; the others have no batch API):**

| concurrency | 1 | 2 | 4 | **8** | 16 |
| ----------- | --: | --: | --: | ----: | --: |
| ×500 time | 1203 ms | 1029 ms | 957 ms | **681 ms** | 993 ms |

- **Best batch (concurrency 8): 681 ms** → **2.89× faster** than the fastest
  competitor (RN-ML-Kit 1965 ms) and **4.28×** vs InfiniteRed.
- **Concurrency has a sweet spot.** Throughput improves up to ~8 then *regresses*
  at 16 — more workers than the device can run in parallel just adds scheduling
  contention. `detectBatch(uris, concurrency)` lets callers tune this; ~4–8 is a
  good default. Don't over-subscribe.

### Reading the numbers honestly

- Single-call / sequential wins (**~1.3× vs bridge, ~1.9× vs Expo**) are the pure
  architectural overhead Nitro removes (JSI vs a serialized async bridge). Real,
  but bounded **because ML Kit inference dominates each call** — the same engine
  runs underneath all three.
- The **batch** result is where the design pays off: one bridge crossing + native
  concurrency instead of 500 round-trips driven from the JS thread, which also
  keeps the JS thread free during a scan.
- **Bigger images widen the gap.** These 128×128 portraits have tiny inference
  cost, which *understates* the concurrency benefit; a real gallery of
  multi-megapixel photos spends far more time in parallelizable inference. Treat
  these as a conservative lower bound.

### Caveats

- **Emulator numbers are very noisy.** GPU-backed ML Kit (gfxstream) shares the
  host CPU/GPU; under load we saw a run where the competitors' sequential scans
  ballooned 4–40×. The table above is a clean, low-contention run. **Physical
  devices are what matter for any published claim** — treat the emulator as
  directional only.
- Cycling 50 images to 500 keeps the OS file cache warm. All libraries read the
  identical list, so the *relative* comparison is unaffected; absolute throughput
  is optimistic vs 500 cold, distinct files.

## Results — iOS

⏳ **Pending.** iOS must run on a **physical device** — Google ML Kit's iOS pods
ship no `arm64` slice for the Simulator, so the app builds but cannot run there.
The harness is platform-agnostic; on iOS, load the images into the app's
document directory and set `IMG_DIR` accordingly.

## Reproduce

```bash
# 1. Build & install the example app on a booted Android device/emulator
cd example && npx expo run:android

# 2. Load the reproducible face set into the app's internal storage
./benchmark/prepare-images.sh            # 50 faces (default)

# 3. Open the app → "⏱️ Benchmark vs RN-ML-Kit" → "Run Benchmark"
#    Results render on screen and are logged as `BENCH_RESULT {json}` in Metro.
```

Tune `GALLERY_SIZE`, `SINGLE_ITERS`, and `CONCURRENCY` at the top of
[`example/app/benchmark.tsx`](../example/app/benchmark.tsx).

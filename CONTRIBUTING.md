# Contributing

Thanks for looking. This is a pnpm monorepo of [Nitro Modules](https://github.com/mrousavy/nitro)
wrapping Google ML Kit — 16 packages under [`packages/`](./packages), one Expo
app in [`example/`](./example) that doubles as the manual test bed.

## The most useful thing you can do right now

**iOS on-device validation.** Eight packages (`barcode-scanning`,
`text-recognition`, `object-detection`, `pose-detection`,
`selfie-segmentation`, `language-id`, `translation`, `digital-ink`) compile,
link and code-sign on iOS, but nobody has confirmed their runtime behaviour on
real hardware. If you have an iPhone and 20 minutes, running the example app and
reporting what works is worth more than any code change.

Note the hard constraint: **Google ML Kit's iOS pods ship no `arm64` Simulator
slice**, so the app builds for the Simulator and then cannot run there. iOS work
requires a physical device.

## Setup

```bash
pnpm install                       # Node 22 (see .nvmrc), pnpm 10
cd example
npx expo run:android               # Android device or emulator
npx expo run:ios                   # physical device only
```

Every package is linked into the example app as `workspace:*`, so edits to
`packages/*/src` hot-reload. Changes to native code (Swift/Kotlin/C++) or to a
`.nitro.ts` spec need a rebuild.

## Typecheck

```bash
pnpm lint          # tsc --noEmit across every package
pnpm build         # same thing — these packages ship TypeScript source
```

Packages publish `src/` directly (`"main": "src/index.ts"`), which is how Metro
consumes them. There is no compile step to run before publishing.

## Changing a Nitro spec

The `.nitro.ts` files under `packages/*/src/specs/` are the source of truth for
the native interface. After editing one, regenerate the bindings **from that
package's directory**:

```bash
cd packages/face-detection && npx nitrogen
```

The binary is `nitrogen`, not `nitro-codegen`. Two gotchas that will bite you:

- **Nitrogen rejects anonymous object types.** `detect(uri, { fast?: boolean })`
  fails; extract a named `interface` and use that.
- Generated output lands in `nitrogen/generated/` and **is committed**. Include
  it in your PR — consumers build from it, and CI does not regenerate it.

Then update the Swift (`ios/Hybrid*.swift`) and Kotlin
(`android/src/main/kotlin/.../Hybrid*.kt`) implementations to match the new
generated spec signatures.

## Adding a package

Copy the closest existing package and keep all five pieces in sync — nitrogen
generates the bridge but **not** the platform glue:

1. `nitro.json` — namespace + `iosModuleName` + autolinking entry
2. `android/CMakeLists.txt` + `android/src/main/cpp/cpp-adapter.cpp` — the
   `JNI_OnLoad` → `registerAllNatives()` call. Omit this and the HybridObject
   silently never registers; this is the single most common mistake.
3. `android/build.gradle` — CMake, prefab, `abiFilters`
4. An Expo `Module()` registered via `expo-module.config.json`, plus an eager
   `requireOptionalNativeModule(...)` in `src/index.ts` (Android lazy-loads Expo
   modules, so without this the module resolves to `null`)
5. `*.podspec` using Nitrogen's `add_nitrogen_files(s)` and an `s.module_name`
   that **matches** `nitro.json`'s `iosModuleName`

A package that is missing an iOS implementation is **not** publishable. Either
implement iOS, or — if Google ML Kit genuinely ships no iOS SDK for that API —
add it to `ANDROID_ONLY_BY_MLKIT` in
[`scripts/check-release-hygiene.mjs`](./scripts/check-release-hygiene.mjs) with
the reason. Five packages are in that list (Document Scanner, Entity Extraction,
Face Mesh, Smart Reply, Subject Segmentation); they are complete for the only
platform where the API exists.

Do not add a package to that list to silence the check. The question to answer
is "does Google ship this API on iOS?" — if it does, the package needs Swift. An
Android-only package must also throw a clear, named error off Android rather
than failing silently, and say so in its README.

To hold a package back from the registry for any other reason, set
`"private": true` in its `package.json`; `publish.mjs` skips it.

## Benchmarks

Any performance claim in a README has to be reproducible by the harness in
[`benchmark/`](./benchmark). Keep the methodology honest: same ML Kit version,
same detector options across libraries, state the device, and say when a number
comes from an emulator. See [`benchmark/README.md`](./benchmark/README.md) for
the existing caveats — please preserve that tone rather than rounding numbers up.

## Pull requests

- One package per PR where you can.
- Say which platform you actually ran on, and whether it was a device or an
  emulator. "Compiles" and "works" are different claims and we track them
  separately in the README status table.
- Update the package README and the root status table if you change what is
  verified.

## Releasing

Maintainers only. Every script is a **dry run by default** and needs `--apply` to
touch the registry:

```bash
pnpm hygiene                       # assert every package is safe to publish
node scripts/publish.mjs           # show what would be published
node scripts/publish.mjs --apply   # publish it (needs `npm login`)
node scripts/fix-npm-tags.mjs      # audit dist-tags against the repo
```

To release a package, bump its `version` and run `publish.mjs` — it derives the
tag from the version (`-beta.x` → the `beta` tag, otherwise `latest`), skips
anything already on npm, and refuses to run if the hygiene check fails. Then run
`fix-npm-tags.mjs --apply`, because **npm sets `latest` on a first publish even
when you pass `--tag beta`** — which is exactly how this suite ended up with
`latest` pointing at stale prereleases.

## License

MIT. By contributing you agree your work ships under it.

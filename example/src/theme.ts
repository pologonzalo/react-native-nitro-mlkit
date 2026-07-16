import { StyleSheet } from "react-native";

/**
 * GIZMO design system — "the Nitro toy lab".
 * Warm cream pegboard canvas, chunky rounded shapes, bold ink outlines and a
 * hard-bottom "keycap" shadow so everything feels like a physical key.
 * The token API (C / R / T / tint) is kept stable so every screen adopts the
 * look without edits; new bits (F fonts, keycap, accents) layer on top.
 */

export const C = {
  bg: "#FBF1E4", // warm cream paper
  surface: "#FFFFFF", // card
  surfaceAlt: "#FFF7EC", // raised off-white
  peg: "#F3E7D3", // pegboard tone
  border: "#E7D6BC", // subtle peg hairline (screens)
  borderSoft: "#F0E5D2",
  ink: "#1E1B16", // bold outline + strong text
  text: "#1E1B16",
  dim: "#6B6154",
  faint: "#9A8F7C",
  gold: "#C2691C", // readable amber for status text on cream
  danger: "#E5484D",

  // GIZMO accents
  orange: "#FF6A3D", // primary / squish
  blue: "#3B82F6", // interactive
  yellow: "#FFD23F", // highlight / stickers
  mint: "#2BD9A0", // privacy / success
  mintInk: "#0F8A63",
  mintBg: "#DFF7EE",
};

export const R = { sm: 12, md: 18, lg: 24, xl: 30, pill: 999 };

/** Font families (loaded in app/_layout via @expo-google-fonts). */
export const F = {
  display: "Fredoka_700Bold",
  displaySemi: "Fredoka_600SemiBold",
  body: "Nunito_400Regular",
  bodySemi: "Nunito_600SemiBold",
  bodyBold: "Nunito_700Bold",
  mono: "SpaceMono_400Regular",
};

/** Alpha overlay of a hex accent, e.g. tint("#FF6A3D", 0.16). Fine for borders
 * and for backgrounds WITHOUT elevation. */
export function tint(hex: string, alpha: number): string {
  const a = Math.round(Math.max(0, Math.min(1, alpha)) * 255)
    .toString(16)
    .padStart(2, "0");
  return `${hex}${a}`;
}

/**
 * Opaque blend of `hex` over `base` (default: the cream page). Use this — not
 * tint() — for the background of anything that also has a keycap/elevation
 * shadow: Android renders elevation shadows as a solid fill behind translucent
 * backgrounds, so a tinted (alpha) bg under a shadow shows an ugly dark halo.
 * wash() gives the same soft-accent look but fully opaque, so the shadow is clean.
 */
export function wash(hex: string, amount: number, base: string = C.surface): string {
  const h = hex.replace("#", "");
  const b = base.replace("#", "");
  const px = (s: string, i: number) => parseInt(s.slice(i, i + 2), 16);
  const t = Math.max(0, Math.min(1, amount));
  const mix = (a: number, c: number) => Math.round(a + (c - a) * t);
  const to2 = (n: number) => n.toString(16).padStart(2, "0");
  const r = mix(px(b, 0), px(h, 0));
  const g = mix(px(b, 2), px(h, 2));
  const bl = mix(px(b, 4), px(h, 4));
  return `#${to2(r)}${to2(g)}${to2(bl)}`;
}

/**
 * The signature hard-bottom "keycap" shadow: a solid, no-blur, ink-coloured
 * drop straight down, so every surface looks like a physical key. Uses the
 * cross-platform `boxShadow` style (RN 0.76+, New Architecture) — identical on
 * iOS and Android. The old shadow/elevation combo only gave Android a soft,
 * grey Material shadow (generic, off-brand); boxShadow keeps it crisp on both.
 * `depth` is how tall the key sits.
 */
export function keycap(depth = 6, color = C.ink) {
  return { boxShadow: `0px ${depth}px 0px ${color}` } as const;
}

export const T = StyleSheet.create({
  h1: { fontFamily: F.display, fontSize: 30, color: C.text, letterSpacing: -0.5 },
  h2: { fontFamily: F.display, fontSize: 20, color: C.text, letterSpacing: -0.3 },
  mono: { fontFamily: F.mono, fontSize: 12, color: C.dim, fontVariant: ["tabular-nums"] },
  label: { fontFamily: F.bodyBold, fontSize: 15, color: C.text },
  sub: { fontFamily: F.body, fontSize: 13.5, color: C.dim },
  faint: { fontFamily: F.body, fontSize: 12, color: C.faint },
});

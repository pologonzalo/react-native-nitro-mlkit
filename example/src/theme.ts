import { StyleSheet } from "react-native";

/**
 * GIZMO design system — "friendly & chunky", Duolingo-flavored.
 * Clean white canvas, hairline gray borders, saturated candy accents, and a
 * hard-bottom edge (boxShadow, no blur) so cards and buttons read as physical
 * pieces. Colored buttons sit on a darker shade of their own hue; neutral
 * surfaces sit on the hairline gray.
 * The token API (C / R / F / T / tint / wash / keycap) is kept stable so every
 * screen adopts the look without structural edits.
 */

export const C = {
  bg: "#FFFFFF", // clean white canvas
  surface: "#FFFFFF", // card
  surfaceAlt: "#F7F7F7", // recessed wells (image placeholders, tracks)
  peg: "#F7F7F7", // legacy alias of surfaceAlt
  border: "#E5E5E5", // hairline card border + neutral edge
  borderSoft: "#EFEFEF",
  ink: "#3C3C3C", // strong text
  text: "#3C3C3C",
  dim: "#777777",
  faint: "#AFAFAF",
  gold: "#C77D00", // readable amber for status lines on white
  danger: "#FF4B4B",

  // Candy accents (Duolingo-ish)
  green: "#58CC02", // primary CTA
  blue: "#1CB0F6", // interactive
  blueDeep: "#2B70C9",
  yellow: "#FFC800", // highlight only — never text
  orange: "#FF9600",
  red: "#FF4B4B",
  purple: "#CE82FF",

  // Legacy aliases (old GIZMO names still used by screens)
  mint: "#58CC02",
  mintInk: "#58A700",
  mintBg: "#E7FFD1",
};

export const R = { sm: 12, md: 14, lg: 16, xl: 20, pill: 999 };

/** Font families (loaded in app/_layout via @expo-google-fonts). One family:
 * Nunito, from regular body up to extra-bold display. */
export const F = {
  display: "Nunito_800ExtraBold",
  displaySemi: "Nunito_700Bold",
  body: "Nunito_400Regular",
  bodySemi: "Nunito_600SemiBold",
  bodyBold: "Nunito_700Bold",
  mono: "SpaceMono_400Regular",
};

/** Alpha overlay of a hex accent, e.g. tint("#1CB0F6", 0.12). Fine for borders
 * and for backgrounds WITHOUT elevation. */
export function tint(hex: string, alpha: number): string {
  const a = Math.round(Math.max(0, Math.min(1, alpha)) * 255)
    .toString(16)
    .padStart(2, "0");
  return `${hex}${a}`;
}

/**
 * Opaque blend of `hex` over `base` (default: white). Use this — not tint() —
 * for the background of anything that also has a keycap/elevation shadow:
 * Android renders elevation shadows as a solid fill behind translucent
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

/** Darker edge of an accent — what a colored button rests on
 * (e.g. green #58CC02 → its #46A302-ish underside). */
export function shade(hex: string, amount = 0.22): string {
  return wash("#000000", amount, hex);
}

/**
 * The signature hard-bottom edge: a solid, no-blur drop straight down, so
 * surfaces read as physical pieces. Neutral surfaces rest on the hairline
 * gray; colored buttons pass shade(accent). Uses the cross-platform
 * `boxShadow` style (RN 0.76+, New Architecture) — identical on iOS/Android.
 * `depth` is how tall the piece sits.
 */
export function keycap(depth = 2, color = C.border) {
  return { boxShadow: `0px ${depth}px 0px ${color}` } as const;
}

export const T = StyleSheet.create({
  h1: { fontFamily: F.display, fontSize: 26, color: C.text, letterSpacing: -0.3 },
  h2: { fontFamily: F.display, fontSize: 18, color: C.text, letterSpacing: -0.2 },
  mono: { fontFamily: F.mono, fontSize: 12, color: C.dim, fontVariant: ["tabular-nums"] },
  label: { fontFamily: F.bodyBold, fontSize: 15, color: C.text },
  sub: { fontFamily: F.body, fontSize: 13.5, color: C.dim },
  faint: { fontFamily: F.body, fontSize: 12, color: C.faint },
});

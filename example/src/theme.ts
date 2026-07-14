import { StyleSheet } from "react-native";

/** Shared dark design tokens for the demo app. */
export const C = {
  bg: "#0A0A16",
  surface: "#14162B",
  surfaceAlt: "#1B1E3A",
  border: "#282C4A",
  borderSoft: "#20233E",
  text: "#F4F5FB",
  dim: "#9CA1BC",
  faint: "#6A6F8C",
  gold: "#FFD36B",
  danger: "#f87171",
};

export const R = { sm: 8, md: 12, lg: 16, xl: 22, pill: 999 };

/** Alpha overlay of a hex accent, e.g. tint("#f59e0b", 0.14). */
export function tint(hex: string, alpha: number): string {
  const a = Math.round(Math.max(0, Math.min(1, alpha)) * 255)
    .toString(16)
    .padStart(2, "0");
  return `${hex}${a}`;
}

export const T = StyleSheet.create({
  h1: { fontSize: 26, fontWeight: "800", color: C.text, letterSpacing: -0.5 },
  h2: { fontSize: 19, fontWeight: "700", color: C.text, letterSpacing: -0.3 },
  mono: {
    fontSize: 13,
    color: C.dim,
    fontVariant: ["tabular-nums"],
  },
  label: { fontSize: 15, color: C.text, fontWeight: "600" },
  sub: { fontSize: 13, color: C.dim },
  faint: { fontSize: 12, color: C.faint },
});

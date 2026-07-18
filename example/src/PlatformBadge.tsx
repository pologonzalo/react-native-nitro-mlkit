import { Ionicons } from "@expo/vector-icons";
import { View } from "react-native";
import { C } from "./theme";

/**
 * Small monochrome platform indicator: the real Apple (iOS) and Google Play
 * (Android) marks instead of a robot emoji. Cross-platform packages show both;
 * Android-only packages show just the Android/Play mark.
 * (Android's official brand mark is the green robot — we use the Play triangle
 * here to keep it robot-free per the brief. Swap `android` glyph if desired.)
 */
const GLYPH = { ios: "logo-apple", android: "logo-google-playstore" } as const;

export function PlatformBadge({
  androidOnly,
  size = 15,
  color = C.faint,
  gap = 6,
}: {
  androidOnly?: boolean;
  size?: number;
  color?: string;
  gap?: number;
}) {
  const platforms = androidOnly ? (["android"] as const) : (["ios", "android"] as const);
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap }}>
      {platforms.map((p) => (
        <Ionicons key={p} name={GLYPH[p]} size={size} color={color} />
      ))}
    </View>
  );
}

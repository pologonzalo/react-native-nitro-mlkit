import { DrawerActions } from "expo-router/react-navigation";
import { useNavigation } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { C, F, wash } from "./theme";
import { Button } from "./ui";

/**
 * Home = the pitch, not the catalog. A short explanation of what the project
 * is, then one big button that opens the drawer — where everything lives.
 */
export default function HomeScreen() {
  const navigation = useNavigation();
  const openDrawer = () => navigation.dispatch(DrawerActions.openDrawer());

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      {/* The pitch */}
      <Text style={s.logo}>
        GIZM<Text style={s.logoO}>O</Text>
      </Text>
      <Text style={s.tagline}>
        Every Google ML Kit feature, running on-device in React Native.
      </Text>
      <Text style={s.body}>
        This app is the living demo of <Text style={s.mono}>react-native-nitro-mlkit</Text> — 16
        independent packages wrapping Google's ML Kit with Nitro Modules.
      </Text>

      <View style={s.points}>
        <Point emoji="🧩" accent={C.blue} title="16 packages" text="Faces, OCR, poses, barcodes, translation, segmentation… install only what you use." />
        <Point emoji="⚡" accent={C.orange} title="Nitro fast" text="JSI instead of the classic bridge — plus native batching for whole photo libraries." />
        <Point emoji="🔒" accent={C.green} title="100% on-device" text="Every model runs locally. Zero bytes leave the phone." />
      </View>

      {/* The catalog is one tap away */}
      <Button title="Explore the examples" onPress={openDrawer} accent={C.green} />
      <Text style={s.hint}>
        Showcases, benchmarks and all 16 gizmos live in the drawer — swipe from the left edge
        anytime.
      </Text>
    </ScrollView>
  );
}

function Point({ emoji, accent, title, text }: { emoji: string; accent: string; title: string; text: string }) {
  return (
    <View style={s.point}>
      <View style={{ ...s.pointChip, backgroundColor: wash(accent, 0.14) }}>
        <Text style={s.pointEmoji}>{emoji}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.pointTitle}>{title}</Text>
        <Text style={s.pointText}>{text}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { flexGrow: 1, padding: 24, paddingTop: 12, paddingBottom: 36 },
  logo: { fontFamily: F.display, fontSize: 52, color: C.green, lineHeight: 58, letterSpacing: -1 },
  logoO: { color: C.blue },
  tagline: { fontFamily: F.display, fontSize: 19, color: C.ink, marginTop: 2, lineHeight: 25 },
  body: { fontFamily: F.body, fontSize: 14.5, color: C.dim, lineHeight: 21, marginTop: 10 },
  mono: { fontFamily: F.mono, fontSize: 13, color: C.ink },

  points: { gap: 16, marginTop: 24, marginBottom: "auto", paddingBottom: 28 },
  point: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  pointChip: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  pointEmoji: { fontSize: 22 },
  pointTitle: { fontFamily: F.bodyBold, fontSize: 15, color: C.ink },
  pointText: { fontFamily: F.body, fontSize: 13, color: C.dim, lineHeight: 18, marginTop: 1 },

  hint: { fontFamily: F.body, fontSize: 12, color: C.faint, textAlign: "center", marginTop: 14, lineHeight: 17 },
});

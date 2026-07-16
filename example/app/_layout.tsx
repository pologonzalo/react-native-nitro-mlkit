import {
  Fredoka_600SemiBold,
  Fredoka_700Bold,
} from "@expo-google-fonts/fredoka";
import {
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
} from "@expo-google-fonts/nunito";
import { SpaceMono_400Regular } from "@expo-google-fonts/space-mono";
import { useFonts } from "expo-font";
import { Drawer } from "expo-router/drawer";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { DrawerContentComponentProps } from "@react-navigation/drawer";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { FEATURES, SHELVES } from "../src/features";
import { C, F, keycap, R, T, tint, wash } from "../src/theme";

SplashScreen.preventAutoHideAsync();

// Titles for the header, per route.
const TITLES: Record<string, string> = {
  index: "",
  gallery: "Gallery Wrapped",
  benchmark: "The Race",
  ...Object.fromEntries(FEATURES.map((f) => [f.route, f.title])),
};

export default function RootLayout() {
  const [loaded] = useFonts({
    Fredoka_600SemiBold,
    Fredoka_700Bold,
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
    SpaceMono_400Regular,
  });

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Drawer
        drawerContent={(props) => <ToyShelf {...props} />}
        screenOptions={{
          headerStyle: { backgroundColor: C.bg },
          headerShadowVisible: false,
          headerTintColor: C.ink,
          headerTitleStyle: { fontFamily: F.display, color: C.ink, fontSize: 18 },
          drawerType: "front",
          sceneStyle: { backgroundColor: C.bg },
          swipeEdgeWidth: 80,
        }}
      >
        {Object.entries(TITLES).map(([route, title]) => (
          <Drawer.Screen key={route} name={route} options={{ title }} />
        ))}
      </Drawer>
    </GestureHandlerRootView>
  );
}

function ToyShelf(props: DrawerContentComponentProps) {
  const active = props.state.routes[props.state.index]?.name;
  const go = (route: string) => props.navigation.navigate(route as never);

  return (
    <View style={s.drawer}>
      <ScrollView contentContainerStyle={s.pad} showsVerticalScrollIndicator={false}>
        <Text style={s.logo}>
          GIZM<Text style={s.logoO}>O</Text>
        </Text>
        <View style={s.chips}>
          <Chip>on-device</Chip>
          <Chip>JSI · no bridge</Chip>
          <Chip mint>0 bytes ↑</Chip>
        </View>

        {/* Featured quick links */}
        <Row emoji="🏠" title="Home" onPress={() => go("index")} active={active === "index"} accent={C.orange} />
        <Row emoji="✨" title="Gallery Wrapped" onPress={() => go("gallery")} active={active === "gallery"} accent={C.orange} />
        <Row emoji="🏁" title="The Race — Benchmark" onPress={() => go("benchmark")} active={active === "benchmark"} accent={C.blue} />

        {SHELVES.map((shelf) => (
          <View key={shelf}>
            <Text style={s.shelf}>{shelf}</Text>
            {FEATURES.filter((f) => f.shelf === shelf).map((f) => (
              <Row
                key={f.route}
                emoji={f.emoji}
                title={f.title}
                android={f.android}
                accent={f.accent}
                active={active === f.route}
                onPress={() => go(f.route)}
              />
            ))}
          </View>
        ))}
        <Text style={s.foot}>16 packages · 🤖 = Android-only</Text>
      </ScrollView>
    </View>
  );
}

function Chip({ children, mint }: { children: React.ReactNode; mint?: boolean }) {
  return (
    <View style={{ ...s.chip, ...(mint ? { backgroundColor: C.mint, borderColor: C.mintInk } : {}) }}>
      <Text style={{ ...s.chipText, ...(mint ? { color: "#08301F" } : {}) }}>{children}</Text>
    </View>
  );
}

function Row({
  emoji,
  title,
  android,
  accent,
  active,
  onPress,
}: {
  emoji: string;
  title: string;
  android?: boolean;
  accent: string;
  active?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        ...s.row,
        backgroundColor: active ? wash(accent, 0.16) : C.surface,
        borderColor: active ? accent : C.ink,
      }}
    >
      <View style={{ ...s.rowChip, backgroundColor: tint(accent, 0.18) }}>
        <Text style={s.rowEmoji}>{emoji}</Text>
      </View>
      <Text style={s.rowTitle} numberOfLines={1}>{title}</Text>
      {android && <Text style={s.and}>🤖</Text>}
    </Pressable>
  );
}

const s = StyleSheet.create({
  drawer: { flex: 1, backgroundColor: C.bg },
  pad: { padding: 16, paddingTop: 56, paddingBottom: 40 },
  logo: { fontFamily: F.display, fontSize: 40, color: C.orange, lineHeight: 44 },
  logoO: { color: C.blue },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8, marginBottom: 16 },
  chip: {
    backgroundColor: C.surface,
    borderWidth: 2,
    borderColor: C.ink,
    borderRadius: R.pill,
    paddingVertical: 3,
    paddingHorizontal: 9,
    ...keycap(3),
  },
  chipText: { fontFamily: F.mono, fontSize: 10, color: C.ink },
  shelf: { fontFamily: F.bodyBold, fontSize: 12, color: C.dim, textTransform: "uppercase", letterSpacing: 0.6, marginTop: 18, marginBottom: 9 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    borderWidth: 2,
    borderRadius: R.md,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 9,
    ...keycap(4),
  },
  rowChip: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  rowEmoji: { fontSize: 18 },
  rowTitle: { flex: 1, fontFamily: F.bodyBold, fontSize: 14.5, color: C.ink },
  and: { fontSize: 15 },
  foot: { fontFamily: F.mono, fontSize: 10, color: C.faint, textAlign: "center", marginTop: 20 },
});

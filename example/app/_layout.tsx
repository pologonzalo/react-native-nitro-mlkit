import {
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
} from "@expo-google-fonts/nunito";
import { SpaceMono_400Regular } from "@expo-google-fonts/space-mono";
import { useFonts } from "expo-font";
import { Drawer, type DrawerContentComponentProps } from "expo-router/drawer";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { FEATURES, SHELVES } from "../src/features";
import { PlatformBadge } from "../src/PlatformBadge";
import { C, F, R, shade, tint, wash } from "../src/theme";

SplashScreen.preventAutoHideAsync();

// Titles for the header, per route. Every file in app/ needs an entry so the
// screen is registered — even routes the drawer list doesn't show (benchmark
// lives inside Face Detection now).
const TITLES: Record<string, string> = {
  index: "",
  gallery: "Gallery Wrapped",
  cleaner: "Photo Cleaner",
  benchmark: "The Race",
  ...Object.fromEntries(FEATURES.map((f) => [f.route, f.title])),
};

export default function RootLayout() {
  const [loaded] = useFonts({
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
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
          headerTitleStyle: { fontFamily: F.display, color: C.ink, fontSize: 17 },
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
          <Chip green>0 bytes ↑</Chip>
        </View>

        <Row emoji="🏠" title="Home" onPress={() => go("index")} active={active === "index"} accent={C.green} />

        <Text style={s.shelf}>Showcases</Text>
        <Row emoji="✨" title="Gallery Wrapped" onPress={() => go("gallery")} active={active === "gallery"} accent={C.purple} />
        <Row emoji="🧹" title="Photo Cleaner" onPress={() => go("cleaner")} active={active === "cleaner"} accent={C.green} />

        {SHELVES.map((shelf) => (
          <View key={shelf}>
            <Text style={s.shelf}>{shelf}</Text>
            {FEATURES.filter((f) => f.shelf === shelf).map((f) => (
              <Row
                key={f.route}
                emoji={f.emoji}
                title={f.title}
                platform={f.android ? "android" : "both"}
                accent={f.accent}
                active={active === f.route}
                onPress={() => go(f.route)}
              />
            ))}
          </View>
        ))}
        <Text style={s.foot}>16 packages · marks show iOS / Android support</Text>
      </ScrollView>
    </View>
  );
}

function Chip({ children, green }: { children: React.ReactNode; green?: boolean }) {
  return (
    <View style={{ ...s.chip, ...(green ? { backgroundColor: wash(C.green, 0.15) } : {}) }}>
      <Text style={{ ...s.chipText, ...(green ? { color: C.mintInk } : {}) }}>{children}</Text>
    </View>
  );
}

function Row({
  emoji,
  title,
  platform,
  accent,
  active,
  onPress,
}: {
  emoji: string;
  title: string;
  platform?: "both" | "android";
  accent: string;
  active?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        ...s.row,
        backgroundColor: active ? wash(accent, 0.12) : pressed ? C.surfaceAlt : "transparent",
        borderColor: active ? tint(accent, 0.45) : "transparent",
      })}
    >
      <View style={{ ...s.rowChip, backgroundColor: wash(accent, 0.14) }}>
        <Text style={s.rowEmoji}>{emoji}</Text>
      </View>
      <Text style={{ ...s.rowTitle, color: active ? shade(accent, 0.15) : C.ink }} numberOfLines={1}>
        {title}
      </Text>
      {platform && <PlatformBadge androidOnly={platform === "android"} size={15} />}
    </Pressable>
  );
}

const s = StyleSheet.create({
  drawer: { flex: 1, backgroundColor: C.bg, borderRightWidth: 2, borderRightColor: C.border },
  pad: { padding: 14, paddingTop: 56, paddingBottom: 40 },
  logo: { fontFamily: F.display, fontSize: 36, color: C.green, lineHeight: 42, letterSpacing: -0.5, paddingLeft: 8 },
  logoO: { color: C.blue },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6, marginBottom: 14, paddingLeft: 8 },
  chip: {
    backgroundColor: C.surfaceAlt,
    borderRadius: R.pill,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  chipText: { fontFamily: F.mono, fontSize: 10, color: C.dim },
  shelf: {
    fontFamily: F.display,
    fontSize: 11,
    color: C.faint,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginTop: 18,
    marginBottom: 6,
    paddingLeft: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    borderWidth: 2,
    borderRadius: R.md,
    paddingVertical: 7,
    paddingHorizontal: 8,
    marginBottom: 4,
  },
  rowChip: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  rowEmoji: { fontSize: 18 },
  rowTitle: { flex: 1, fontFamily: F.bodyBold, fontSize: 14.5 },
  foot: { fontFamily: F.mono, fontSize: 10, color: C.faint, textAlign: "center", marginTop: 22 },
});

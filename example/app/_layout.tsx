import { Stack } from "expo-router";

// Friendly header title + accent (tints the native back arrow) per screen.
const SCREENS: { name: string; title: string; accent: string }[] = [
  { name: "faces", title: "Face Detection", accent: "#3b82f6" },
  { name: "benchmark", title: "Benchmark", accent: "#8b5cf6" },
  { name: "labeling", title: "Image Labeling", accent: "#06b6d4" },
  { name: "barcode", title: "Barcode Scanning", accent: "#d97706" },
  { name: "ocr", title: "Text Recognition", accent: "#ec4899" },
  { name: "objects", title: "Object Detection", accent: "#22c55e" },
  { name: "pose", title: "Pose Detection", accent: "#8b5cf6" },
  { name: "langid", title: "Language ID", accent: "#0ea5e9" },
  { name: "facemesh", title: "Face Mesh", accent: "#f43f5e" },
  { name: "selfieseg", title: "Selfie Segmentation", accent: "#14b8a6" },
  { name: "smartreply", title: "Smart Reply", accent: "#f59e0b" },
  { name: "translate", title: "Translation", accent: "#6366f1" },
  { name: "entity", title: "Entity Extraction", accent: "#a855f7" },
  { name: "subjectseg", title: "Subject Segmentation", accent: "#10b981" },
];

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#0A0A1A" },
        headerTitleStyle: { color: "#fff", fontWeight: "700" },
        headerShadowVisible: false,
        headerTintColor: "#fff",
        contentStyle: { backgroundColor: "#0A0A1A" },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      {SCREENS.map(({ name, title, accent }) => (
        <Stack.Screen
          key={name}
          name={name}
          options={{ title, headerTintColor: accent }}
        />
      ))}
    </Stack>
  );
}

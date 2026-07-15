import {
  NitroDocumentScanner,
  type ScannedDocument,
} from "@nitro-mlkit/document-scanner";
import { useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { C, R, T, tint } from "../src/theme";
import { Card, Pill, TitleBlock } from "../src/ui";

const ACCENT = "#f97316";

export default function DocScannerScreen() {
  const available = NitroDocumentScanner.isAvailable();
  const [result, setResult] = useState<ScannedDocument | null>(null);
  const [status, setStatus] = useState(
    available ? "Scan a document to begin" : "Android-only",
  );
  const [loading, setLoading] = useState(false);

  async function scan() {
    setLoading(true);
    setStatus("Opening scanner…");
    try {
      const t = Date.now();
      const r = await NitroDocumentScanner.scan(10, true, true);
      setResult(r);
      setStatus(`${r.pageCount} page(s) · ${Date.now() - t} ms`);
    } catch (e: any) {
      setResult(null);
      setStatus(e?.message?.includes("cancel") ? "Cancelled" : "Error ❌");
    }
    setLoading(false);
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <TitleBlock name="@nitro-mlkit/document-scanner" tagline="Full-screen scanner UI → JPEG + PDF · Android-only" />

      <Pressable style={s.scanBtn} onPress={scan} disabled={loading || !available}>
        {loading ? (
          <ActivityIndicator color="#1a0f02" />
        ) : (
          <Text style={s.scanText}>📄  Scan a document</Text>
        )}
      </Pressable>

      <View style={s.statusRow}>
        <Text style={s.status}>{status}</Text>
      </View>

      {result && (
        <Card>
          <View style={s.head}>
            <Text style={T.label}>Result</Text>
            <View style={{ flexDirection: "row", gap: 6 }}>
              <Pill accent={ACCENT}>{result.pageCount} pages</Pill>
              {result.pdfUri && <Pill accent={ACCENT}>PDF</Pill>}
            </View>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
            {result.pageImageUris.map((uri, i) => (
              <Image key={i} source={{ uri }} style={s.page} resizeMode="cover" />
            ))}
          </ScrollView>
          {result.pdfUri && (
            <Text style={{ ...T.faint, marginTop: 10 }} numberOfLines={1}>
              PDF: {result.pdfUri}
            </Text>
          )}
        </Card>
      )}

      {!available && (
        <Card>
          <Text style={T.sub}>
            Google ML Kit provides the Document Scanner on Android only, so this
            screen is inert on iOS.
          </Text>
        </Card>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { padding: 20, paddingTop: 16, paddingBottom: 40 },
  scanBtn: {
    backgroundColor: ACCENT,
    paddingVertical: 18,
    borderRadius: R.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  scanText: { color: "#1a0f02", fontSize: 17, fontWeight: "800" },
  statusRow: { alignItems: "center", marginVertical: 16 },
  status: { color: C.gold, fontSize: 14 },
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  page: {
    width: 150,
    height: 210,
    borderRadius: R.md,
    marginRight: 10,
    backgroundColor: C.surfaceAlt,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
  },
});

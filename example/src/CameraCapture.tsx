import { CameraView, useCameraPermissions } from "expo-camera";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { C, F } from "./theme";

/**
 * In-app camera with lens selection — the reason this exists instead of
 * ImagePicker.launchCameraAsync: that call opens the system
 * UIImagePickerController, and Apple does not expose the ultra-wide (0.5x)
 * lens there at all. expo-camera does (iOS: `selectedLens`), so a photo of a
 * full body for pose detection can actually fit in the frame.
 *
 * Lens pills only render when the device reports more than one lens for the
 * current facing (Android and front cameras typically report none/one).
 */
const LENS_LABEL: Record<string, string> = {
  builtInUltraWideCamera: "0.5x",
  builtInWideAngleCamera: "1x",
  builtInTelephotoCamera: "Tele",
};
const LENS_ORDER = Object.keys(LENS_LABEL);

export function CameraCapture({
  visible,
  accent = C.orange,
  onClose,
  onCapture,
}: {
  visible: boolean;
  accent?: string;
  onClose: () => void;
  onCapture: (uri: string) => void;
}) {
  const [perm, requestPerm] = useCameraPermissions();
  const camRef = useRef<CameraView>(null);
  const [facing, setFacing] = useState<"back" | "front">("back");
  const [lenses, setLenses] = useState<string[]>([]);
  const [lens, setLens] = useState<string | undefined>(undefined);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (visible && perm && !perm.granted && perm.canAskAgain) requestPerm();
  }, [visible, perm, requestPerm]);

  async function onReady() {
    try {
      const available = (await camRef.current?.getAvailableLensesAsync()) ?? [];
      setLenses(LENS_ORDER.filter((l) => available.includes(l)));
    } catch {
      setLenses([]); // Android / older devices: no lens API, default lens only
    }
  }

  function flip() {
    setLenses([]);
    setLens(undefined);
    setFacing((f) => (f === "back" ? "front" : "back"));
  }

  async function shoot() {
    if (busy) return;
    setBusy(true);
    try {
      const photo = await camRef.current?.takePictureAsync({ quality: 1 });
      if (photo?.uri) {
        onCapture(photo.uri);
        onClose();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={s.root}>
        {perm?.granted ? (
          <CameraView
            ref={camRef}
            style={StyleSheet.absoluteFill}
            facing={facing}
            selectedLens={lens}
            onCameraReady={onReady}
          />
        ) : (
          <View style={s.permBox}>
            <Text style={s.permText}>
              Camera permission is required to take a photo.
            </Text>
            <Pressable
              style={[s.permBtn, { backgroundColor: accent }]}
              onPress={requestPerm}
            >
              <Text style={s.permBtnText}>Grant access</Text>
            </Pressable>
          </View>
        )}

        <Pressable style={s.close} onPress={onClose} hitSlop={12}>
          <Text style={s.closeText}>✕</Text>
        </Pressable>

        {lenses.length > 1 && (
          <View style={s.lensRow}>
            {lenses.map((l) => {
              const active = l === lens || (!lens && l === "builtInWideAngleCamera");
              return (
                <Pressable
                  key={l}
                  onPress={() => setLens(l)}
                  style={[s.lensPill, active && { backgroundColor: accent }]}
                >
                  <Text style={[s.lensText, active && { color: "#fff" }]}>
                    {LENS_LABEL[l]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}

        <View style={s.bottomRow}>
          <View style={s.side} />
          <Pressable
            style={s.shutter}
            onPress={shoot}
            disabled={busy || !perm?.granted}
          >
            {busy ? (
              <ActivityIndicator color="#000" />
            ) : (
              <View style={s.shutterInner} />
            )}
          </Pressable>
          <Pressable style={s.side} onPress={flip} hitSlop={12}>
            <Text style={s.flipText}>🔄</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  permBox: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16, padding: 32 },
  permText: { color: "#fff", fontSize: 16, textAlign: "center", fontFamily: F.body },
  permBtn: { paddingHorizontal: 22, paddingVertical: 12, borderRadius: 999 },
  permBtnText: { color: "#fff", fontWeight: "700", fontFamily: F.body },
  close: { position: "absolute", top: 58, right: 22 },
  closeText: { color: "#fff", fontSize: 26, fontWeight: "600" },
  lensRow: {
    position: "absolute",
    bottom: 148,
    alignSelf: "center",
    flexDirection: "row",
    gap: 8,
    backgroundColor: "rgba(0,0,0,0.45)",
    borderRadius: 999,
    padding: 4,
  },
  lensPill: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999 },
  lensText: { color: "#ddd", fontWeight: "700", fontSize: 13, fontFamily: F.body },
  bottomRow: {
    position: "absolute",
    bottom: 48,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
  },
  side: { width: 54, height: 54, alignItems: "center", justifyContent: "center" },
  flipText: { fontSize: 30 },
  shutter: {
    width: 76,
    height: 76,
    borderRadius: 999,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
    borderColor: "rgba(255,255,255,0.4)",
  },
  shutterInner: {
    width: 60,
    height: 60,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: "#00000022",
    backgroundColor: "#fff",
  },
});

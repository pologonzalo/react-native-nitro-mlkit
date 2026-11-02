import {
  NitroPose,
  PoseLandmarkType as P,
  getLandmark,
  landmarkAngle,
  type PoseLandmark,
} from "@nitro-mlkit/pose-detection";
import { useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { POSES } from "../src/samples";
import { C, F, R, T } from "../src/theme";
import { AnnotatedImage, Card, Pill, SamplePicker, TitleBlock, imageSize } from "../src/ui";

const ACCENT = C.red;
const NAMES: Record<number, string> = {
  0: "nose",
  11: "left shoulder",
  12: "right shoulder",
  13: "left elbow",
  14: "right elbow",
  23: "left hip",
  24: "right hip",
  25: "left knee",
  26: "right knee",
};

type Verdict = { emoji: string; label: string; details: string[] };

/**
 * ML Kit's official pose-classification recipe: joint angles + relative
 * positions, gated on inFrameLikelihood so out-of-frame joints never vote.
 * Deliberately honest — says what it can't know instead of guessing.
 */
function classifyPose(lms: PoseLandmark[]): Verdict {
  const get = (t: number) => {
    const l = getLandmark(lms, t);
    return l && l.inFrameLikelihood > 0.5 ? l : undefined;
  };
  const details: string[] = [];

  const shoulder = get(P.LEFT_SHOULDER) ?? get(P.RIGHT_SHOULDER);
  const hip = get(P.LEFT_HIP) ?? get(P.RIGHT_HIP);
  if (!shoulder || !hip) {
    return {
      emoji: "🤷",
      label: "Can't tell",
      details: ["torso out of frame — need a shoulder and a hip"],
    };
  }

  // Torso lean vs vertical (0° = upright, 90° = horizontal).
  const torsoLean =
    (Math.atan2(Math.abs(shoulder.x - hip.x), Math.abs(shoulder.y - hip.y)) * 180) / Math.PI;
  details.push(`torso ${torsoLean.toFixed(0)}° off vertical`);

  // Knee angles (hip–knee–ankle), averaging whichever legs are in frame.
  const kneeAngles: number[] = [];
  for (const [h, k, a] of [
    [P.LEFT_HIP, P.LEFT_KNEE, P.LEFT_ANKLE],
    [P.RIGHT_HIP, P.RIGHT_KNEE, P.RIGHT_ANKLE],
  ] as const) {
    const hip2 = get(h), knee = get(k), ankle = get(a);
    if (hip2 && knee && ankle) kneeAngles.push(landmarkAngle(hip2, knee, ankle));
  }
  const knee = kneeAngles.length
    ? kneeAngles.reduce((s, v) => s + v, 0) / kneeAngles.length
    : undefined;
  if (knee !== undefined) details.push(`knees ${knee.toFixed(0)}°`);

  // Raised arms: wrist above its shoulder (y grows downward).
  const armsUp = (
    [
      [P.LEFT_SHOULDER, P.LEFT_WRIST],
      [P.RIGHT_SHOULDER, P.RIGHT_WRIST],
    ] as const
  ).filter(([sh, wr]) => {
    const a = get(sh), b = get(wr);
    return a && b && b.y < a.y;
  }).length;
  if (armsUp > 0) details.push(armsUp === 2 ? "both arms raised 💪" : "one arm raised 💪");

  if (torsoLean > 55) return { emoji: "🛏️", label: "Lying down", details };
  if (knee === undefined) {
    return {
      emoji: "🧍",
      label: "Upright — legs out of frame",
      details: [...details, "can't split sitting vs standing without the knees"],
    };
  }
  if (knee < 130) return { emoji: "🪑", label: "Sitting", details };
  if (knee > 150) return { emoji: "🧍", label: "Standing", details };
  return { emoji: "🏃", label: "Crouched / mid-motion", details };
}

export default function PoseScreen() {
  const [uri, setUri] = useState<string | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [landmarks, setLandmarks] = useState<any[]>([]);
  const [status, setStatus] = useState("Pick an image");
  const [loading, setLoading] = useState(false);

  async function run(u: string) {
    setUri(u);
    setLandmarks([]);
    setLoading(true);
    setStatus("Detecting…");
    try {
      setSize(await imageSize(u));
      const t = Date.now();
      const found = await NitroPose.detect(u);
      setLandmarks(found);
      setStatus(`${found.length} landmarks · ${Date.now() - t} ms`);
    } catch (e: any) {
      setStatus("Error ❌");
      Alert.alert("Error", e.message);
    }
    setLoading(false);
  }

  const visible = landmarks.filter((l) => l.inFrameLikelihood > 0.3);
  const highlights = landmarks.filter((l) => NAMES[l.type] !== undefined);
  const verdict = landmarks.length > 0 ? classifyPose(landmarks) : null;

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <TitleBlock name="@nitro-mlkit/pose-detection" tagline="33 body landmarks · overlaid on the image" />
      <SamplePicker samples={POSES} accent={ACCENT} onPick={run} disabled={loading} />

      {uri && (
        <AnnotatedImage
          uri={uri}
          imageW={size.w}
          imageH={size.h}
          accent={ACCENT}
          points={visible}
          dotSize={9}
        />
      )}

      <View style={s.statusRow}>
        {loading && <ActivityIndicator color={ACCENT} />}
        <Text style={s.status}>{status}</Text>
      </View>

      {verdict && (
        <Card>
          <View style={s.verdictRow}>
            <Text style={s.verdictEmoji}>{verdict.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.verdictLabel}>{verdict.label}</Text>
              <Text style={s.verdictDetail}>{verdict.details.join(" · ")}</Text>
            </View>
          </View>
        </Card>
      )}

      {highlights.length > 0 && (
        <Card>
          {highlights.map((l, i) => (
            <View key={i} style={s.row}>
              <Text style={T.label}>{NAMES[l.type]}</Text>
              <View style={s.rowRight}>
                <Text style={T.mono}>({l.x.toFixed(0)}, {l.y.toFixed(0)})</Text>
                <Pill accent={l.inFrameLikelihood > 0.5 ? ACCENT : C.faint}>
                  {(l.inFrameLikelihood * 100).toFixed(0)}%
                </Pill>
              </View>
            </View>
          ))}
        </Card>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { padding: 20, paddingTop: 16, paddingBottom: 40 },
  statusRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginVertical: 14 },
  status: { fontFamily: F.bodySemi, color: C.gold, fontSize: 14, textAlign: "center" },
  verdictRow: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 4 },
  verdictEmoji: { fontSize: 40 },
  verdictLabel: { fontFamily: F.display, fontSize: 17, color: C.ink },
  verdictDetail: { fontFamily: F.body, fontSize: 13, color: C.dim, marginTop: 2 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.borderSoft },
  rowRight: { flexDirection: "row", alignItems: "center", gap: 10 },
});

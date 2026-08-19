import type { PoseLandmark } from "./specs/PoseDetector.nitro";

/**
 * The 33 BlazePose landmark indices, by name. Same ordinals on Android and
 * iOS (the native side maps iOS's string types back to these).
 */
export const PoseLandmarkType = {
  NOSE: 0,
  LEFT_EYE_INNER: 1,
  LEFT_EYE: 2,
  LEFT_EYE_OUTER: 3,
  RIGHT_EYE_INNER: 4,
  RIGHT_EYE: 5,
  RIGHT_EYE_OUTER: 6,
  LEFT_EAR: 7,
  RIGHT_EAR: 8,
  MOUTH_LEFT: 9,
  MOUTH_RIGHT: 10,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_PINKY: 17,
  RIGHT_PINKY: 18,
  LEFT_INDEX: 19,
  RIGHT_INDEX: 20,
  LEFT_THUMB: 21,
  RIGHT_THUMB: 22,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
  LEFT_HEEL: 29,
  RIGHT_HEEL: 30,
  LEFT_FOOT_INDEX: 31,
  RIGHT_FOOT_INDEX: 32,
} as const;

export type PoseLandmarkTypeName = keyof typeof PoseLandmarkType;

/**
 * Finds a landmark by type in a detect() result.
 *
 * Don't index the array by position — the order of `landmarks` is not part of
 * the contract, only each landmark's `type` is.
 */
export function getLandmark(
  landmarks: PoseLandmark[],
  type: number,
): PoseLandmark | undefined {
  return landmarks.find((lm) => lm.type === type);
}

/**
 * The 2D angle at `mid` formed by the segments mid→first and mid→last, in
 * degrees [0, 180]. This is the primitive of ML Kit's official
 * pose-classification recipe: a squat is a knee angle
 * (hip–knee–ankle) under ~120°, a raised arm is an elbow angle
 * (shoulder–elbow–wrist) near 180° with the wrist above the shoulder, etc.
 *
 * Uses x/y only: `z` is depth relative to the hips and would bend joint
 * angles that are actually planar in the photo.
 */
export function landmarkAngle(
  first: PoseLandmark,
  mid: PoseLandmark,
  last: PoseLandmark,
): number {
  const radians =
    Math.atan2(last.y - mid.y, last.x - mid.x) -
    Math.atan2(first.y - mid.y, first.x - mid.x);
  let degrees = Math.abs((radians * 180) / Math.PI);
  if (degrees > 180) degrees = 360 - degrees;
  return degrees;
}

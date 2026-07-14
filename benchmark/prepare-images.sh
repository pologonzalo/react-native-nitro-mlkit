#!/usr/bin/env bash
#
# prepare-images.sh — download a reproducible set of real face photos and load
# them into the example app's INTERNAL files dir on a running Android device.
#
# Why the internal dir: Android scoped storage (API 30+) blocks an app from
# reading files that `adb push` wrote under Android/data/<pkg>. The app CAN
# always read its own /data/data/<pkg>/files, so we stream the images in there
# via `run-as` + base64 (binary-safe).
#
# Source: randomuser.me portraits — real frontal faces at deterministic URLs
# (portraits/men/{0-99}.jpg, women/{0-99}.jpg), no API key, fully reproducible.
#
# Usage:
#   ./prepare-images.sh [COUNT] [PACKAGE]
#     COUNT    number of distinct faces to fetch (default 50, max 200)
#     PACKAGE  Android applicationId (default com.nitromlkit.example)
#
# Requires: adb on PATH, a booted device/emulator, the example app installed
# (debuggable), and curl.
set -euo pipefail

COUNT="${1:-50}"
PKG="${2:-com.nitromlkit.example}"
TMP="$(mktemp -d)"
DEST_DIR="files/bench"

echo "→ Downloading $COUNT face photos to $TMP …"
i=0
n=0
while [ "$n" -lt "$COUNT" ]; do
  half=$((i % 100))
  if [ $((i / 100 % 2)) -eq 0 ]; then gender="men"; else gender="women"; fi
  out="$TMP/face_$(printf '%03d' "$n").jpg"
  if curl -fsSL -o "$out" "https://randomuser.me/api/portraits/$gender/$half.jpg" --max-time 20 \
     && file "$out" | grep -q JPEG; then
    n=$((n + 1))
  fi
  i=$((i + 1))
  [ "$i" -gt 400 ] && { echo "ERROR: could not fetch enough images"; exit 1; }
done
echo "  got $n valid JPEGs"

echo "→ Streaming images into $PKG internal files dir (run-as + base64) …"
adb shell "run-as $PKG mkdir -p $DEST_DIR"
for f in "$TMP"/face_*.jpg; do
  name="$(basename "$f")"
  base64 < "$f" | adb shell "run-as $PKG sh -c 'base64 -d > $DEST_DIR/$name'"
done

got="$(adb shell "run-as $PKG ls $DEST_DIR" | tr -d '\r' | grep -c '\.jpg' || true)"
echo "✓ Done — $got images in /data/data/$PKG/$DEST_DIR"
echo "  (the benchmark screen cycles these up to its GALLERY_SIZE)"
rm -rf "$TMP"

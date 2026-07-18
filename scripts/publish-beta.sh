#!/usr/bin/env bash
# Publica los 10 paquetes iOS-completos de @nitro-mlkit como beta.
# Requiere estar logueado antes:  npm login   (verifica con: npm whoami)
# Uso:  bash scripts/publish-beta.sh
set -euo pipefail

cd "$(dirname "$0")/.."

PKGS=(
  barcode-scanning
  digital-ink
  face-detection
  image-labeling
  language-id
  object-detection
  pose-detection
  selfie-segmentation
  text-recognition
  translation
)

echo "Autenticado como: $(npm whoami)"
echo "Se publicarán ${#PKGS[@]} paquetes con --tag beta --access public"
read -r -p "¿Continuar? [y/N] " ok
[ "$ok" = "y" ] || { echo "Abortado."; exit 1; }

published=()
skipped=()
for b in "${PKGS[@]}"; do
  echo "=== publicando @nitro-mlkit/$b ==="
  # Tolerate an already-published version (E403): skip it and keep going
  # instead of aborting the whole run. The `if` also shields us from `set -e`.
  if ( cd "packages/$b" && npm publish --access public --tag beta ); then
    published+=("$b")
  else
    echo "  ⚠️  omitido @nitro-mlkit/$b (¿esa versión ya está publicada? súbela para republicar)"
    skipped+=("$b")
  fi
done

echo
echo "Publicados (${#published[@]}): ${published[*]:-ninguno}"
echo "Omitidos   (${#skipped[@]}): ${skipped[*]:-ninguno}"
echo "Verifica:  npm view @nitro-mlkit/face-detection dist-tags"

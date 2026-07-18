#!/usr/bin/env bash
# Publica los 9 paquetes iOS-completos de @nitro-mlkit como beta.
# Requiere estar logueado antes:  npm login   (verifica con: npm whoami)
# Uso:  bash scripts/publish-beta.sh
set -euo pipefail

cd "$(dirname "$0")/.."

PKGS=(
  barcode-scanning
  digital-ink
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

for b in "${PKGS[@]}"; do
  echo "=== publicando @nitro-mlkit/$b ==="
  ( cd "packages/$b" && npm publish --access public --tag beta )
done

echo "Hecho. Verifica:  npm view @nitro-mlkit/text-recognition dist-tags"

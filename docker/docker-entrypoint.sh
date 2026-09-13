#!/bin/bash

# Check if STORAGE_DIR is set
if [ -z "$STORAGE_DIR" ]; then
    echo "================================================================"
    echo "⚠️  ⚠️  ⚠️  WARNING: STORAGE_DIR environment variable is not set! ⚠️  ⚠️  ⚠️"
    echo ""
    echo "Not setting this will result in data loss on container restart since"
    echo "the application will not have a persistent storage location."
    echo "It can also result in weird errors in various parts of the application."
    echo ""
    echo "⚠️  ⚠️  ⚠️  WARNING: STORAGE_DIR environment variable is not set! ⚠️  ⚠️  ⚠️"
    echo "================================================================"
fi

# The models baked into the image at build time have to be copied into the
# storage volume, because that is where the application looks for them and a
# volume hides anything the image left at the same path. Copied rather than
# symlinked so an operator can replace one without rebuilding, and never
# overwriting: a model already in the volume is the one in use.
#
# Whisper is skipped. It is read straight out of the image through
# WHISPER_PREBUILT_MODEL_DIR, and at 1.5GB it would otherwise be duplicated into
# every deployment's data volume.
seed_prebuilt_models() {
  prebuilt="${NEXUSAI_PREBUILT_MODELS_DIR:-/app/prebuilt-models}"
  target="${STORAGE_DIR:-/app/server/storage}/models"
  [ -d "$prebuilt" ] || return 0

  mkdir -p "$target"
  copied=""
  for src in "$prebuilt"/MintplexLabs/*/ "$prebuilt"/Xenova/*/ "$prebuilt"/pricing "$prebuilt"/tesseract; do
    [ -e "$src" ] || continue
    case "$src" in */Xenova/whisper-large/) continue ;; esac

    case "$src" in
      */Xenova/*) dest="$target/Xenova/$(basename "$src")" ;;
      */MintplexLabs/*) dest="$target/MintplexLabs/$(basename "$src")" ;;
      *) dest="$target/$(basename "$src")" ;;
    esac
    [ -e "$dest" ] && continue

    mkdir -p "$(dirname "$dest")"
    cp -r "$src" "$dest" && copied="$copied $(basename "$src")"
  done

  [ -n "$copied" ] && echo "[entrypoint] seeded from the image:${copied}"
  return 0
}
seed_prebuilt_models

{
  cd /app/server/ &&
    # Disable Prisma CLI telemetry (https://www.prisma.io/docs/orm/tools/prisma-cli#how-to-opt-out-of-data-collection)
    export CHECKPOINT_DISABLE=1 &&
    npx prisma generate --schema=./prisma/schema.prisma &&
    npx prisma migrate deploy --schema=./prisma/schema.prisma &&
    node /app/server/index.js
} &
{ node /app/collector/index.js; } &
wait -n
exit $?

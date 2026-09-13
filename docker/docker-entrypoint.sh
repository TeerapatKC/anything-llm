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
# Whether a model already in the volume should give way to the image's copy. One
# this entrypoint seeded carries the revision it came from, and is replaced when the
# image now carries another. One without that marker was put there by someone else
# and stays - except the single known-bad file an image seeded before markers
# existed: the 235MB onnxruntime 1.20 export of multilingual-e5-small, which the
# app's onnxruntime 1.14 cannot load, so no document could ever be embedded.
stale_prebuilt() {
  src="$1"; dest="$2"
  [ -f "$src/.prebuilt-revision" ] || return 1
  if [ -f "$dest/.prebuilt-revision" ]; then
    cmp -s "$src/.prebuilt-revision" "$dest/.prebuilt-revision" && return 1
    return 0
  fi
  case "$dest" in
    */MintplexLabs/multilingual-e5-small)
      [ "$(stat -c%s "$dest/onnx/model_quantized.onnx" 2>/dev/null)" = "235052531" ] && return 0 ;;
  esac
  return 1
}

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
    if [ -e "$dest" ]; then
      stale_prebuilt "$src" "$dest" || continue
      echo "[entrypoint] replacing $(basename "$dest") with the image's revision"
      rm -rf "$dest"
    fi

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

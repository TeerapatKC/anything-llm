#!/bin/sh
# Downloads everything the application would otherwise fetch from the internet the
# first time a feature is used, so a host with no route out has all of it already.
#
# Runs as the one-shot `nexusai-models` job in the compose files, and from
# docker/bundle.sh into the bundle's models/nexusai. The app waits for the job to
# complete and mounts the result read-only at /app/prebuilt-models.
#
# Not baked into the app image any more. It was 1.76GB of the image - over a third
# of what docker save wrote - and every code update carried it across to the
# customer again even though it had not changed. Kept beside the image instead, the
# same way the llama.cpp and stable-diffusion.cpp weights already were.
#
# The destination is deliberately NOT inside /app/server/storage: that path is a
# volume at runtime. docker-entrypoint.sh copies what is missing out of the mount
# and into the storage volume on each start instead.
#
# Re-running is cheap: a model already at its pinned revision is left alone, and a
# file is downloaded to .part and renamed only once it is complete, so an
# interrupted run never leaves a truncated file that looks finished. With
# NEXUSAI_OFFLINE=1 nothing is downloaded - a missing file is named and the job
# fails, which keeps the app from starting without it.
#
# Revisions are pinned. An air-gapped product that cannot be rebuilt to the same
# bytes is not much of a product, and "main" moves.
set -eu

DEST="${1:-/models}"
HF="${HF_ENDPOINT:-https://huggingface.co}"
OFFLINE="${NEXUSAI_OFFLINE:-0}"

say() { echo "[prefetch] $*"; }
die() { echo "[prefetch] $*" >&2; exit 1; }

refuse_offline() {
  [ "$OFFLINE" = "1" ] || return 0
  die "missing $1 in offline mode; refusing to download. Rebuild or finish copying the bundle's models/nexusai."
}

# One file from a Hugging Face repository, straight into the transformers.js
# cache layout: <dest>/<org>/<name>/<path>.
hf_file() {
  repo="$1"; rev="$2"; file="$3"
  out="${DEST}/${repo}/${file}"
  refuse_offline "${repo}/${file}"
  mkdir -p "$(dirname "$out")"
  curl --fail --silent --show-error --location --retry 5 --retry-all-errors --retry-delay 5 \
    --connect-timeout 30 "${HF}/${repo}/resolve/${rev}/${file}" --output "${out}.part"
  mv -f "${out}.part" "$out"
}

# Every file transformers.js opens for one of these models. Listed rather than
# globbed because the repositories also hold full-precision and framework-specific
# weights that are never loaded and would multiply the download.
hf_model() {
  repo="$1"; rev="$2"; shift 2
  marker="${DEST}/${repo}/.prebuilt-revision"

  current=""
  [ -f "$marker" ] && current="$(cat "$marker")"
  if [ "$current" = "$rev" ]; then
    missing=""
    for f in "$@"; do [ -s "${DEST}/${repo}/${f}" ] || missing="${missing} ${f}"; done
    if [ -z "$missing" ]; then
      say "have ${repo}"
      return 0
    fi
  fi

  say "${repo}"
  # Dropped first, so a run that dies half way through a new revision is not
  # mistaken for a finished one on the next start.
  rm -f "$marker"
  for f in "$@"; do
    # Only a file already at this revision may be kept; one from another revision
    # has the same name and different bytes.
    if [ "$current" = "$rev" ] && [ -s "${DEST}/${repo}/${f}" ]; then continue; fi
    hf_file "$repo" "$rev" "$f"
  done
  # Read by docker-entrypoint.sh: a volume holding a copy seeded from another
  # revision gets this one instead, so fixing a model here reaches existing installs.
  printf '%s\n' "$rev" > "$marker"
}

mkdir -p "$DEST"

TEXT_FILES="config.json tokenizer.json tokenizer_config.json special_tokens_map.json vocab.txt"

# The sole built-in embedder. Download its exact ONNX and tokenizer files ahead of
# time so first document uploads also work without internet access.
#
# The revision matters more than it looks. e8caab1 carries a 235MB onnxruntime 1.20
# optimizer export - fused com.microsoft ops, ai.onnx.ml opset 5 - which the
# onnxruntime-node 1.14 inside @xenova/transformers refuses; its wasm fallback then
# hangs and no document is ever embedded. This revision's file is a plain opset-11
# export, the same one upstream AnythingLLM serves, and loads offline in that runtime.
hf_model MintplexLabs/multilingual-e5-small 4fd851a90ba06323d9428739c08ff91b09a1bfbe \
  config.json tokenizer.json tokenizer_config.json special_tokens_map.json \
  sentencepiece.bpe.model onnx/model_quantized.onnx

# The native reranker, used when a workspace turns reranking on.
hf_model Xenova/ms-marco-MiniLM-L-6-v2 a09144355adeed5f58c8ed011d209bf8ee5a1fec \
  $TEXT_FILES quantize_config.json onnx/model_quantized.onnx

# Transcription of uploaded audio and video, in the collector. 1.5GB of the total.
hf_model Xenova/whisper-large 451f4b004423a67138e1d510de9c7cd904c259e7 \
  config.json tokenizer.json tokenizer_config.json preprocessor_config.json \
  generation_config.json onnx/encoder_model_quantized.onnx \
  onnx/decoder_model_merged_quantized.onnx

# Size floors rather than checksums: the point is to catch an HTML error page or a
# truncated transfer being kept, which is what a silent CDN failure looks like. Run
# on every start, so a bundle copied across incompletely fails here, by name.
say "checking sizes"
for f in \
  "MintplexLabs/multilingual-e5-small/onnx/model_quantized.onnx:400000000" \
  "Xenova/ms-marco-MiniLM-L-6-v2/onnx/model_quantized.onnx:20000000" \
  "Xenova/whisper-large/onnx/encoder_model_quantized.onnx:500000000" \
  "Xenova/whisper-large/onnx/decoder_model_merged_quantized.onnx:800000000"
do
  path="${DEST}/${f%:*}"; min="${f##*:}"
  actual="$(stat -c%s "$path")"
  [ "$actual" -gt "$min" ] ||
    die "${path} is ${actual} bytes, expected more than ${min}"
done

echo "ca456c06b3a9505ddfd9131408916dd79290368331e7d76bb621f1cba6bc8665  ${DEST}/MintplexLabs/multilingual-e5-small/onnx/model_quantized.onnx" | sha256sum -c -

# OCR language data. tesseract.js looks for <cache>/<lang>.traineddata and, not
# finding it, fetches a gzipped copy from a CDN - so scanned PDFs and images are
# another feature that quietly needs the internet. The app asks for LSTM_ONLY,
# which is the "_best_int" variant.
#
# English is the default; Thai is here because it is what this deployment reads.
# Add more by name - each is a couple of megabytes.
#
# Fetched from the npm registry, with jsdelivr - the CDN serving the same package -
# as the fallback. jsdelivr alone failed a build on a network that blocks it
# ("Failed to connect to cdn.jsdelivr.net port 443 after 0 ms"). The version is
# pinned, and the file is byte-identical from either source.
say "OCR language data"
mkdir -p "${DEST}/tesseract"
TESSDATA_VERSION="${TESSDATA_VERSION:-1.0.0}"
for lang in ${OCR_LANGUAGES:-eng tha}; do
  # Cached uncompressed: that is the name and the form tesseract.js reads back.
  out="${DEST}/tesseract/${lang}.traineddata"
  if [ -s "$out" ]; then
    say "have ${lang}.traineddata"
    continue
  fi
  refuse_offline "tesseract/${lang}.traineddata"
  tgz="${DEST}/tesseract/${lang}.tgz"
  if curl --fail --silent --show-error --location --retry 3 --retry-delay 5 \
       --connect-timeout 30 --output "$tgz" \
       "https://registry.npmjs.org/@tesseract.js-data/${lang}/-/${lang}-${TESSDATA_VERSION}.tgz" \
     && tar -xzOf "$tgz" "package/4.0.0_best_int/${lang}.traineddata.gz" | gunzip > "${out}.part"; then
    :
  else
    say "npm registry failed for ${lang} - trying jsdelivr"
    curl --fail --silent --show-error --location --retry 3 --retry-delay 5 \
      --connect-timeout 30 \
      "https://cdn.jsdelivr.net/npm/@tesseract.js-data/${lang}@${TESSDATA_VERSION}/4.0.0_best_int/${lang}.traineddata.gz" \
      | gunzip > "${out}.part"
  fi
  rm -f "$tgz"
  [ -s "${out}.part" ] || die "${lang}.traineddata is empty"
  mv -f "${out}.part" "$out"
done

# Model pricing. The app refreshes this from models.dev at boot with a 5 second
# timeout and a 3 day cache; seeding the cache means an offline instance shows
# real numbers instead of blanks, and stops it retrying on every start. Fetched
# once: after that the app keeps its own copy current whenever it has a network.
if [ -s "${DEST}/pricing/model-pricing.json" ]; then
  say "have model pricing"
elif [ "$OFFLINE" = "1" ]; then
  # Not fatal. Pricing is a display detail, unlike everything above it.
  say "no model pricing in offline mode - the instance will show none, and work"
else
  say "model pricing"
  mkdir -p "${DEST}/pricing"
  if curl --fail --silent --show-error --location --retry 3 --retry-delay 3 --connect-timeout 20 \
    "https://models.dev/api.json" --output "${DEST}/pricing/model-pricing.json.part"; then
    mv -f "${DEST}/pricing/model-pricing.json.part" "${DEST}/pricing/model-pricing.json"
    date +%s000 > "${DEST}/pricing/.cached_at"
  else
    say "could not fetch model pricing - the instance will show none, and work"
    rm -f "${DEST}/pricing/model-pricing.json.part"
  fi
fi

say "done: $(du -sh "$DEST" | cut -f1)"

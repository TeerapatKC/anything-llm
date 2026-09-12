#!/bin/sh
# Downloads everything the application would otherwise fetch from the internet the
# first time a feature is used, so a host with no route out has all of it already.
#
# Run at image build time. The destination is deliberately NOT inside
# /app/server/storage: that path is a volume at runtime, and a volume mounted over
# a directory hides whatever the image put there. docker-entrypoint.sh copies what
# is missing out of here and into the volume on each start instead.
#
# What lives here and why it is not covered by docker/bundle.sh: these are pulled
# by transformers.js and by the app itself, into the app's own storage directory -
# a different library, a different layout and a different moment from the model
# servers, whose weights the bundle does carry.
#
# Revisions are pinned. An air-gapped product that cannot be rebuilt to the same
# bytes is not much of a product, and "main" moves.
set -eu

DEST="${1:?usage: prefetch-models.sh <destination-dir>}"
HF="${HF_ENDPOINT:-https://huggingface.co}"

say() { echo "[prefetch] $*"; }

# One file from a Hugging Face repository, straight into the transformers.js
# cache layout: <dest>/<org>/<name>/<path>.
hf_file() {
  repo="$1"; rev="$2"; file="$3"
  out="${DEST}/${repo}/${file}"
  mkdir -p "$(dirname "$out")"
  curl --fail --silent --show-error --location --retry 5 --retry-all-errors --retry-delay 5 \
    --connect-timeout 30 "${HF}/${repo}/resolve/${rev}/${file}" --output "$out"
}

# Every file transformers.js opens for one of these models. Listed rather than
# globbed because the repositories also hold full-precision and framework-specific
# weights that are never loaded and would multiply the image size.
hf_model() {
  repo="$1"; rev="$2"; shift 2
  say "${repo}"
  for f in "$@"; do hf_file "$repo" "$rev" "$f"; done
}

TEXT_FILES="config.json tokenizer.json tokenizer_config.json special_tokens_map.json vocab.txt"

# The default native embedder. Every document upload needs it, so without this an
# air-gapped install fails at the first thing anyone tries to do.
hf_model Xenova/all-MiniLM-L6-v2 751bff37182d3f1213fa05d7196b954e230abad9 \
  $TEXT_FILES onnx/model_quantized.onnx

# The other native embedder, offered in the same dropdown.
hf_model Xenova/nomic-embed-text-v1 2f98ed5b9768f159d9cc55782f2e867abbc8d6ac \
  $TEXT_FILES quantize_config.json onnx/model_quantized.onnx

# The native reranker, used when a workspace turns reranking on.
hf_model Xenova/ms-marco-MiniLM-L-6-v2 a09144355adeed5f58c8ed011d209bf8ee5a1fec \
  $TEXT_FILES quantize_config.json onnx/model_quantized.onnx

# Transcription of uploaded audio and video, in the collector. 1.5GB of the total.
hf_model Xenova/whisper-large 451f4b004423a67138e1d510de9c7cd904c259e7 \
  config.json tokenizer.json tokenizer_config.json preprocessor_config.json \
  generation_config.json onnx/encoder_model_quantized.onnx \
  onnx/decoder_model_merged_quantized.onnx

# Size floors rather than checksums: the point is to catch an HTML error page or a
# truncated transfer being baked into the image, which is what a silent CDN
# failure looks like.
say "checking sizes"
for f in \
  "Xenova/all-MiniLM-L6-v2/onnx/model_quantized.onnx:20000000" \
  "Xenova/nomic-embed-text-v1/onnx/model_quantized.onnx:100000000" \
  "Xenova/ms-marco-MiniLM-L-6-v2/onnx/model_quantized.onnx:20000000" \
  "Xenova/whisper-large/onnx/encoder_model_quantized.onnx:500000000" \
  "Xenova/whisper-large/onnx/decoder_model_merged_quantized.onnx:800000000"
do
  path="${DEST}/${f%:*}"; min="${f##*:}"
  actual="$(stat -c%s "$path")"
  [ "$actual" -gt "$min" ] || {
    echo "[prefetch] ${path} is ${actual} bytes, expected more than ${min}" >&2
    exit 1
  }
done

# OCR language data. tesseract.js looks for <cache>/<lang>.traineddata and, not
# finding it, fetches a gzipped copy from a CDN - so scanned PDFs and images are
# another feature that quietly needs the internet. The app asks for LSTM_ONLY,
# which is the "_best_int" variant.
#
# English is the default; Thai is here because it is what this deployment reads.
# Add more by name - each is a couple of megabytes.
say "OCR language data"
mkdir -p "${DEST}/tesseract"
for lang in ${OCR_LANGUAGES:-eng tha}; do
  curl --fail --silent --show-error --location --retry 5 --retry-all-errors     --retry-delay 5 --connect-timeout 30     "https://cdn.jsdelivr.net/npm/@tesseract.js-data/${lang}/4.0.0_best_int/${lang}.traineddata.gz"     --output "${DEST}/tesseract/${lang}.traineddata.gz"
  # Cached uncompressed: that is the name and the form tesseract.js reads back.
  gunzip -f "${DEST}/tesseract/${lang}.traineddata.gz"
  [ -s "${DEST}/tesseract/${lang}.traineddata" ] || {
    echo "[prefetch] ${lang}.traineddata is empty" >&2; exit 1; }
done

# Model pricing. The app refreshes this from models.dev at boot with a 5 second
# timeout and a 3 day cache; seeding the cache means an offline instance shows
# real numbers instead of blanks, and stops it retrying on every start.
say "model pricing"
mkdir -p "${DEST}/pricing"
if curl --fail --silent --show-error --location --retry 3 --retry-delay 3 --connect-timeout 20 \
  "https://models.dev/api.json" --output "${DEST}/pricing/model-pricing.json"; then
  date +%s000 > "${DEST}/pricing/.cached_at"
else
  # Not fatal. Pricing is a display detail, unlike everything above it.
  say "could not fetch model pricing - the instance will show none, and work"
  rm -f "${DEST}/pricing/model-pricing.json"
fi

say "done: $(du -sh "$DEST" | cut -f1)"

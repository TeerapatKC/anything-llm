#!/bin/sh
# Downloads the GGUF files for the models named in LLAMACPP_MODELS and writes the
# preset file llama-server reads in router mode, then exits. The llamacpp service
# waits for this to complete.
#
# The preset is generated here rather than kept as a static file so it can never
# describe a model whose weights are missing: a model appears in models.ini only
# once its files are on disk.
#
# Re-running is cheap: a file already in the volume is left alone, and an
# interrupted download resumes from where it stopped. Removing a name from
# LLAMACPP_MODELS drops it from the preset on the next run, but leaves its file in
# the volume - delete that by hand if you want the space back.
set -eu

DEST="/models"
INI="${DEST}/models.ini"
MODELS="${LLAMACPP_MODELS-qwen3.8-27b,gpt-oss-20b,gemma-4-12b}"
# Shared by every preset. Raise it for longer conversations, at the cost of KV
# cache memory on every model that gets loaded.
CTX="${LLAMACPP_CTX:-8192}"

fetch() {
  repo="$1"
  name="$2"
  if [ -f "${DEST}/${name}" ]; then
    echo "[models] have ${name}"
    return 0
  fi

  # Downloaded to .part and renamed only on success, so an interrupted run never
  # leaves a truncated file that the server would then try to load.
  part="${DEST}/${name}.part"
  resume=""
  if [ -f "${part}" ]; then
    resume="-C -"
  fi

  echo "[models] downloading ${name} from ${repo}"
  # shellcheck disable=SC2086 # $resume is a deliberate two-token flag or nothing
  if ! curl -fL --retry 5 --retry-delay 5 ${resume} \
    -o "${part}" "https://huggingface.co/${repo}/resolve/main/${name}"; then
    echo "[models] failed to download ${name} from ${repo}." >&2
    echo "[models] A 401 means the repository is gated - set HF_TOKEN, or pick" >&2
    echo "[models] another quantization with the *_FILE variables." >&2
    return 1
  fi
  mv "${part}" "${DEST}/${name}"
}

: > "${INI}.part"

if [ -z "${MODELS}" ]; then
  echo "[models] LLAMACPP_MODELS is empty - writing an empty preset and"
  echo "[models] downloading nothing. llama-server will start in router mode"
  echo "[models] with no models to serve."
  mv "${INI}.part" "${INI}"
  exit 0
fi

for model in $(echo "${MODELS}" | tr ',' ' '); do
  mmproj=""
  case "${model}" in
    qwen3.8-27b)
      repo="unsloth/Qwen3.8-27B-GGUF"
      file="${LLAMACPP_QWEN_FILE:-Qwen3.8-27B-UD-Q4_K_XL.gguf}"
      ;;
    gpt-oss-20b)
      # gpt-oss ships natively in MXFP4, so there is one file rather than a
      # ladder of quantizations. The eagle3 files in that repository are
      # speculative-decoding drafts, not the model.
      repo="ggml-org/gpt-oss-20b-GGUF"
      file="${LLAMACPP_GPTOSS_FILE:-gpt-oss-20b-MXFP4.gguf}"
      ;;
    gemma-4-12b)
      # Google's own quantization-aware-training build: trained to be quantized,
      # so it loses less at 4 bits than a plain post-hoc quantization would.
      # The mmproj file is the vision encoder - without it the model is text-only.
      repo="google/gemma-4-12B-it-qat-q4_0-gguf"
      file="${LLAMACPP_GEMMA_FILE:-gemma-4-12b-it-qat-q4_0.gguf}"
      mmproj="${LLAMACPP_GEMMA_MMPROJ:-mmproj-gemma-4-12b-it-qat-q4_0.gguf}"
      ;;
    *)
      echo "[models] unknown model '${model}'." >&2
      echo "[models] Known names: qwen3.8-27b, gpt-oss-20b, gemma-4-12b." >&2
      exit 1
      ;;
  esac

  fetch "${repo}" "${file}"
  if [ -n "${mmproj}" ]; then
    fetch "${repo}" "${mmproj}"
  fi

  # Section name becomes the model id over the API, and the keys are
  # llama-server's own long flags without the leading dashes.
  {
    echo "[${model}]"
    echo "model = ${DEST}/${file}"
    echo "ctx-size = ${CTX}"
    if [ -n "${mmproj}" ]; then
      echo "mmproj = ${DEST}/${mmproj}"
    fi
    echo
  } >> "${INI}.part"
done

mv "${INI}.part" "${INI}"

echo "[models] wrote ${INI}:"
cat "${INI}"

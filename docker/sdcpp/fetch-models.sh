#!/bin/sh
# Fetches the four files sd-server needs for FLUX.1-schnell into the models
# volume, then exits. The sdcpp service waits for this to complete.
#
# Everything comes from second-state/FLUX.1-schnell-GGUF, which carries the
# quantized transformer, the VAE and both text encoders in one ungated Apache-2.0
# repository. black-forest-labs/FLUX.1-schnell is the upstream source but it is
# gated - an unauthenticated fetch there returns 401 - so pulling the VAE from it
# would drag a Hugging Face token into a setup that otherwise needs none.
#
# Re-running is cheap: a file already in the volume is left alone, and an
# interrupted download resumes from where it stopped.
set -eu

REPO="${SDCPP_MODEL_REPO:-second-state/FLUX.1-schnell-GGUF}"
BASE="https://huggingface.co/${REPO}/resolve/main"
DEST="/models"

fetch() {
  name="$1"
  if [ -f "${DEST}/${name}" ]; then
    echo "[models] have ${name}"
    return 0
  fi

  # Downloaded to .part and renamed only on success, so an interrupted run never
  # leaves a truncated file that looks complete to the next one.
  part="${DEST}/${name}.part"
  resume=""
  [ -f "${part}" ] && resume="-C -"

  echo "[models] downloading ${name}"
  # shellcheck disable=SC2086 # $resume is a deliberate two-token flag or nothing
  if ! curl -fL --retry 5 --retry-delay 5 ${resume} -o "${part}" "${BASE}/${name}"; then
    echo "[models] failed to download ${name} from ${REPO}." >&2
    echo "[models] A 401 here means the repository is gated - set SDCPP_MODEL_REPO" >&2
    echo "[models] to an open mirror, or fetch the file by hand into the volume." >&2
    return 1
  fi
  mv "${part}" "${DEST}/${name}"
}

fetch "${SDCPP_DIFFUSION_MODEL:-flux1-schnell-Q4_0.gguf}"
fetch "${SDCPP_T5XXL:-t5xxl_fp16.safetensors}"
fetch "clip_l.safetensors"
fetch "ae.safetensors"

echo "[models] ready:"
ls -la "${DEST}"

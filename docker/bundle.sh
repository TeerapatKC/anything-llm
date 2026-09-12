#!/usr/bin/env bash
# Builds everything a DGX Spark needs and writes it into one directory, so the
# machine it is carried to never opens a network connection.
#
# That is the whole point of this script. The rest of the tooling assumes the
# deployment host can reach a registry and Hugging Face; an air-gapped Spark can
# reach neither, and the failure is not obvious - the stack comes up, the model
# servers sit in "created", and the reason is buried in a downloader's log.
#
# Run it on a machine that does have a network. Both targets work:
#
#   Windows + Docker Desktop   from Git Bash. Cross-builds arm64 under emulation,
#                              so the app image takes the better part of an hour.
#   A DGX Spark with a network  builds natively, in minutes.
#
# Everything it produces is for linux/arm64, because the deployment target always
# is. The bundle looks like this:
#
#   bundle/
#     docker/          the compose files, the installer and the voices
#     images/          every container image, saved as a tarball
#     models/          the GGUF weights and the Hugging Face cache
#     offline.env      the settings that point the stack at the two above
#     MANIFEST.txt     what is in here, and what to run on the Spark
#
# Copy the whole directory across, then on the Spark:
#
#   bundle/docker/install.sh --offline
#
# Nothing in the bundle is authored here - it is all built or downloaded - so it
# is ignored by git and safe to delete once it has been transferred.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
REPO_ROOT="$(pwd)"

OUT="docker/bundle"
SERVICES="llm,image,speech"
# The catalogue docker/llamacpp/fetch-models.sh knows. Narrow it to shrink the
# bundle: the three together are about 37GB.
MODELS="qwen3.8-27b,gpt-oss-20b,gemma-4-12b"
SKIP_BUILD=false
SKIP_IMAGES=false
SKIP_MODELS=false
CHECKSUMS=false
DRY_RUN=false
APP_IMAGE_REF="nexusai:arm64"
STT_IMAGE_REF="nexusai-stt:arm64"
TTS_IMAGE_REF="nexusai-tts:arm64"

usage() {
  cat <<'USAGE'
Usage: bash docker/bundle.sh [options]

  On Windows run it through bash as shown - PowerShell cannot execute a .sh file
  directly. On Linux and on a DGX Spark the bare path works.

Options:
  --out DIR         Where to write the bundle (default: docker/bundle).
  --services LIST   Comma-separated services to include, from llm, image,
                    speech. Use "none" for the app alone.
                    (default: llm,image,speech)
  --models LIST     Which LLMs to download, from qwen3.8-27b, gpt-oss-20b,
                    gemma-4-12b. (default: all three, about 37GB)
  --skip-build      Do not rebuild the app and speech images; save the arm64
                    images already tagged on this machine.
  --skip-images     Models only. For topping up a bundle whose images are done.
  --skip-models     Images only.
  --checksums       Write a SHA-256 for every file into the manifest. Correct,
                    and slow: it reads the whole bundle back.
  --dry-run         Print the plan and stop.
  -h, --help        Show this help.

Examples:
  bash docker/bundle.sh
  bash docker/bundle.sh --models gemma-4-12b
  bash docker/bundle.sh --services llm --skip-build
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --out) OUT="${2:?--out needs a directory}"; shift 2 ;;
    --services) SERVICES="${2:?--services needs a list}"; shift 2 ;;
    --models) MODELS="${2:?--models needs a list}"; shift 2 ;;
    --skip-build) SKIP_BUILD=true; shift ;;
    --skip-images) SKIP_IMAGES=true; shift ;;
    --skip-models) SKIP_MODELS=true; shift ;;
    --checksums) CHECKSUMS=true; shift ;;
    --dry-run) DRY_RUN=true; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage >&2; exit 2 ;;
  esac
done

want() { [[ ",${SERVICES}," == *",$1,"* ]]; }

say() { printf '\033[36m[bundle]\033[0m %s\n' "$*"; }
warn() { printf '\033[33m[bundle]\033[0m %s\n' "$*" >&2; }
die() { printf '\033[31m[bundle]\033[0m %s\n' "$*" >&2; exit 1; }

command -v docker >/dev/null 2>&1 || die "docker is not on PATH."
docker info >/dev/null 2>&1 || die "The docker daemon is not reachable."

# Git Bash rewrites an absolute /foo argument into a Windows path on its way to a
# native program, which mangles the container side of every -v flag. Turning the
# rewriting off means the host side then has to be spelled the way the daemon
# expects it, which is what cygpath is for.
docker_path() {
  if command -v cygpath >/dev/null 2>&1; then cygpath -w "$1"; else printf '%s' "$1"; fi
}
drun() { MSYS_NO_PATHCONV=1 docker "$@"; }

say "Bundle: ${OUT}"
say "Services: ${SERVICES}"
want llm && say "LLMs: ${MODELS}"

if [[ "$DRY_RUN" == true ]]; then
  if [[ "$SKIP_BUILD" == true ]]; then
    say "Would build:  nothing (--skip-build)"
  elif want speech; then
    say "Would build:  nexusai, stt, tts"
  else
    say "Would build:  nexusai"
  fi
  if [[ "$SKIP_IMAGES" == true ]]; then
    say "Would save:   nothing (--skip-images)"
  else
    say "Would save:   every image the selected services run"
  fi
  if [[ "$SKIP_MODELS" == true ]]; then
    say "Would fetch:  nothing (--skip-models)"
  else
    say "Would fetch:  weights for the selected services"
  fi
  say "Dry run - nothing was written."
  exit 0
fi

mkdir -p "$OUT"
# An absolute path, because the bind mounts below and the manifest both need one.
OUT_ABS="$(cd "$OUT" && pwd)"
IMAGES_DIR="${OUT_ABS}/images"
MODELS_DIR="${OUT_ABS}/models"

# --- images -----------------------------------------------------------------

if [[ "$SKIP_IMAGES" == false ]]; then
  mkdir -p "$IMAGES_DIR"

  if [[ "$SKIP_BUILD" == false ]]; then
    say "Building the arm64 images. On an x86 host this is the slow part."
    build_args=(--out-dir "$IMAGES_DIR" "$APP_IMAGE_REF")
    want speech && build_args=(--with-speech "${build_args[@]}")
    bash docker/build-arm64.sh "${build_args[@]}"
  else
    say "Saving the arm64 images already on this machine."
    save_existing() {
      local ref="$1" dest="$2"
      docker image inspect "$ref" >/dev/null 2>&1 ||
        die "No such image: ${ref}. Drop --skip-build, or build it first."
      docker save "$ref" -o "$dest"
    }
    save_existing "$APP_IMAGE_REF" "${IMAGES_DIR}/nexusai-arm64.tar"
    if want speech; then
      save_existing "$STT_IMAGE_REF" "${IMAGES_DIR}/nexusai-stt-arm64.tar"
      save_existing "$TTS_IMAGE_REF" "${IMAGES_DIR}/nexusai-tts-arm64.tar"
    fi
  fi

  # The images this project does not build. The monitoring four are in the base
  # compose file and come up with everything else, so leaving them out would
  # leave a working stack with four containers stuck pulling.
  THIRD_PARTY=(
    "gcr.io/cadvisor/cadvisor:latest"
    "prom/node-exporter:latest"
    "prom/prometheus:latest"
    "grafana/grafana:latest"
  )
  # Both model services run their downloader in this image. It stays in the
  # bundle even though the weights arrive with it: the job still runs on the
  # target, finds every file present and exits, and the model server will not
  # start until it has.
  if want llm || want image; then
    THIRD_PARTY+=("curlimages/curl:latest")
  fi
  want llm && THIRD_PARTY+=("ghcr.io/ggml-org/llama.cpp:server-cuda")
  # master-cuda-spark is the GB10 build. The plain master-cuda tag is x86 only.
  want image && THIRD_PARTY+=("ghcr.io/leejet/stable-diffusion.cpp:master-cuda-spark")

  # Pulling a tag for another architecture replaces whatever is under that tag
  # here. For the monitoring images that is a working local copy, so say which
  # ones to put back rather than leaving a broken workstation behind.
  REPLACED=()
  for ref in "${THIRD_PARTY[@]}"; do
    file="${IMAGES_DIR}/$(echo "$ref" | tr '/:' '--').tar"
    if [[ -f "$file" ]]; then
      say "Have $(basename "$file")"
      continue
    fi
    had_arch="$(docker image inspect "$ref" --format '{{.Architecture}}' 2>/dev/null || true)"
    [[ -n "$had_arch" && "$had_arch" != "arm64" ]] && REPLACED+=("$ref")
    say "Pulling ${ref} for arm64"
    docker pull --platform linux/arm64 "$ref" >/dev/null
    docker save "$ref" -o "$file"
    # Dropped again so an arm64 image that cannot run here does not sit on the
    # disk, and does not shadow the native one in a later `docker compose up`.
    docker rmi "$ref" >/dev/null 2>&1 || true
  done

  if [[ ${#REPLACED[@]} -gt 0 ]]; then
    echo
    warn "These tags held an image for this machine's own architecture, and the"
    warn "arm64 pull took their place. Nothing here needs them, but if you run the"
    warn "stack locally, put them back with:"
    for ref in "${REPLACED[@]}"; do warn "  docker pull ${ref}"; done
    echo
  fi
fi

# --- models ------------------------------------------------------------------

# Both fetchers leave a file that is already there alone, so re-running this to
# resume an interrupted download costs nothing, and so does running it against a
# bundle that is already complete.
fetch_with_curl() {
  local script="$1" dest="$2"; shift 2
  mkdir -p "$dest"
  local args=(run --rm --user 0:0
    -v "$(docker_path "$dest"):/models"
    -v "$(docker_path "${REPO_ROOT}/${script}"):/fetch-models.sh:ro")
  local kv
  for kv in "$@"; do args+=(-e "$kv"); done
  args+=(curlimages/curl:latest sh /fetch-models.sh)
  drun "${args[@]}"
}

if [[ "$SKIP_MODELS" == false ]]; then
  if want llm; then
    say "Fetching the LLM weights. Tens of gigabytes - leave it running."
    fetch_with_curl docker/llamacpp/fetch-models.sh "${MODELS_DIR}/llamacpp" \
      "LLAMACPP_MODELS=${MODELS}" "LLAMACPP_CTX=${LLAMACPP_CTX:-8192}"
  fi

  if want image; then
    say "Fetching FLUX.1-schnell. About 17GB."
    fetch_with_curl docker/sdcpp/fetch-models.sh "${MODELS_DIR}/sdcpp"
  fi

  if want speech; then
    say "Fetching the speech checkpoints into a Hugging Face cache."
    mkdir -p "${MODELS_DIR}/hf"
    # HF_XET_CACHE points the chunk cache inside the container, where it is
    # discarded on exit: it is a download accelerator, not part of the model, and
    # leaving it in the bundle would roughly double this directory.
    #
    # A plain python image on this machine's own architecture. The weights are
    # architecture-independent, so there is nothing to gain from emulating arm64
    # to download them, and a great deal of time to lose.
    #
    # snapshot_download rather than the CLI: the command has been renamed twice
    # across huggingface_hub releases, and the function has not moved.
    drun run --rm --user 0:0 \
      -e HF_HOME=/cache \
      -e HF_XET_CACHE=/tmp/xet \
      -e "HF_TOKEN=${HF_TOKEN:-}" \
      -e "STT_REPO=${STT_MODEL_ID:-typhoon-ai/typhoon-whisper-large-v3}" \
      -e "TTS_REPO=${TTS_MODEL_ID:-openbmb/VoxCPM2}" \
      -v "$(docker_path "${MODELS_DIR}/hf"):/cache" \
      python:3.11-slim sh -c '
        set -e
        pip install --quiet --no-cache-dir "huggingface_hub>=0.26"
        python - <<PY
import os
from huggingface_hub import snapshot_download
# Every file, including the TensorFlow and Flax weights neither service loads.
# Skipping them looks like free savings and is not: offline, snapshot_download
# checks the cached snapshot against the file list it recorded and refuses a
# partial one. Measured with an ignore list, an air-gapped load failed with
# IncompleteSnapshotError naming tf_model.h5; with the full snapshot the same
# call succeeded on a container with no network at all.
for repo in (os.environ["STT_REPO"], os.environ["TTS_REPO"]):
    print(f"[hf] {repo}", flush=True)
    snapshot_download(repo_id=repo)
PY
        # The services run as uid 1000 and the hub libraries take lock files
        # inside this cache even when only reading, so it cannot stay root-owned.
        chown -R 1000:1000 /cache
      '
  fi
fi

# --- the compose files, the installer and the voices -------------------------

say "Copying the deployment files."
mkdir -p "${OUT_ABS}/docker"
# Everything under docker/ except what this script itself produces and anything
# machine-local. .env is deliberately excluded: it carries this machine's secrets
# and its own image tags, and the installer writes a fresh one on the target.
tar -cf - -C "$REPO_ROOT" \
  --exclude='docker/bundle' \
  --exclude='docker/out' \
  --exclude='docker/.env' \
  docker | tar -xf - -C "$OUT_ABS"

# The app bind-mounts these two from beside docker/, and they are where uploaded
# documents land on their way into the collector. Compose creates a missing bind
# mount source itself, but as root, and the container runs as uid 1000 - so it
# would come up unable to write to its own upload directory. Creating them here
# with the right owner is what avoids that.
mkdir -p "${OUT_ABS}/collector/hotdir" "${OUT_ABS}/collector/outputs"
if ! chown -R 1000:1000 "${OUT_ABS}/collector" 2>/dev/null; then
  warn "Could not set ownership on ${OUT_ABS}/collector. Harmless on Windows,"
  warn "where there is none; on the Spark, after copying, run:"
  warn "  sudo chown -R 1000:1000 <bundle>/collector"
fi

# --- what points the stack at all of it --------------------------------------

# Read by install.sh --offline, which substitutes the bundle's own location for
# __BUNDLE__ before merging these into docker/.env. Written with a placeholder
# rather than a path so the bundle survives being copied anywhere.
{
  echo "# Written by docker/bundle.sh. Merged into docker/.env by"
  echo "# install.sh --offline, with __BUNDLE__ replaced by the bundle's path."
  echo "#"
  echo "# Every value here exists to keep the deployment off the network: the"
  echo "# images are loaded from a tarball, the weights are read from a directory"
  echo "# instead of downloaded, and the hub libraries are told not to try."
  echo
  echo "NEXUSAI_IMAGE='${APP_IMAGE_REF}'"
  if want speech; then
    echo "STT_IMAGE='${STT_IMAGE_REF}'"
    echo "TTS_IMAGE='${TTS_IMAGE_REF}'"
    echo "SPEECH_MODELS_DIR='__BUNDLE__/models/hf'"
    echo "HF_HUB_OFFLINE='1'"
  fi
  if want llm; then
    echo "LLAMACPP_MODELS_DIR='__BUNDLE__/models/llamacpp'"
    echo "LLAMACPP_MODELS='${MODELS}'"
    echo "LLAMACPP_IMAGE_TAG='server-cuda'"
  fi
  if want image; then
    echo "SDCPP_MODELS_DIR='__BUNDLE__/models/sdcpp'"
    echo "SDCPP_IMAGE_TAG='master-cuda-spark'"
  fi
  echo "NEXUSAI_BUNDLE_SERVICES='${SERVICES}'"
} > "${OUT_ABS}/offline.env"

# --- manifest ----------------------------------------------------------------

say "Writing the manifest."
{
  echo "Nexus AI offline bundle"
  echo "Built:     $(date -u '+%Y-%m-%d %H:%M:%SZ') on $(uname -s) $(uname -m)"
  echo "Platform:  linux/arm64"
  echo "Services:  ${SERVICES}"
  want llm && echo "LLMs:      ${MODELS}"
  echo
  echo "On the DGX Spark, with no network:"
  echo
  echo "  bundle/docker/install.sh --offline"
  echo
  echo "It loads every image below, points the stack at the weights below, and"
  echo "starts it. Re-running it is safe."
  echo
  echo "--- images ---"
  if [[ -d "$IMAGES_DIR" ]]; then
    (cd "$IMAGES_DIR" && ls -la *.tar 2>/dev/null | awk '{printf "%-14s %s\n", $5, $NF}') || true
  fi
  echo
  echo "--- models ---"
  if [[ -d "$MODELS_DIR" ]]; then
    (cd "$MODELS_DIR" && du -sh */ 2>/dev/null) || true
  fi
  echo
  echo "Total: $(du -sh "$OUT_ABS" 2>/dev/null | cut -f1)"
  if [[ "$CHECKSUMS" == true ]]; then
    echo
    echo "--- sha256 ---"
    (cd "$OUT_ABS" && find images models -type f 2>/dev/null | sort | xargs -r sha256sum) || true
  fi
} > "${OUT_ABS}/MANIFEST.txt"

cat "${OUT_ABS}/MANIFEST.txt"

echo
say "Done. Copy the whole directory to the DGX Spark, then run there:"
say "  <bundle>/docker/install.sh --offline"

#!/usr/bin/env bash
# Builds an offline deployment bundle. The default target is a DGX Spark;
# --quick-test targets this x86_64 workstation with three small models.
#
# That is the whole point of this script. The rest of the tooling assumes the
# deployment host can reach a registry and Hugging Face; an air-gapped Spark can
# reach neither, and the failure is not obvious - the stack comes up, the model
# servers sit in "created", and the reason is buried in a downloader's log.
#
# Run it on a machine that does have a network. Both targets work:
#
#   Windows + Docker Desktop   from Git Bash or WSL with Docker integration.
#                              Cross-builds arm64 under emulation, so the app
#                              image takes the better part of an hour.
#   A DGX Spark with a network  builds natively, in minutes.
#
# The default bundle is linux/arm64. --quick-test is linux/amd64. Each looks like:
#
#   bundle/
#     docker/          the compose files, the installer and the voices
#     images/          every container image, saved as a tarball
#     images.list      the image archives required by this stack
#     models/          the GGUF weights, the Hugging Face cache, and the app's own
#                      embedder, reranker, Whisper and OCR data (models/nexusai) -
#                      kept out of the app image so an update does not re-ship them
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
OUT_EXPLICIT=false
SERVICES="llm,image,speech"
# The catalogue docker/llamacpp/fetch-models.sh knows. Narrow it to shrink the
# bundle: the three together are about 37GB.
MODELS="qwen3.8-27b,gpt-oss-20b,gemma-4-12b"
PLATFORM="linux/arm64"
QUICK_TEST=false
SERVICES_EXPLICIT=false
MODELS_EXPLICIT=false
PLATFORM_EXPLICIT=false
SKIP_BUILD=false
SKIP_IMAGES=false
SKIP_MODELS=false
CHECKSUMS=false
DRY_RUN=false
usage() {
  cat <<'USAGE'
Usage: bash docker/bundle.sh [options]

  On Windows use Git Bash or WSL with Docker Desktop integration. In WSL,
  a Windows-only Docker credential helper is bypassed for public images
  using a temporary, anonymous Docker configuration.

Options:
  --out DIR         Where to write the bundle (default: docker/bundle, or
                    docker/bundle-quick-test with --quick-test).
  --services LIST   Comma-separated services to include, from llm, image,
                    speech. Use "none" for the app alone.
                    (default: llm,image,speech)
  --models LIST     Which LLMs to download, from qwen3.8-27b, gpt-oss-20b,
                    gemma-4-12b, qwen2.5-0.5b, smollm2-360m, gemma3-270m.
                    (default: the three large production models, about 37GB)
  --quick-test      Bundle the three small real models (about 1.17GB), LLM only,
                    for an offline rehearsal on this x86_64 Docker host.
  --platform NAME   linux/arm64 (production) or linux/amd64 (LLM-only test).
  --skip-build      Do not rebuild the app and speech images; save the target
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
  bash docker/bundle.sh --quick-test
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --out) OUT="${2:?--out needs a directory}"; OUT_EXPLICIT=true; shift 2 ;;
    --services) SERVICES="${2:?--services needs a list}"; SERVICES_EXPLICIT=true; shift 2 ;;
    --models) MODELS="${2:?--models needs a list}"; MODELS_EXPLICIT=true; shift 2 ;;
    --quick-test) QUICK_TEST=true; shift ;;
    --platform) PLATFORM="${2:?--platform needs linux/amd64 or linux/arm64}"; PLATFORM_EXPLICIT=true; shift 2 ;;
    --skip-build) SKIP_BUILD=true; shift ;;
    --skip-images) SKIP_IMAGES=true; shift ;;
    --skip-models) SKIP_MODELS=true; shift ;;
    --checksums) CHECKSUMS=true; shift ;;
    --dry-run) DRY_RUN=true; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage >&2; exit 2 ;;
  esac
done

if [[ "$QUICK_TEST" == true ]]; then
  [[ "$OUT_EXPLICIT" == true ]] || OUT="docker/bundle-quick-test"
  [[ "$SERVICES_EXPLICIT" == true ]] || SERVICES="llm"
  [[ "$MODELS_EXPLICIT" == true ]] || MODELS="qwen2.5-0.5b,smollm2-360m,gemma3-270m"
  [[ "$PLATFORM_EXPLICIT" == true ]] || PLATFORM="linux/amd64"
fi
[[ "$PLATFORM" == "linux/arm64" || "$PLATFORM" == "linux/amd64" ]] ||
  { echo "Unsupported platform: ${PLATFORM}" >&2; exit 2; }
if [[ "$PLATFORM" == "linux/amd64" && "$SERVICES" != "llm" ]]; then
  echo "linux/amd64 bundles currently support --services llm only." >&2
  exit 2
fi
ARCH="${PLATFORM#linux/}"
APP_IMAGE_REF="nexusai:${ARCH}"
STT_IMAGE_REF="nexusai-stt:${ARCH}"
TTS_IMAGE_REF="nexusai-tts:${ARCH}"
CTX="${LLAMACPP_CTX:-8192}"
if [[ "$PLATFORM" == "linux/arm64" ]]; then CTX="${LLAMACPP_CTX:-16384}"; fi
if [[ "$QUICK_TEST" == true ]]; then CTX="${LLAMACPP_CTX:-8192}"; fi
MODEL_PREF="${MODELS%%,*}"
if [[ ",$MODELS," == *",gemma-4-12b,"* && "$QUICK_TEST" == false ]]; then
  MODEL_PREF="gemma-4-12b"
fi

want() { [[ ",${SERVICES}," == *",$1,"* ]]; }

say() { printf '\033[36m[bundle]\033[0m %s\n' "$*"; }
warn() { printf '\033[33m[bundle]\033[0m %s\n' "$*" >&2; }
die() { printf '\033[31m[bundle]\033[0m %s\n' "$*" >&2; exit 1; }

# Git Bash rewrites an absolute /foo argument into a Windows path on its way to a
# native program, which mangles the container side of every -v flag. Turning the
# rewriting off means the host side then has to be spelled the way the daemon
# expects it, which is what cygpath is for.
docker_path() {
  if command -v cygpath >/dev/null 2>&1; then cygpath -w "$1"; else printf '%s' "$1"; fi
}
drun() { MSYS_NO_PATHCONV=1 docker "$@"; }

say "Bundle: ${OUT}"
say "Platform: ${PLATFORM}"
say "Services: ${SERVICES}"
want llm && say "LLMs: ${MODELS}"
want llm && say "Context: ${CTX} tokens; initial model: ${MODEL_PREF}"

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

command -v docker >/dev/null 2>&1 || die "docker is not on PATH."

# Docker Desktop sometimes copies a Windows-only "desktop.exe" credential
# helper into WSL's config. Linux Docker then fails with "exec format error"
# before it can pull even public images. This bundle only uses public images,
# so use a throwaway anonymous config in that case. Leave the user's config
# and credentials untouched; the Docker Desktop WSL socket remains available
# through the default context.
ANON_DOCKER_CONFIG=""
if grep -qi microsoft /proc/version 2>/dev/null; then
  current_docker_config="${DOCKER_CONFIG:-$HOME/.docker}/config.json"
  if [[ -f "$current_docker_config" ]] &&
     grep -Eq '"desktop(\.exe)?"' "$current_docker_config"; then
    current_docker_dir="$(cd "${current_docker_config%/config.json}" && pwd)"
    docker_tmp_root="$(cd "${TMPDIR:-/tmp}" && pwd -P)"
    ANON_DOCKER_CONFIG="$(mktemp -d "${docker_tmp_root}/nexus-bundle-docker.XXXXXX")"
    # Keep the selected Docker context and existing buildx cache metadata.
    # Only registry credentials are omitted from the temporary config.
    docker_context="$(docker context show 2>/dev/null || true)"
    if [[ "$docker_context" =~ ^[a-zA-Z0-9_.-]+$ ]]; then
      printf '{"currentContext":"%s"}\n' "$docker_context" > "${ANON_DOCKER_CONFIG}/config.json"
    else
      printf '{}\n' > "${ANON_DOCKER_CONFIG}/config.json"
    fi
    for docker_metadata in contexts buildx; do
      if [[ -e "${current_docker_dir}/$docker_metadata" ]]; then
        ln -s "${current_docker_dir}/$docker_metadata" "${ANON_DOCKER_CONFIG}/$docker_metadata"
      fi
    done
    cleanup_docker_config() {
      # Only remove the directory this invocation created. Its buildx and
      # contexts entries are symlinks; rm removes the links, not their targets.
      if [[ "$ANON_DOCKER_CONFIG" == "$docker_tmp_root"/nexus-bundle-docker.* &&
            -d "$ANON_DOCKER_CONFIG" ]]; then
        rm -rf -- "$ANON_DOCKER_CONFIG"
      fi
    }
    trap cleanup_docker_config EXIT
    if DOCKER_CONFIG="$ANON_DOCKER_CONFIG" docker info >/dev/null 2>&1; then
      export DOCKER_CONFIG="$ANON_DOCKER_CONFIG"
      warn "WSL uses a Windows Docker credential helper. Using a temporary anonymous Docker config for public images."
    else
      cleanup_docker_config
      ANON_DOCKER_CONFIG=""
      die "Docker Desktop is not reachable through WSL's default Docker socket. Enable WSL integration, or run this script from Git Bash."
    fi
  fi
fi
docker info >/dev/null 2>&1 || die "The docker daemon is not reachable."

mkdir -p "$OUT"
# An absolute path, because the bind mounts below and the manifest both need one.
OUT_ABS="$(cd "$OUT" && pwd)"
IMAGES_DIR="${OUT_ABS}/images"
MODELS_DIR="${OUT_ABS}/models"

# The app's own models - the embedder, reranker and Whisper. Every bundle needs
# them, whatever --services says, and install.sh refuses one without them. The
# same four files install.sh checks.
app_models_missing() {
  local f
  for f in \
    MintplexLabs/multilingual-e5-small/onnx/model_quantized.onnx \
    Xenova/ms-marco-MiniLM-L-6-v2/onnx/model_quantized.onnx \
    Xenova/whisper-large/onnx/encoder_model_quantized.onnx \
    Xenova/whisper-large/onnx/decoder_model_merged_quantized.onnx
  do
    [[ -s "${MODELS_DIR}/nexusai/${f}" ]] || { printf '%s' "models/nexusai/${f}"; return 0; }
  done
  return 1
}

# --skip-models on a bundle directory from before these models moved out of the
# app image produces a bundle that fails on the air-gapped target, where nothing
# can be done about it. Say so here, before an hour of image builds.
if [[ "$SKIP_MODELS" == true ]] && missing="$(app_models_missing)"; then
  die "--skip-models, but ${OUT} has no ${missing}. The app's models are no longer inside its image. Drop --skip-models (weights already present are skipped, so it costs about 2GB), or run once with --skip-build --skip-images."
fi

if [[ -f "${OUT_ABS}/offline.env" ]]; then
  existing_platform="$(sed -n "s/^NEXUSAI_BUNDLE_PLATFORM=['\"]\?\([^'\"]*\).*/\1/p" "${OUT_ABS}/offline.env" | head -1)"
  [[ -z "$existing_platform" || "$existing_platform" == "$PLATFORM" ]] ||
    die "${OUT_ABS} holds a ${existing_platform} bundle. Pick another --out directory."
fi

# --- images -----------------------------------------------------------------

# A completed archive is published only after docker save and a tar read-back
# succeed. In particular, a failed export must never leave a plausible-looking
# nexusai-amd64.tar that the offline installer later tries to load.
save_image_archive() {
  local ref="$1" dest="$2" stage_on_linux="${3:-false}"
  local partial="${dest}.partial"
  local stage="$partial" temp_stage=""
  rm -f -- "$partial"
  if [[ "$stage_on_linux" == true && "$dest" == /mnt/* ]] &&
     grep -qi microsoft /proc/version 2>/dev/null; then
    # Docker save streams to WSL's Linux filesystem first. Copying the finished
    # tar to /mnt/<drive> avoids BuildKit exporting a large tar directly through
    # the Windows filesystem, which can exhaust WSL memory.
    temp_stage="$(mktemp "${TMPDIR:-/tmp}/nexus-image.XXXXXX")"
    stage="$temp_stage"
  fi
  if ! docker save "$ref" -o "$stage"; then
    rm -f -- "$stage" "$partial"
    die "Could not save ${ref}. Check free disk space and WSL/Docker memory, then rerun the bundle command."
  fi
  if [[ -n "$temp_stage" ]]; then
    if ! cp -- "$temp_stage" "$partial"; then
      rm -f -- "$temp_stage" "$partial"
      die "Could not copy ${ref} into the bundle. Check free space on the bundle drive."
    fi
    rm -f -- "$temp_stage"
  fi
  if ! tar -tf "$partial" >/dev/null 2>&1; then
    rm -f -- "$partial"
    die "The saved ${ref} archive is incomplete. Check free disk space and rerun."
  fi
  mv -f -- "$partial" "$dest"
}

if [[ "$SKIP_IMAGES" == false ]]; then
  mkdir -p "$IMAGES_DIR"

  if [[ "$SKIP_BUILD" == false ]]; then
    if [[ "$PLATFORM" == "linux/arm64" ]]; then
      say "Building the arm64 images. On an x86 host this is the slow part."
      build_args=(--out-dir "$IMAGES_DIR" "$APP_IMAGE_REF")
      want speech && build_args=(--with-speech "${build_args[@]}")
      bash docker/build-arm64.sh "${build_args[@]}"
    else
      say "Building the native amd64 app image into Docker for the offline rehearsal."
      docker build --platform "$PLATFORM" --file ./docker/Dockerfile \
        --target production-build --build-arg ARG_UID=1000 --build-arg ARG_GID=1000 \
        --tag "$APP_IMAGE_REF" .
      docker image inspect "$APP_IMAGE_REF" >/dev/null 2>&1 ||
        die "The build finished but ${APP_IMAGE_REF} was not loaded into Docker. Select the default Docker builder and rerun."
      say "Saving the app image as a verified archive."
      save_image_archive "$APP_IMAGE_REF" "${IMAGES_DIR}/nexusai-${ARCH}.tar" true
    fi
  else
    say "Saving the ${ARCH} images already on this machine."
    save_existing() {
      local ref="$1" dest="$2" stage_on_linux="${3:-false}"
      docker image inspect "$ref" >/dev/null 2>&1 ||
        die "No such image: ${ref}. Drop --skip-build, or build it first."
      save_image_archive "$ref" "$dest" "$stage_on_linux"
    }
    save_existing "$APP_IMAGE_REF" "${IMAGES_DIR}/nexusai-${ARCH}.tar" true
    if want speech; then
      save_existing "$STT_IMAGE_REF" "${IMAGES_DIR}/nexusai-stt-${ARCH}.tar"
      save_existing "$TTS_IMAGE_REF" "${IMAGES_DIR}/nexusai-tts-${ARCH}.tar"
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
  # Every model downloader runs in this image, the app's own nexusai-models job
  # included, so it is needed even with --services none. It stays in the bundle
  # even though the weights arrive with it: the job still runs on the target,
  # finds every file present and exits, and nothing waiting on it starts until
  # it has.
  THIRD_PARTY+=("curlimages/curl:latest")
  want llm && THIRD_PARTY+=("ghcr.io/ggml-org/llama.cpp:server-cuda")
  # master-cuda-spark is the GB10 build. The plain master-cuda tag is x86 only.
  want image && THIRD_PARTY+=("ghcr.io/leejet/stable-diffusion.cpp:master-cuda-spark")
  # The dashboard's GPU row. install.sh starts it with any GPU service.
  if want llm || want image || want speech; then
    THIRD_PARTY+=("utkuozdemir/nvidia_gpu_exporter:1.15.1")
  fi

  # Pulling a tag for another architecture replaces whatever is under that tag
  # here. For the monitoring images that is a working local copy, so say which
  # ones to put back rather than leaving a broken workstation behind.
  REPLACED=()
  for ref in "${THIRD_PARTY[@]}"; do
    file="${IMAGES_DIR}/$(echo "$ref" | tr '/:' '--').tar"
    if [[ -f "$file" ]] && tar -tf "$file" >/dev/null 2>&1; then
      say "Have $(basename "$file")"
      continue
    fi
    [[ -f "$file" ]] && warn "Replacing incomplete $(basename "$file")"
    had_arch="$(docker image inspect "$ref" --format '{{.Architecture}}' 2>/dev/null || true)"
    [[ -n "$had_arch" && "$had_arch" != "$ARCH" ]] && REPLACED+=("$ref")
    say "Pulling ${ref} for ${ARCH}"
    docker pull --platform "$PLATFORM" "$ref" >/dev/null
    save_image_archive "$ref" "$file"
    # The tarball is what matters. Remove this temporary tag so a cross-arch
    # pull does not shadow a native image in a later `docker compose up`.
    docker rmi "$ref" >/dev/null 2>&1 || true
  done

  if [[ ${#REPLACED[@]} -gt 0 ]]; then
    echo
    warn "These tags held an image for this machine's own architecture, and the"
    warn "${ARCH} pull took their place. Nothing here needs them, but if you run the"
    warn "stack locally, put them back with:"
    for ref in "${REPLACED[@]}"; do warn "  docker pull ${ref}"; done
    echo
  fi
fi

# Record what the selected stack needs, independently of what happens to be in
# this Docker daemon's cache. The installer checks this list on the target.
expected_images=("nexusai-${ARCH}.tar")
if want speech; then
  expected_images+=("nexusai-stt-${ARCH}.tar" "nexusai-tts-${ARCH}.tar")
fi
required_refs=(
  "gcr.io/cadvisor/cadvisor:latest"
  "prom/node-exporter:latest"
  "prom/prometheus:latest"
  "grafana/grafana:latest"
  "curlimages/curl:latest"
)
if want llm; then required_refs+=("ghcr.io/ggml-org/llama.cpp:server-cuda"); fi
if want image; then required_refs+=("ghcr.io/leejet/stable-diffusion.cpp:master-cuda-spark"); fi
if want llm || want image || want speech; then required_refs+=("utkuozdemir/nvidia_gpu_exporter:1.15.1"); fi
for ref in "${required_refs[@]}"; do
  expected_images+=("$(echo "$ref" | tr '/:' '--').tar")
done
# With --skip-images nothing above saved an archive, but the list still names
# everything the stack now runs. An image added since the bundle's images were
# made would then be required on the target and absent from the bundle - found
# only on the air-gapped host. Refuse here, before the list is rewritten.
if [[ "$SKIP_IMAGES" == true ]]; then
  missing_images=()
  for image_tar in "${expected_images[@]}"; do
    [[ -s "${IMAGES_DIR}/${image_tar}" ]] || missing_images+=("$image_tar")
  done
  if [[ ${#missing_images[@]} -gt 0 ]]; then
    warn "--skip-images, but the stack needs image archives this bundle does not have:"
    for image_tar in "${missing_images[@]}"; do warn "  ${image_tar}"; done
    # A third-party image is one pull and one save - the same two steps the
    # images section above runs - so hand those over rather than a rebuild. The
    # app images cannot be fetched that way: build-arm64.sh writes them straight
    # to a tarball and never tags them in this daemon, so --skip-build would not
    # find them either.
    echo >&2
    warn "Fetch the third-party ones with:"
    for ref in "${required_refs[@]}"; do
      image_tar="$(echo "$ref" | tr '/:' '--').tar"
      [[ -s "${IMAGES_DIR}/${image_tar}" ]] && continue
      warn "  docker pull --platform ${PLATFORM} ${ref} && docker save ${ref} -o ${OUT}/images/${image_tar}"
    done
    for image_tar in "${missing_images[@]}"; do
      [[ "$image_tar" == nexusai-* ]] &&
        warn "  ${image_tar} is built here: rerun without --skip-images to build it."
    done
    die "images.list left unchanged."
  fi
fi
printf '%s\n' "${expected_images[@]}" > "${OUT_ABS}/images.list"

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
  # Whatever the services, the app itself needs these. They used to be baked into
  # the app image, where they rode along inside every update's tarball; as plain
  # files they are identical between bundles, so an rsync-style copy skips them.
  say "Fetching the app's embedder, reranker, Whisper and OCR data. About 2GB."
  fetch_with_curl docker/prefetch-models.sh "${MODELS_DIR}/nexusai" \
    "OCR_LANGUAGES=${OCR_LANGUAGES:-eng tha}"

  if want llm; then
    if [[ "$QUICK_TEST" == true ]]; then
      say "Fetching the three small LLM weights (about 1.17GB)."
    else
      say "Fetching the LLM weights. Tens of gigabytes - leave it running."
    fi
    fetch_with_curl docker/llamacpp/fetch-models.sh "${MODELS_DIR}/llamacpp" \
      "LLAMACPP_MODELS=${MODELS}" "LLAMACPP_CTX=${CTX}"
  fi

  if want image; then
    say "Fetching FLUX.1-schnell Q8 and its support weights. About 23GB."
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

# Last chance to catch an incomplete bundle while this machine still has a network.
if missing="$(app_models_missing)"; then
  die "The bundle has no ${missing}. Rerun with --skip-build --skip-images to fetch the app's models."
fi

# --- the compose files, the installer and the voices -------------------------

say "Copying the deployment files."
mkdir -p "${OUT_ABS}/docker"
# Everything under docker/ except what this script itself produces and anything
# machine-local. .env is deliberately excluded: it carries this machine's secrets
# and its own image tags, and the installer writes a fresh one on the target.
tar -cf - -C "$REPO_ROOT" \
  --exclude='docker/bundle' \
  --exclude='docker/bundle-quick-test' \
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
  echo "NEXUSAI_OFFLINE='1'"
  echo "NEXUSAI_BUNDLE_PLATFORM='${PLATFORM}'"
  echo "NEXUSAI_MODELS_DIR='__BUNDLE__/models/nexusai'"
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
    echo "LLAMACPP_CTX='${CTX}'"
    if [[ "$QUICK_TEST" == true ]]; then echo "LLAMACPP_MODELS_MAX='1'"; fi
    echo "LLM_PROVIDER='generic-openai'"
    echo "GENERIC_OPEN_AI_BASE_PATH='http://llamacpp:8080/v1'"
    echo "GENERIC_OPEN_AI_MODEL_PREF='${MODEL_PREF}'"
    echo "GENERIC_OPEN_AI_MODEL_TOKEN_LIMIT='${CTX}'"
    echo "GENERIC_OPEN_AI_ALLOWED_MODELS=''"
    if [[ "$QUICK_TEST" == true ]]; then echo "GENERIC_OPEN_AI_MAX_TOKENS='256'"; fi
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
  echo "Platform:  ${PLATFORM}"
  if [[ "$QUICK_TEST" == true ]]; then echo "Profile:   quick-test"; fi
  echo "Services:  ${SERVICES}"
  want llm && echo "LLMs:      ${MODELS}"
  echo
  echo "On a ${PLATFORM} host, with no network:"
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
say "Done. Copy the whole directory to the ${PLATFORM} host, then run there:"
say "  <bundle>/docker/install.sh --offline"

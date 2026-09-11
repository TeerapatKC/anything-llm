#!/usr/bin/env bash
# Builds the Nexus AI image for arm64 - the architecture of the DGX Spark and of
# every other Grace/Ampere based box - and leaves it somewhere you can move it.
#
# `docker compose build` (see build.sh) always targets the architecture of the
# machine running it, so an image built on an x86 workstation cannot start on a
# DGX Spark at all. This script pins the target platform instead.
#
# Two ways out of the build, because a demo machine is rarely on a registry:
#   - default: a tarball you copy over and `docker load -i` on the target
#   - --push:  straight into a registry you can pull from on the target
#
# Running this ON the DGX Spark itself is the fast path: the build is native and
# takes minutes. Cross-building from x86 runs the backend stages under QEMU
# emulation and takes far longer - expect the better part of an hour. The
# frontend stage is pinned to the build host's own architecture inside the
# Dockerfile, so that part stays fast either way.
#
# This builds the app image only. The local model services are not in it:
# llama.cpp and stable-diffusion.cpp are prebuilt arm64 images that `up` pulls,
# and the two Thai speech images are built on the Spark itself by
# docker/install.sh - cross-building a CUDA torch stack under emulation is not
# worth the hours it would take. So the sequence for a Spark is:
#
#   on this machine:   bash docker/build-arm64.sh
#   on the Spark:      docker load -i nexusai-arm64.tar
#                      ./docker/install.sh --app-image nexusai:arm64
#
# Cross-building here takes the better part of an hour, nearly all of it QEMU
# emulating arm64. It is not stuck. Running the same script natively on the
# Spark finishes in minutes, and skips the copy entirely.
#
# --app-image is what stops the Spark rebuilding the app from source: it puts the
# tag in NEXUSAI_IMAGE, and the compose file runs that image rather than building.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

IMAGE_REF="nexusai:arm64"
OUTPUT_FILE=""
OUT_DIR="docker/out"
PUSH=false
DRY_RUN=false
WITH_SPEECH=false
# The image bakes in the uid/gid its files are owned by. 1000 is what the compose
# file runs the container as by default, and what a fresh Linux login account gets,
# so it is the right default for an image built to be carried to another machine -
# rather than whatever id the workstation doing the build happens to use.
BUILD_UID="${ARG_UID:-1000}"
BUILD_GID="${ARG_GID:-1000}"
# The all-in-one image: server, collector and the bundled SPA. `backend-production`
# is the other option, for the split deployment in docker-compose.split.yml.
TARGET="${TARGET:-production-build}"

usage() {
  cat <<'USAGE'
Usage: bash docker/build-arm64.sh [options] [IMAGE_REF]

  On Windows run it through bash as shown - PowerShell cannot execute a .sh
  file directly ("Cannot run a document in the middle of a pipeline"). On
  Linux and on the DGX Spark the bare path works.

  IMAGE_REF        Tag for the built image (default: nexusai:arm64).
                   With --push this must be a full registry reference,
                   e.g. registry.example.com/nexusai:demo

Options:
  --with-speech    Also build the two Thai speech images for arm64, so the
                   target needs no compiler at all. They carry a CUDA torch
                   stack; cross-building them here runs pip under emulation
                   and takes hours. Native on the Spark it is minutes.
  --push           Push to the registry instead of writing a tarball.
  --output FILE    Where to write the app tarball (default: <out-dir>/<name>.tar).
  --out-dir DIR    Directory for every tarball this writes, the speech images
                   included (default: docker/out).
  --target STAGE   Dockerfile stage to build (default: production-build).
  --dry-run        Print the docker command that would run, and stop.
  -h, --help       Show this help.

Examples:
  bash docker/build-arm64.sh
  bash docker/build-arm64.sh --output /tmp/nexusai-spark.tar
  bash docker/build-arm64.sh --push registry.example.com/nexusai:demo
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --with-speech) WITH_SPEECH=true; shift ;;
    --push) PUSH=true; shift ;;
    --output) OUTPUT_FILE="${2:?--output needs a file path}"; shift 2 ;;
    --out-dir) OUT_DIR="${2:?--out-dir needs a directory}"; shift 2 ;;
    --target) TARGET="${2:?--target needs a stage name}"; shift 2 ;;
    --dry-run) DRY_RUN=true; shift ;;
    -h|--help) usage; exit 0 ;;
    -*) echo "Unknown option: $1" >&2; usage >&2; exit 2 ;;
    *) IMAGE_REF="$1"; shift ;;
  esac
done

# Docker Desktop keeps its builder and its credential helper on the Windows side.
# Under WSL's bash - which is what PowerShell's bare `bash` resolves to - neither
# is reachable, and the build dies a minute in with two errors that name neither
# cause:
#
#   Cannot load builder desktop-linux: protocol not available
#   ERROR: failed to solve: error getting credentials - err: exit status 1
#
# Catching it here costs a second instead of a minute. The fix is to run the same
# command from Git Bash, where the helper is on PATH.
DOCKER_CFG="${DOCKER_CONFIG:-$HOME/.docker}/config.json"
CRED_STORE=""
if [[ -f "$DOCKER_CFG" ]]; then
  CRED_STORE="$(grep -o '"credsStore"[[:space:]]*:[[:space:]]*"[^"]*"' "$DOCKER_CFG" | head -1 | awk -F'"' '{print $4}')"
fi
if [[ -n "$CRED_STORE" ]] && ! command -v "docker-credential-${CRED_STORE}" >/dev/null 2>&1 && ! command -v "docker-credential-${CRED_STORE}.exe" >/dev/null 2>&1; then
  echo "docker is set to read registry credentials from '${CRED_STORE}', but" >&2
  echo "docker-credential-${CRED_STORE} is not on PATH in this shell, so pulling any" >&2
  echo "base image will fail." >&2
  echo >&2
  if grep -qi microsoft /proc/version 2>/dev/null; then
    echo "This shell is WSL, and Docker Desktop's helper lives on the Windows side." >&2
    echo "Run it from Git Bash instead. From PowerShell that is:" >&2
    echo >&2
    echo '  & "C:\Program Files\Git\bin\bash.exe" docker/build-arm64.sh' >&2
  else
    echo "Install that helper, or drop the credsStore line from ${DOCKER_CFG}." >&2
  fi
  exit 1
fi

if ! docker buildx version >/dev/null 2>&1; then
  echo "docker buildx is required - it ships with Docker Desktop and with recent Docker Engine." >&2
  exit 1
fi

# Cross-building needs the arm64 emulator registered with the kernel. Docker Desktop
# ships it; a bare Linux host may not have it until binfmt is installed once.
HOST_ARCH="$(docker version --format '{{.Server.Arch}}' 2>/dev/null || echo unknown)"
if [[ "$HOST_ARCH" != "arm64" ]]; then
  if ! docker buildx ls | grep -q "linux/arm64"; then
    echo "This builder cannot produce linux/arm64 images. Register the emulator once with:" >&2
    echo "  docker run --privileged --rm tonistiigi/binfmt --install arm64" >&2
    exit 1
  fi
  echo "Note: building arm64 on a ${HOST_ARCH} host - the backend stages run under emulation and will be slow."
fi

# A dedicated docker-container builder, not the default one. Measured on this
# machine, repeating the same cross-build:
#
#   default "docker" driver   the pip install step re-ran in full, 49s
#   docker-container driver   CACHED, 3s
#
# The default driver does not keep usable cache for a cross-platform build that
# exports to a tarball, so every rebuild costs what the first one did - which on
# the real images is hours. This builder keeps it, so a change to server.py
# rebuilds only the layers after it.
BUILDER="${NEXUSAI_BUILDER:-nexusai-arm64}"
if ! docker buildx inspect "$BUILDER" >/dev/null 2>&1; then
  echo "Creating buildx builder '${BUILDER}' (docker-container driver, keeps cache between runs)."
  docker buildx create --name "$BUILDER" --driver docker-container --bootstrap >/dev/null
fi

BUILD_ARGS=(
  buildx build
  --builder "$BUILDER"
  --platform linux/arm64
  --file ./docker/Dockerfile
  --target "$TARGET"
  --build-arg "ARG_UID=${BUILD_UID}"
  --build-arg "ARG_GID=${BUILD_GID}"
  --tag "$IMAGE_REF"
)

if [[ "$PUSH" == true ]]; then
  if [[ "$IMAGE_REF" != */* ]]; then
    echo "--push needs a registry reference, e.g. registry.example.com/nexusai:demo" >&2
    exit 2
  fi
  BUILD_ARGS+=(--push)
else
  if [[ -z "$OUTPUT_FILE" ]]; then
    # Name the file after the tag so two builds don't overwrite each other.
    OUTPUT_FILE="${OUT_DIR}/$(echo "$IMAGE_REF" | tr '/:' '--').tar"
  fi
  mkdir -p "$(dirname "$OUTPUT_FILE")"
  # `type=docker` writes an archive `docker load` understands. It deliberately does
  # not add the image to this machine's image store: an arm64 image is of no use
  # here and would only take up room.
  BUILD_ARGS+=(--output "type=docker,dest=${OUTPUT_FILE}")
fi

BUILD_ARGS+=(.)

if [[ "$DRY_RUN" == true ]]; then
  printf 'docker'
  printf ' %q' "${BUILD_ARGS[@]}"
  printf '\n'
  exit 0
fi

docker "${BUILD_ARGS[@]}"

# The build cache is deliberately kept. It grows by gigabytes and, on
# Windows/WSL2, the Docker Desktop virtual disk never shrinks back on its own -
# but discarding it turns every rebuild after a code edit into a cold build, and
# a cold cross-build here is the better part of an hour. Reclaim it by hand with
# `docker builder prune` when the disk actually needs it.

# The speech services build from their own small contexts under docker/, and take
# the same CUDA index the installer would have chosen on the target.
if [[ "$WITH_SPEECH" == true ]]; then
  SPEECH_TORCH_INDEX="${THAI_SPEECH_TORCH_INDEX_URL:-https://download.pytorch.org/whl/cu130}"
  for svc in stt tts; do
    tag="nexusai-thai-${svc}:arm64"
    echo
    echo "Building ${tag} - this is the slow one under emulation."
    args=(
      buildx build
      --builder "$BUILDER"
      --platform linux/arm64
      --file "./docker/thai-speech/${svc}/Dockerfile"
      --build-arg "TORCH_INDEX_URL=${SPEECH_TORCH_INDEX}"
      --tag "$tag"
    )
    if [[ "$PUSH" == true ]]; then
      args+=(--push)
    else
      out="${OUT_DIR}/nexusai-thai-${svc}-arm64.tar"
      mkdir -p "$OUT_DIR"
      args+=(--output "type=docker,dest=${out}")
    fi
    args+=("./docker/thai-speech/${svc}")
    docker "${args[@]}"
  done
fi

if [[ "$PUSH" == true ]]; then
  echo "Pushed ${IMAGE_REF}. On the DGX Spark:"
  echo "  docker pull ${IMAGE_REF}"
else
  echo "Wrote ${OUTPUT_FILE} ($(du -h "$OUTPUT_FILE" | cut -f1)). Copy it to the DGX Spark, then:"
  echo "  docker load -i $(basename "$OUTPUT_FILE")"
fi
echo
echo "The image carries no configuration. On the Spark, check out this repository"
echo "and run the installer - it writes docker/.env, picks the arm64 image tags and"
echo "the CUDA 13 torch build, and brings everything up on the image you just loaded:"
echo
echo "  docker/install.sh --app-image ${IMAGE_REF}"
echo
echo "It builds the Thai speech images natively there, which is why they are not in"
echo "this tarball. Pass --services none if all you want is the app."

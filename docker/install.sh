#!/usr/bin/env bash
# Sets up a Nexus AI deployment on this machine: writes the parts of docker/.env
# that cannot be defaulted, picks the image tags and CUDA build that match the
# hardware, builds what needs building and starts the stack.
#
# Runs on both targets this project cares about:
#
#   Windows + Docker Desktop (WSL2, x86_64 NVIDIA)  - run it from Git Bash
#   DGX Spark (arm64 Grace Blackwell, CUDA 13)      - run it natively
#
# The difference between the two is two variables, and the script works out which
# from the machine it is on. Everything else is identical.
#
# Safe to re-run. It only ever adds keys that are missing from docker/.env - an
# existing value, whether you wrote it or the Settings page did, is never touched.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"

ENV_FILE=".env"
EXAMPLE_FILE=".env.example"

SERVICES="llm,image,speech"
SINGLE_MODEL=false
SERVICES_EXPLICIT=false
START=true
DRY_RUN=false
PREBUILT_TAG=""
SKIP_GPU_CHECK=false
WAIT_FOR_MODELS=false
WAIT_TIMEOUT_S=7200
APP_IMAGE=""
OFFLINE_DIR=""

usage() {
  cat <<'USAGE'
Usage: ./docker/install.sh [options]

  On Windows run it as `bash docker/install.sh` - PowerShell cannot execute a
  .sh file directly. On Linux and on the DGX Spark the bare path works.

Options:
  --services LIST   Comma-separated local services to include, from
                    llm, image, speech. Use "none" for the app alone.
                    (default: llm,image,speech)
  --offline [DIR]   Install from a bundle built by docker/bundle.sh on a
                    machine that had a network: load every image from it, read
                    the model weights out of it, and never reach for either.
                    This is the only mode that works on a host with no internet
                    at all. DIR defaults to the bundle this script sits in.
  --prebuilt TAG    Use already-loaded images tagged TAG for every service that
                    would otherwise be built - the app and the two Thai speech
                    services. This is the no-compiler path on a DGX Spark:
                    `docker load -i` each tarball from
                    `build-arm64.sh --with-speech`, then --prebuilt arm64.
  --app-image REF   Run this already-loaded image for the app only. --prebuilt
                    covers it; use this when the app image is tagged something
                    else.
  --single-model    Serve one small LLM pulled on demand instead of the three
                    large ones. Skips roughly 37GB of downloads.
  --skip-gpu-check  Proceed even though the NVIDIA container toolkit could not
                    be detected. Use it when `docker run --gpus all` works but
                    the toolkit is wired in a way this script does not recognise.
  --wait            Block until the model downloads finish and every service is
                    started, rather than returning while they run. Handy for an
                    unattended install; avoid it over a flaky SSH session.
  --no-start        Write config and build, but do not bring the stack up.
  --dry-run         Print what would change and stop.
  -h, --help        Show this help.

Examples:
  docker/install.sh
  docker/install.sh --single-model
  docker/install.sh --services image,speech
  docker/install.sh --services none --no-start
  ./docker/install.sh --offline
  ./docker/install.sh --prebuilt arm64
  ./docker/install.sh --app-image nexusai:arm64
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --services) SERVICES="${2:?--services needs a list}"; SERVICES_EXPLICIT=true; shift 2 ;;
    --offline)
      if [[ -n "${2:-}" && "${2}" != -* ]]; then
        OFFLINE_DIR="$2"; shift 2
      else
        OFFLINE_DIR=".."; shift
      fi
      ;;
    --prebuilt) PREBUILT_TAG="${2:?--prebuilt needs a tag}"; shift 2 ;;
    --app-image) APP_IMAGE="${2:?--app-image needs an image reference}"; shift 2 ;;
    --single-model) SINGLE_MODEL=true; shift ;;
    --skip-gpu-check) SKIP_GPU_CHECK=true; shift ;;
    --wait) WAIT_FOR_MODELS=true; shift ;;
    --no-start) START=false; shift ;;
    --dry-run) DRY_RUN=true; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage >&2; exit 2 ;;
  esac
done

want() { [[ ",${SERVICES}," == *",$1,"* ]]; }

say() { printf '\033[36m[install]\033[0m %s\n' "$*"; }
warn() { printf '\033[33m[install]\033[0m %s\n' "$*" >&2; }
die() { printf '\033[31m[install]\033[0m %s\n' "$*" >&2; exit 1; }

# --- the offline bundle -------------------------------------------------------

# Resolved before anything else looks at SERVICES: a bundle records which services
# it was built for, and installing the speech services from a bundle that has no
# speech weights in it would fail much later and much less clearly.
OFFLINE=false
if [[ -n "$OFFLINE_DIR" ]]; then
  OFFLINE=true
  # --single-model does not pre-download anything: it hands llama-server a
  # Hugging Face repository name and lets the server fetch the weights on first
  # use. There is nothing for it to fetch from here. A bundle built with
  # --models <one name> is the offline equivalent.
  [[ "$SINGLE_MODEL" == false ]] ||
    die "--single-model pulls its model on demand, which an offline host cannot do. Build the bundle with --models <name> instead."

  [[ -d "$OFFLINE_DIR" ]] || die "No such directory: ${OFFLINE_DIR}"
  OFFLINE_DIR="$(cd "$OFFLINE_DIR" && pwd)"
  [[ -f "${OFFLINE_DIR}/offline.env" ]] ||
    die "${OFFLINE_DIR} is not a bundle - no offline.env in it. Build one with docker/bundle.sh on a machine that has a network."

  # The bundle's own idea of what it contains wins unless --services was given.
  bundle_services="$(grep '^NEXUSAI_BUNDLE_SERVICES=' "${OFFLINE_DIR}/offline.env" |
    head -1 | cut -d= -f2- | tr -d "'")"
  if [[ -n "$bundle_services" && "$SERVICES_EXPLICIT" == false ]]; then
    SERVICES="$bundle_services"
  fi
fi

# --- prerequisites ----------------------------------------------------------

command -v docker >/dev/null 2>&1 || die "docker is not on PATH."
docker compose version >/dev/null 2>&1 ||
  die "The docker compose plugin is missing. Docker Desktop ships it; on Linux install docker-compose-plugin."
docker info >/dev/null 2>&1 || die "The docker daemon is not reachable. Start Docker Desktop, or the docker service."

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
if [[ -f "$DOCKER_CFG" && "$OFFLINE" == false ]]; then
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
    echo "  & \"C:\\Program Files\\Git\\bin\\bash.exe\" docker/$(basename "$0")" >&2
  else
    echo "Install that helper, or drop the credsStore line from ${DOCKER_CFG}." >&2
  fi
  exit 1
fi

# --- what hardware is this --------------------------------------------------

ARCH="$(uname -m)"
CUDA_MAJOR=""
if command -v nvidia-smi >/dev/null 2>&1; then
  # `nvidia-smi` prints "CUDA Version: 13.0" in its header. That is the driver's
  # maximum supported runtime, which is what decides the torch build.
  CUDA_MAJOR="$(nvidia-smi 2>/dev/null | sed -n 's/.*CUDA Version: *\([0-9]*\).*/\1/p' | head -1)"
fi

# A driver on the host is not the same thing as a GPU reaching a container: that
# needs the NVIDIA container toolkit, and its absence is the single most common
# reason these services come up on the CPU and crawl.
#
# Three ways to see it, because there are three ways the toolkit gets wired in. A
# registered runtime is the old arrangement and the only one `docker info` shows;
# newer installs, including DGX OS, hand GPUs over through the Container Device
# Interface instead and register no runtime at all. Checking only the first is how
# this refused to run on a machine whose GPUs worked fine.
# Total GPU memory in MiB, when the driver will say. On a DGX Spark this is the
# unified pool the CPU and GPU share, which is what decides how many large models
# can sit in memory at once. Empty when there is no driver to ask.
GPU_MEM_MB=""
if command -v nvidia-smi >/dev/null 2>&1; then
  GPU_MEM_MB="$(nvidia-smi --query-gpu=memory.total --format=csv,noheader,nounits 2>/dev/null |
    head -1 | tr -dc '0-9')"
fi

GPU_IN_DOCKER=false
if docker info --format '{{json .Runtimes}}' 2>/dev/null | grep -q nvidia; then
  GPU_IN_DOCKER=true
elif ls /etc/cdi/*.yaml /etc/cdi/*.json /var/run/cdi/*.yaml /var/run/cdi/*.json 2>/dev/null | grep -qi nvidia; then
  GPU_IN_DOCKER=true
elif command -v nvidia-ctk >/dev/null 2>&1; then
  GPU_IN_DOCKER=true
fi

case "$ARCH" in
  aarch64|arm64)
    PLATFORM="DGX Spark or other arm64 NVIDIA"
    SDCPP_TAG="master-cuda-spark"
    # CUDA 13 is what a GB10 runs. Anything older on arm64 is unusual; trust the
    # driver's own answer rather than the architecture when we have one.
    TORCH_INDEX="https://download.pytorch.org/whl/cu130"
    [[ "$CUDA_MAJOR" == "12" ]] && TORCH_INDEX="https://download.pytorch.org/whl/cu128"
    ;;
  x86_64|amd64)
    PLATFORM="x86_64"
    SDCPP_TAG="master-cuda"
    TORCH_INDEX="https://download.pytorch.org/whl/cu128"
    [[ "$CUDA_MAJOR" == "13" ]] && TORCH_INDEX="https://download.pytorch.org/whl/cu130"
    ;;
  *)
    die "Unsupported architecture: ${ARCH}."
    ;;
esac

# server-cuda is published for both architectures, so llama.cpp needs no split.
LLAMACPP_TAG="server-cuda"

say "Platform: ${PLATFORM} (${ARCH})${CUDA_MAJOR:+, CUDA ${CUDA_MAJOR}}"
if [[ "$GPU_IN_DOCKER" == false && "$SKIP_GPU_CHECK" == false ]]; then
  warn "Could not find the NVIDIA container toolkit: no nvidia runtime, no CDI"
  warn "specification, no nvidia-ctk on PATH."
  if want llm || want image || want speech; then
    warn "The local services reserve a GPU and will not start without it. Confirm"
    warn "with a real container before believing this check:"
    warn "  docker run --rm --gpus all nvidia/cuda:13.0.0-base-ubuntu24.04 nvidia-smi"
    warn "If that prints a GPU table, re-run with --skip-gpu-check. If it fails,"
    warn "install the toolkit, or re-run with --services none for the app alone."
    die "Refusing to continue - check the GPU first, or drop the local services."
  fi
fi

# --- docker/.env ------------------------------------------------------------

if [[ ! -f "$ENV_FILE" ]]; then
  [[ -f "$EXAMPLE_FILE" ]] || die "Neither ${ENV_FILE} nor ${EXAMPLE_FILE} exists."
  say "Creating ${ENV_FILE} from ${EXAMPLE_FILE}."
  [[ "$DRY_RUN" == true ]] || cp "$EXAMPLE_FILE" "$ENV_FILE"
fi

# A random value for the keys that must be secret and must not change once data
# has been written with them.
random_hex() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex 32
  else
    head -c 32 /dev/urandom | od -An -tx1 | tr -d ' \n'
  fi
}

has_key() {
  [[ -f "$ENV_FILE" ]] && grep -qE "^[[:space:]]*$1[[:space:]]*=" "$ENV_FILE"
}

# The value of a key already in docker/.env, unquoted, or empty if it is absent.
# Used to size defaults off a choice made earlier in this run - the offline
# bundle writes its model list before any of the tuning below is worked out.
env_value() {
  has_key "$1" || return 0
  grep -E "^[[:space:]]*$1[[:space:]]*=" "$ENV_FILE" | tail -1 |
    cut -d= -f2- | sed -e "s/^[[:space:]]*//" -e "s/^['\"]//" -e "s/['\"]$//"
}

ADDED=()
set_if_missing() {
  local key="$1" value="$2"
  if has_key "$key"; then
    return 0
  fi
  ADDED+=("$key")
  [[ "$DRY_RUN" == true ]] && return 0
  printf "%s='%s'\n" "$key" "$value" >> "$ENV_FILE"
}

# Unlike set_if_missing, this replaces a value that is already there. Both
# callers mean it: pointing the deployment at a different image, or at a bundle
# that has just been copied to a new path, is the whole reason they were asked
# for.
set_key() {
  local key="$1" value="$2"
  [[ "$DRY_RUN" == true ]] && { ADDED+=("$key"); return 0; }
  if has_key "$key"; then
    # sed -i writes a temp file in the same directory, so this keeps the
    # bind-mounted .env at the same inode the running container reads.
    sed -i.bak -E "s|^[[:space:]]*${key}[[:space:]]*=.*|${key}='${value}'|" "$ENV_FILE"
    rm -f "${ENV_FILE}.bak"
  else
    printf "%s='%s'\n" "$key" "$value" >> "$ENV_FILE"
  fi
  ADDED+=("$key")
}

set_image() {
  local key="$1" ref="$2" label="$3"
  [[ -z "$ref" ]] && return 0
  docker image inspect "$ref" >/dev/null 2>&1 ||
    die "No such image: ${ref}. Load it first with: docker load -i <tarball>"
  set_key "$key" "$ref"
  say "${label}: ${ref} (will not be rebuilt)"
}

# Required for the app to run at all. SIG_KEY and SIG_SALT encrypt stored data,
# and JWT_SECRET signs sessions - regenerating any of them later invalidates what
# was written with the old one, which is why they are only ever added, never
# rewritten.
set_if_missing STORAGE_LOCATION "nexusai-storage"
set_if_missing STORAGE_DIR "/app/server/storage"
set_if_missing SERVER_PORT "3001"
set_if_missing JWT_SECRET "$(random_hex)"
set_if_missing SIG_KEY "$(random_hex)"
set_if_missing SIG_SALT "$(random_hex)"

if [[ "$OFFLINE" == true ]]; then
  say "Installing from the bundle at ${OFFLINE_DIR}"
  shopt -s nullglob
  tarballs=("${OFFLINE_DIR}"/images/*.tar)
  shopt -u nullglob
  [[ ${#tarballs[@]} -gt 0 ]] ||
    die "No image tarballs in ${OFFLINE_DIR}/images. The bundle is incomplete."

  # `docker load` restores each image under the tag it was saved with, which is
  # what lets the compose files find them by their ordinary names. Loading one
  # that is already present is a no-op, so a re-run costs seconds.
  for tarball in "${tarballs[@]}"; do
    if [[ "$DRY_RUN" == true ]]; then
      say "Would load $(basename "$tarball")"
    else
      say "Loading $(basename "$tarball")"
      docker load -i "$tarball" >/dev/null
    fi
  done

  # The bundle records its settings with __BUNDLE__ standing in for its own
  # location, because where it ends up on this machine is not knowable when it
  # is built. Substituting here is what lets it be copied anywhere.
  while IFS= read -r line; do
    [[ "$line" =~ ^[[:space:]]*# ]] && continue
    [[ "$line" =~ ^[[:space:]]*$ ]] && continue
    key="${line%%=*}"
    value="${line#*=}"
    value="${value%\'}"
    value="${value#\'}"
    value="${value//__BUNDLE__/${OFFLINE_DIR}}"
    # Not a setting - it is how this script knew which services to install.
    [[ "$key" == "NEXUSAI_BUNDLE_SERVICES" ]] && continue
    if [[ "$key" == *_IMAGE ]] && [[ "$DRY_RUN" == false ]]; then
      docker image inspect "$value" >/dev/null 2>&1 ||
        die "The bundle names ${value} for ${key}, but no tarball in it carries that image."
    fi
    set_key "$key" "$value"
  done < "${OFFLINE_DIR}/offline.env"

  # Nothing is built offline, and nothing is pulled. Saying so up front means a
  # missing image fails here, by name, rather than as a compose error further on.
  APP_IMAGE="$(grep "^NEXUSAI_IMAGE=" "${OFFLINE_DIR}/offline.env" | head -1 | cut -d= -f2- | tr -d "\'")"
fi

# Prebuilt images, if any were loaded. Unlike the keys above these replace an
# existing value: pointing the deployment at a different image is the whole reason
# the flag was passed.
STT_IMAGE=""
TTS_IMAGE=""
if [[ -n "$PREBUILT_TAG" ]]; then
  # The tags build-arm64.sh writes. --app-image still wins if both are given.
  APP_IMAGE="${APP_IMAGE:-nexusai:${PREBUILT_TAG}}"
  if want speech; then
    STT_IMAGE="nexusai-thai-stt:${PREBUILT_TAG}"
    TTS_IMAGE="nexusai-thai-tts:${PREBUILT_TAG}"
  fi
fi

set_image NEXUSAI_IMAGE "$APP_IMAGE" "App image"
set_image THAI_STT_IMAGE "$STT_IMAGE" "Thai STT image"
set_image THAI_TTS_IMAGE "$TTS_IMAGE" "Thai TTS image"

# Hardware-dependent, and the reason this script exists.
if want image; then
  set_if_missing SDCPP_IMAGE_TAG "$SDCPP_TAG"
fi
if want llm; then
  set_if_missing LLAMACPP_IMAGE_TAG "$LLAMACPP_TAG"

  # Defaults sized to the machine rather than to the smallest machine that could
  # run this. The conservative numbers in the compose files are right for a
  # workstation GPU with 12 or 16GB; a Spark has 128GB shared between CPU and GPU
  # and was being held to the same limits, which cost a model reload every time
  # two workspaces on different models took turns.
  #
  # Keyed off measured memory, not off the architecture, so an arm64 board that
  # is not a Spark keeps the safe values.
  if [[ -n "$GPU_MEM_MB" && "$GPU_MEM_MB" -ge 65536 ]]; then
    # How many models may be resident at once. One per model in the catalogue
    # means switching between workspaces never unloads anything. llama-server's
    # own default is 4; the compose file says 1 because it cannot know the
    # hardware, and this is where that becomes knowable.
    models_in_use="$(env_value LLAMACPP_MODELS)"
    [[ -n "$models_in_use" ]] || models_in_use="qwen3.8-27b,gpt-oss-20b,gemma-4-12b"
    models_count="$(echo "$models_in_use" | tr ',' '\n' | grep -c .)"
    set_if_missing LLAMACPP_MODELS_MAX "$models_count"

    # Context window per model. 8192 is the safe default; the weights here total
    # about 37GB, so the extra KV cache at 16384 is affordable on this machine and
    # is what lets a long retrieved context survive the trip. Nexus AI's own token
    # limit follows this value, so there is only the one number to change.
    set_if_missing LLAMACPP_CTX "16384"

    # Read back rather than repeated: set_if_missing leaves an existing value
    # alone, so announcing what was asked for would misreport a machine that had
    # already been tuned by hand.
    eff_max="$(env_value LLAMACPP_MODELS_MAX)"
    eff_ctx="$(env_value LLAMACPP_CTX)"
    say "Sized for ${GPU_MEM_MB}MiB of GPU memory: up to ${eff_max} model(s) resident, ${eff_ctx}-token context."
  elif [[ -n "$GPU_MEM_MB" ]]; then
    say "GPU memory is ${GPU_MEM_MB}MiB - keeping the conservative model and context limits."
  fi
fi
if want speech; then
  set_if_missing THAI_SPEECH_TORCH_INDEX_URL "$TORCH_INDEX"
fi

# --- which compose files -----------------------------------------------------

FILES=("docker-compose.yml")
if want llm; then
  FILES+=("docker-compose.llamacpp.yml")
  if [[ "$SINGLE_MODEL" == false ]]; then
    FILES+=("docker-compose.llamacpp-models.yml")
  fi
fi
if want image; then FILES+=("docker-compose.sdcpp.yml"); fi
if want speech; then FILES+=("docker-compose.thai-speech.yml"); fi

COMPOSE_LIST="$(IFS=:; echo "${FILES[*]}")"

# Written into docker/.env so a plain `docker compose up -d` in this directory
# does the same thing afterwards, without anyone having to remember the flags.
# COMPOSE_PATH_SEPARATOR keeps the ':' working on Windows, where compose would
# otherwise expect ';'.
if has_key COMPOSE_FILE; then
  say "COMPOSE_FILE is already set in ${ENV_FILE} - leaving it alone."
else
  ADDED+=("COMPOSE_PATH_SEPARATOR" "COMPOSE_FILE")
  if [[ "$DRY_RUN" == false ]]; then
    {
      echo
      echo "# Written by docker/install.sh: fold the local-service overlays into every"
      echo "# plain \`docker compose\` command run in this directory."
      printf "COMPOSE_PATH_SEPARATOR=':'\n"
      printf "COMPOSE_FILE='%s'\n" "$COMPOSE_LIST"
    } >> "$ENV_FILE"
  fi
fi

COMPOSE=(docker compose)
for f in "${FILES[@]}"; do COMPOSE+=(-f "$f"); done

# --- report and act ----------------------------------------------------------

say "Compose files: ${COMPOSE_LIST}"
if [[ ${#ADDED[@]} -gt 0 ]]; then
  say "Keys added to ${ENV_FILE}: ${ADDED[*]}"
else
  say "${ENV_FILE} already had everything this script sets."
fi

if [[ "$DRY_RUN" == true ]]; then
  say "Dry run - nothing was written or started."
  exit 0
fi

# Only some services are built here; llama.cpp and stable-diffusion.cpp are
# prebuilt images and `up` pulls them. With --app-image the app is prebuilt too,
# so name the remaining services rather than letting compose build everything.
BUILD_TARGETS=()
if [[ "$OFFLINE" == true ]]; then
  # Every image came out of the bundle. A build here would need a network for
  # its base images, which is precisely what this host does not have.
  say "Offline: nothing will be built and nothing will be pulled."
else
  if [[ -z "$APP_IMAGE" ]]; then BUILD_TARGETS+=(nexusai); fi
  if want speech; then
    if [[ -z "$STT_IMAGE" ]]; then BUILD_TARGETS+=(thai-stt); fi
    if [[ -z "$TTS_IMAGE" ]]; then BUILD_TARGETS+=(thai-tts); fi
  fi
fi

if [[ ${#BUILD_TARGETS[@]} -eq 0 ]]; then
  say "Nothing to build - every image is prebuilt."
else
  say "Building: ${BUILD_TARGETS[*]}. The Thai speech images carry a CUDA torch stack and take a while."
  "${COMPOSE[@]}" build "${BUILD_TARGETS[@]}"
fi

# Every rebuild leaves the previous layers behind as a dangling "<none>" image.
# On Windows these accumulate inside the Docker Desktop virtual disk, which does
# not shrink back on its own. Same reasoning as build.sh.
#
# The build cache is left alone on purpose: discarding it makes the next rebuild
# after a code edit as slow as a cold one. `docker builder prune` reclaims it
# when the disk needs it.
docker image prune -f >/dev/null

if [[ "$START" == false ]]; then
  say "Built. Start it when you are ready with:"
  say "  cd docker && docker compose up -d"
  exit 0
fi

if [[ "$OFFLINE" == true ]]; then
  say "Starting from the bundle. Nothing is downloaded; the model servers still"
  say "take a few minutes to read tens of gigabytes of weights off the disk."
else
  say "Starting. The first run downloads model weights - tens of gigabytes if you"
  say "kept the defaults - so give it time before deciding something is wrong."
fi
"${COMPOSE[@]}" up -d

# The model servers wait on a one-shot downloader through
# `depends_on: service_completed_successfully`, and `up -d` does not reliably come
# back to start them once that job finishes: on a first install they were left
# sitting in "created" while the downloader had exited 0 twenty minutes earlier,
# with nothing listening on the LLM port and nothing saying why. So check, and
# either finish the job or say plainly what is still outstanding.
created_services() {
  "${COMPOSE[@]}" ps -a --status created --format '{{.Service}}' 2>/dev/null | sort -u
}
running_downloaders() {
  "${COMPOSE[@]}" ps --status running --format '{{.Service}}' 2>/dev/null |
    grep -- '-models$' | sort -u
}

finish_pending() {
  local pending
  pending="$(created_services | tr '
' ' ')"
  [[ -z "${pending// /}" ]] && return 0
  say "Starting services that were waiting on their downloads: ${pending}"
  "${COMPOSE[@]}" up -d
  pending="$(created_services | tr '
' ' ')"
  [[ -z "${pending// /}" ]]
}

if [[ "$WAIT_FOR_MODELS" == true ]]; then
  # Bounded so a stalled download cannot wedge the installer forever.
  deadline=$(( $(date +%s) + WAIT_TIMEOUT_S ))
  while :; do
    busy="$(running_downloaders | tr '
' ' ')"
    [[ -z "${busy// /}" ]] && break
    if [[ $(date +%s) -ge $deadline ]]; then
      warn "Still downloading after ${WAIT_TIMEOUT_S}s: ${busy}"
      warn "Leaving it running. Finish with: cd docker && docker compose up -d"
      break
    fi
    say "Waiting on ${busy} - watch it with: docker compose logs -f ${busy%% *}"
    sleep 60
  done
fi

if ! finish_pending; then
  echo
  warn "These services are created but not started: $(created_services | tr '
' ' ')"
  warn "Their model download is still running. When it finishes, run:"
  warn "  cd docker && docker compose up -d"
  warn "Nothing is wrong. Repeating up -d is safe and starts only what is left."
fi

echo
say "Up. The app is on http://localhost:3001"
# Written as `if` rather than `want x && say ...`: a short-circuited AND-OR list
# is the script's last statement in some option combinations, and its non-zero
# status would end the run under `set -e`.
if want llm; then say "  llama.cpp      http://localhost:${LLAMACPP_PUBLISH_PORT:-8082}/health"; fi
if want image; then say "  image (FLUX)   http://localhost:${SDCPP_PUBLISH_PORT:-7861}/v1/models"; fi
if want speech; then
  say "  Thai STT       http://localhost:${THAI_STT_PUBLISH_PORT:-7871}/health"
  say "  Thai TTS       http://localhost:${THAI_TTS_PUBLISH_PORT:-7872}/health"
fi
say "Follow the downloads with: cd docker && docker compose logs -f"
# The repository ships a male and a female reference clip, so this is now a real
# check rather than a standing warning: it fires only if that directory is empty,
# which means someone pointed THAI_TTS_VOICES_DIR somewhere else.
if want speech; then
  voices_dir="${THAI_TTS_VOICES_DIR:-./thai-speech/voices}"
  if ! compgen -G "${voices_dir}/*.wav" >/dev/null; then
    echo
    warn "Text to speech has no voice: ${voices_dir} holds no .wav file."
    warn "Put a reference clip and its transcript there as <name>.wav and"
    warn "<name>.txt - see the README in that directory. Until then the TTS"
    warn "service reports 'no-voices' and refuses every request."
  fi
fi

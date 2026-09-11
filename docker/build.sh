#!/usr/bin/env bash
# Builds the docker-compose service(s) given as arguments, then prunes the
# dangling images and build cache the build left behind.
#
# Without this, every rebuild during iterative development leaves the
# previous image's layers behind as a dangling "<none>" image - these
# accumulate fast and, on Windows/WSL2, bloat the Docker Desktop virtual disk
# (docker_data.vhdx) which does not shrink back on its own even after the
# images are removed. Run this instead of a bare `docker compose build`.
#
# Only dangling images are pruned, never the build cache. Measured on this
# repository: a rebuild after a code edit takes seconds with the cache and as
# long as a cold build without it, because `docker builder prune` discards the
# dependency-install layers too. Pass --prune when you actually want that space
# back and are willing to pay for the next build.
#
# With no arguments it builds every service in the project that has a build
# context: the app, and the Thai speech services when their overlay is active.
# llama.cpp and stable-diffusion.cpp are prebuilt images and are pulled by `up`,
# not built here.
#
# Which services are in the project comes from COMPOSE_FILE in docker/.env, which
# docker/install.sh sets. Without it this sees the app alone - pass the overlays
# by hand, or run install.sh first.
#
#   docker/build.sh                    everything buildable
#   docker/build.sh nexusai            just the app
#   docker/build.sh thai-stt thai-tts  just the speech services
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"

PRUNE_CACHE=false
ARGS=()
for arg in "$@"; do
  case "$arg" in
    --prune) PRUNE_CACHE=true ;;
    *) ARGS+=("$arg") ;;
  esac
done

docker compose build "${ARGS[@]+"${ARGS[@]}"}"
docker image prune -f

if [[ "$PRUNE_CACHE" == true ]]; then
  docker builder prune -f
fi

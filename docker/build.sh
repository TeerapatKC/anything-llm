#!/usr/bin/env bash
# Builds the docker-compose service(s) given as arguments (default: nexusai),
# then prunes dangling images and unused build cache left behind by the build.
#
# Without this, every rebuild during iterative development leaves the
# previous image's layers behind as a dangling "<none>" image - these
# accumulate fast and, on Windows/WSL2, bloat the Docker Desktop virtual disk
# (docker_data.vhdx) which does not shrink back on its own even after the
# images are removed. Run this instead of a bare `docker compose build`.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"

SERVICE="${1:-nexusai}"

docker compose build "$SERVICE"
docker image prune -f
docker builder prune -f

# syntax=docker/dockerfile:1
# Speech-to-text: a Whisper fine-tune behind the OpenAI transcription API.
#
# The CUDA build of torch is selected here rather than fixed, because the right
# one depends on the GPU this runs on:
#
#   cu128  - default; most current NVIDIA cards, x86_64 and arm64
#   cu130  - CUDA 13 parts, including the GB10 in a DGX Spark
#   cpu    - no GPU. Workable for this model, unlike image generation: expect
#            a few seconds of processing per spoken minute rather than minutes.
#
# The CUDA userspace libraries ride along inside the torch wheels, so a plain
# python base is enough - the driver comes from the host through the NVIDIA
# container toolkit.
FROM python:3.11-slim

ARG TORCH_INDEX_URL=https://download.pytorch.org/whl/cu128

ENV PYTHONUNBUFFERED=1 \
    HF_HOME=/home/app/.cache/huggingface

# ffmpeg decodes whatever container the browser recorded in. The collector
# converts to WAV when it can, but it forwards the original when it cannot, and
# this is the side that has to cope with that.
RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg curl \
    && rm -rf /var/lib/apt/lists/*

# Weights are not baked into the image - the compose file mounts a named volume
# over this cache so the download survives rebuilds. Creating the directory here,
# owned by the runtime user, is what gives that volume the same ownership.
RUN groupadd --gid 1000 app \
    && useradd --uid 1000 --gid 1000 --create-home app \
    && mkdir -p ${HF_HOME} \
    && chown -R app:app /home/app

WORKDIR /app

RUN --mount=type=cache,target=/root/.cache/pip pip install --index-url ${TORCH_INDEX_URL} torch

COPY requirements.txt ./
# The cache mount keeps pip's downloads in the builder rather than the image, so
# a rebuild that only changes requirements.txt does not re-fetch the CUDA wheels.
RUN --mount=type=cache,target=/root/.cache/pip pip install -r requirements.txt

COPY server.py ./

USER app
EXPOSE 8000

# Answers while the weights are still downloading, so a slow first start reads as
# "starting" rather than as a crash loop.
HEALTHCHECK --interval=30s --timeout=10s --retries=3 --start-period=1800s \
  CMD curl -fsS http://127.0.0.1:8000/health | grep -q '"status":"ready"'

CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000"]

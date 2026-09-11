# syntax=docker/dockerfile:1
# Multilingual VoxCPM2 text-to-speech behind the OpenAI speech API.
#
# VoxCPM2 supports Thai, English, Japanese and 27 other languages, including
# zero-shot voice cloning. Its code and weights are Apache-2.0.
#
# The CUDA build of torch is selected here rather than fixed:
#
#   cu128  - default; most current NVIDIA cards, x86_64 and arm64
#   cu130  - CUDA 13 parts, including the GB10 in a DGX Spark
#   cpu    - no GPU. Synthesis becomes slow enough to be impractical for chat.
FROM python:3.11-slim

ARG TORCH_INDEX_URL=https://download.pytorch.org/whl/cu128
ENV PYTHONUNBUFFERED=1 \
    HF_HOME=/home/app/.cache/huggingface

# ffmpeg and libsndfile read and write the audio.
RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg libsndfile1 curl \
    && rm -rf /var/lib/apt/lists/*

RUN groupadd --gid 1000 app \
    && useradd --uid 1000 --gid 1000 --create-home app \
    && mkdir -p ${HF_HOME} \
    && chown -R app:app /home/app

WORKDIR /app

# Install the model runtime and the HTTP layer.
COPY requirements.txt ./
RUN --mount=type=cache,target=/root/.cache/pip pip install -r requirements.txt

# Torch last so the selected CUDA build wins over any generic dependency wheel.
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install --index-url ${TORCH_INDEX_URL} --force-reinstall torch torchaudio

COPY server.py ./

USER app
EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --retries=3 --start-period=1800s \
  CMD curl -fsS http://127.0.0.1:8000/health | grep -q '"status":"ready"'

CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000"]

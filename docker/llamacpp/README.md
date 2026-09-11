# A local LLM via llama.cpp

Runs [llama.cpp](https://github.com/ggml-org/llama.cpp)'s `llama-server` on GGUF
weights and points Nexus AI at it through the Generic OpenAI provider. The model
is named `nexus-llm` over the API no matter which GGUF is loaded, so swapping
models never invalidates the setting in Nexus AI.

## No adapter needed

`llama-server` serves `POST /v1/chat/completions` and `GET /v1/models` in the
OpenAI shape, which is exactly what `server/utils/AiProviders/genericOpenAi`
calls. The model dropdown in Settings reads `/v1/models` and will show
`nexus-llm` once the server is up.

Tool calling works: `--jinja` is on by default in current builds, which is what
Nexus AI's agents need. Whether tools actually work well is a property of the
model you load, not of the server.

## Start it

```bash
cd docker
docker compose -f docker-compose.yml -f docker-compose.llamacpp.yml up -d
```

The first start downloads the model into the `llamacpp-models` volume, which
survives recreates. Follow it with `docker compose logs -f llamacpp`. Readiness is
the container's own healthcheck, or `curl localhost:8082/health`.

That serves one model. To serve several and let each workspace choose, see
[Serving several models at once](#serving-several-models-at-once) below.

Pick the image tag for your hardware with `LLAMACPP_IMAGE_TAG` in `docker/.env`:

| Tag | For |
| --- | --- |
| `server-cuda` (default) | NVIDIA, both x86_64 and arm64 |
| `server-vulkan` | AMD, Intel |
| `server` | CPU only. Drop the `deploy` block too |

## Nexus AI is pointed at it for you

The overlay fills in `/settings/llm-preference`, so the page comes up on Generic
OpenAI with the base URL `http://llamacpp:8080/v1` and the model `nexus-llm`
already chosen. The host name is the compose service, not localhost, because the
backend reaches it across the compose network.

These are defaults, not overrides. The order that decides what the backend
actually uses:

1. Anything set for that key in `docker/.env` wins.
2. Otherwise the overlay's default applies.

Saving on the Settings page writes the value into `docker/.env`, which puts it in
the first group - so a choice made in the UI survives the next `up`, and the
default quietly steps aside. To go back to the default, delete the key from
`docker/.env`.

One value is worth checking by hand: `GENERIC_OPEN_AI_MODEL_TOKEN_LIMIT`, default
8192 to match `LLAMACPP_CTX`. Nexus AI sizes history and context off it, and a
value larger than the server's own window gets requests truncated on arrival.

This works with either base file. `docker-compose.split.yml` calls its backend
`nexusai` as well, so the same overlay patches both deployments.

## Choosing a model

`LLAMACPP_MODEL` takes anything llama.cpp's `-hf` accepts, which is
`<user>/<repo>[:quant]` on Hugging Face. The default is
`unsloth/Qwen3-4B-Instruct-2507-GGUF:Q4_K_M`, about 2.5GB, chosen to start
quickly on modest hardware rather than to be the best thing you can run.

Rough guide to what fits, at Q4_K_M and 8k context:

| Model size | GPU memory |
| --- | --- |
| 4B | ~4GB |
| 8B | ~7GB |
| 14B | ~11GB |
| 32B | ~22GB |

Anything that does not fit spills to system RAM and slows down sharply. On a box
with large unified memory, such as a DGX Spark, that ceiling is much higher than
the table suggests. `LLAMACPP_GPU_LAYERS` caps how many layers go to the GPU; the
default of 999 means all of them, and lowering it is how you fit a model that is
otherwise too big - at the cost of speed for every layer left on the CPU.

Gated repositories need `HF_TOKEN` in `docker/.env`. Most GGUF mirrors are open
and need nothing.

## Using GGUF files you already have

Point the mount at your own directory and name a file inside it, and set the
download variable to empty so it does not take precedence:

```
LLAMACPP_MODELS_DIR='D:/work/llm/models'
LLAMACPP_MODEL=''
LLAMACPP_MODEL_FILE='/models/Llama-3.2-3B-Instruct-Q4_K_M.gguf'
```

`LLAMACPP_MODEL_FILE` is a path inside the container, so it starts with
`/models/` whatever the host directory is called. The empty `LLAMACPP_MODEL`
matters: leave it out and the Hugging Face download wins over the local file.

## Serving several models at once

`docker-compose.llamacpp-models.yml` switches this service into llama-server's
router mode: it advertises a set of models and loads one on demand when a request
names it. All of them appear in the model dropdown in Nexus AI, so a workspace
picks its own.

```bash
cd docker
docker compose -f docker-compose.yml -f docker-compose.llamacpp.yml   -f docker-compose.llamacpp-models.yml up -d
```

Three models are set up, about 37GB of weights together:

| Name | Quantization | Size | Notes |
| --- | --- | --- | --- |
| `qwen3.8-27b` | UD-Q4_K_XL | 17.6GB | the strongest of the three, and the slowest |
| `gpt-oss-20b` | MXFP4 | 12.1GB | trained for this format, so there is only the one file |
| `gemma-4-12b` | QAT q4_0 | 7.2GB | smallest, and the only one that can see images |

A companion container downloads them and writes the preset file the server reads.
It generates that file rather than shipping one, so a model can never be
advertised before its weights are on disk. `LLAMACPP_MODELS` in `docker/.env`
picks a subset:

```
LLAMACPP_MODELS='gemma-4-12b,gpt-oss-20b'
```

Only one model is resident at a time by default, which is what keeps three large
models on one card from colliding. Switching between them costs a reload pause of
a few seconds. Raise `LLAMACPP_MODELS_MAX` if you have the memory to keep more
than one loaded.

### About each one

**Qwen3.8-27B** is the most capable and the heaviest. The `UD-` prefix is
Unsloth's dynamic quantization, which spends more bits on the layers that need
them. Other quantizations from the same repository go in `LLAMACPP_QWEN_FILE`:

| File | Size |
| --- | --- |
| `Qwen3.8-27B-UD-Q4_K_XL.gguf` | 17.6GB |
| `Qwen3.8-27B-UD-Q4_K_M.gguf` | 16.5GB |
| `Qwen3.8-27B-UD-Q5_K_XL.gguf` | 20.9GB |
| `Qwen3.8-27B-UD-Q6_K.gguf` | 22.0GB |
| `Qwen3.8-27B-UD-IQ2_S.gguf` | 8.4GB |

**gpt-oss-20b** is released in MXFP4 already, so the usual ladder of
quantizations does not exist for it - `ggml-org/gpt-oss-20b-GGUF` holds one model
file. The `eagle3-` files in that repository are speculative-decoding drafts
rather than the model, which is why the download names the file explicitly.

**Gemma 4 12B** comes from Google's quantization-aware training: the model was
trained to be quantized, so it gives up less at four bits than a plain post-hoc
quantization would. It is also multimodal, and the download fetches its vision
encoder alongside the weights, wired up in the preset as `mmproj`. That is what
lets Nexus AI send it an image attachment.

### Adding another model

Add a case to `fetch-models.sh` with its repository and filename. The preset it
writes uses llama-server's own long flags without the dashes, one section per
model:

```ini
[my-model]
model = /models/my-model-Q4_K_M.gguf
ctx-size = 8192
```

Any flag works there, so per-model context sizes, GPU layer counts and vision
encoders all belong in the section rather than in the service's environment.

## Embeddings

Nexus AI embeds with its own built-in model by default, and that is fine. If you
want llama.cpp doing it instead, run a second instance: `--embedding` puts
llama-server into embedding-only mode, so it cannot be the same process that
serves chat. Add this to the overlay:

```yaml
  llamacpp-embed:
    image: ghcr.io/ggml-org/llama.cpp:${LLAMACPP_IMAGE_TAG:-server-cuda}
    container_name: nexusai-llamacpp-embed
    environment:
      LLAMA_CACHE: /models
    command: >
      -hf ${LLAMACPP_EMBED_MODEL:-ggml-org/embeddinggemma-300M-GGUF}
      -a nexus-embed
      --embedding
      --port 8080
    volumes:
      - "llamacpp-models:/models"
    networks:
      - nexusai
    restart: unless-stopped
```

Then set `EMBEDDING_ENGINE='generic-openai'` and
`EMBEDDING_BASE_PATH='http://llamacpp-embed:8080/v1'` in `docker/.env`. Changing
the embedding model means re-embedding every document you have already ingested.

## Tuning

The settings live in the `environment:` block of
`docker/docker-compose.llamacpp.yml` as `LLAMA_ARG_*` variables. Every
llama-server flag has one, and an empty value is ignored exactly as if the flag
had not been passed - which is what lets one service definition cover both model
sources. `llama-server --help` in the image lists them all next to their flags:

```bash
docker run --rm ghcr.io/ggml-org/llama.cpp:server --help
```

Worth knowing: `-np` sets how many requests the server handles at once, splitting
the context window between them. `-ctk`/`-ctv` quantize the KV cache, which buys
back memory at long context lengths.

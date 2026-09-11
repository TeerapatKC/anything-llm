# FLUX.1-schnell via stable-diffusion.cpp

Runs FLUX.1-schnell through
[stable-diffusion.cpp](https://github.com/leejet/stable-diffusion.cpp), a ggml
C++ engine working on quantized GGUF weights. A prebuilt ~2.4GB image and ~17GB
of weights, with no torch stack to build and no Hugging Face token to obtain. The
cost is quantization: output is a little behind what the full bf16 weights give.

## No adapter needed

`sd-server` already serves `POST /v1/images/generations` and `GET /v1/models` in
the OpenAI shape, which is exactly what the LocalAI provider in
`server/utils/ImageGenerators` calls. So there is no service of ours in between,
only an image and some flags.

It does not implement LocalAI's `/v1/models/capabilities`, so the model dropdown
in Settings finds nothing and falls back to a free-text box. Type any name you
like. `sd-server` hosts whatever model it was started with and does not check the
one you send.

## Start it

```bash
cd docker
docker compose -f docker-compose.yml -f docker-compose.sdcpp.yml up -d
```

Two containers come up. `nexusai-sdcpp-models` downloads the four weight files
and exits; `nexusai-sdcpp` waits for it to finish, then loads them and serves.
Follow the download with `docker compose logs -f sdcpp-models`. Since there is no
health endpoint, readiness is `curl localhost:7861/v1/models`.

Pick the image tag for your hardware with `SDCPP_IMAGE_TAG` in `docker/.env`:

| Tag | For |
| --- | --- |
| `master-cuda` (default) | x86_64 NVIDIA |
| `master-cuda-spark` | arm64 NVIDIA, built for the GB10 in a DGX Spark |
| `master-vulkan` | AMD, Intel, anything else. Drop the `deploy` block too |

## Nexus AI is pointed at it for you

The overlay fills in `/settings/image-generation-preference`, so the page comes
up on LocalAI with the base URL `http://sdcpp:8080/v1` already set. The host name
is the compose service, not localhost, because the backend reaches it across the
compose network. Then `/img a red fox in snow` in any workspace.

These are defaults, not overrides: anything set for the same key in `docker/.env`
wins, and saving on the Settings page writes the value there - so a choice made
in the UI survives the next `up`. Delete the key from `docker/.env` to go back to
the default.

This works with either base file. `docker-compose.split.yml` calls its backend
`nexusai` as well, so the same overlay patches both deployments.

## Where the weights come from

`second-state/FLUX.1-schnell-GGUF`, which carries the transformer, the VAE and
both text encoders in one ungated Apache-2.0 repository. Keeping every required
file in this repository also avoids token-gated upstream downloads.

Defaults and what they cost:

| File | Default | Size |
| --- | --- | --- |
| Transformer | `flux1-schnell-Q4_0.gguf` | 6.7GB |
| Text encoder | `t5xxl_fp16.safetensors` | 9.8GB |
| Text encoder | `clip_l.safetensors` | 0.25GB |
| VAE | `ae.safetensors` | 0.34GB |

`SDCPP_DIFFUSION_MODEL` and `SDCPP_T5XXL` pick other files from that repository.
`flux1-schnell-Q8_0.gguf` costs 12.6GB and gives up less to quantization;
`t5xxl-Q8_0.gguf` saves 4.6GB on the prompt encoder. Change either and the
downloader fetches the new file on the next `up`, leaving the old one in the
volume.

## Tuning

The generation flags live in the `command:` block of
`docker/docker-compose.sdcpp.yml`. Four steps at `--cfg-scale 1.0` is what
schnell is distilled for, and `sd-server`'s own defaults of twenty steps at 7.0
would be both slower and wrong for it. The OpenAI request body has no field for
either, so they are fixed at startup rather than per request.

If a generation runs out of GPU memory, add `--offload-to-cpu` to keep weights in
RAM, `--backend te=cpu` to run the text encoders on the CPU, or `--vae-tiling` to
decode in tiles. `sd-server --help` in the image lists the rest:

```bash
docker run --rm --entrypoint /sd-server ghcr.io/leejet/stable-diffusion.cpp:master-cuda --help
```

## Limits

FLUX.1-schnell is text to image. `sd-server` does serve `/v1/images/edits`, but
the LocalAI provider in Nexus AI never calls it - it drops reference images and
says so in the reply. Reaching that endpoint would take a provider change on the
Nexus AI side plus an editing model such as FLUX.1-Kontext on this one.

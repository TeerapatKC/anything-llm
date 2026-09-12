# speech recognition and multilingual speech synthesis

Two services that let Nexus AI listen and talk, both wired in through the
generic OpenAI providers the backend already has:

| | Model | Licence | Route it serves |
| --- | --- | --- | --- |
| `stt` | `typhoon-ai/typhoon-whisper-large-v3` | MIT | `/v1/audio/transcriptions` |
| `tts` | `openbmb/VoxCPM2` | Apache-2.0 | `/v1/audio/speech` |

They are independent. Run one, the other, or both.

## TTS language and licence

VoxCPM2 code and weights are Apache-2.0 and may be used commercially. It supports
30 languages, including Thai, English, and Japanese, without a language tag. The
licence does not grant permission to clone a person's voice: only use reference
recordings whose speaker has consented to the intended use.

This service uses VoxCPM2's high-fidelity cloning mode. It needs a short reference
recording plus an exact transcript before it can say anything. See
[voices/README.md](voices/README.md) for what to put where.

## Start them

```bash
cd docker
docker compose -f docker-compose.yml -f docker-compose.speech.yml up -d
```

Add `stt` or `tts` to that command to bring up only one. First start
downloads the weights into the `speech-models` volume, which survives
rebuilds. Readiness is `curl localhost:7871/health` and `curl localhost:7872/health`.

On a DGX Spark or anything else on CUDA 13, build against that index:

```bash
SPEECH_TORCH_INDEX_URL=https://download.pytorch.org/whl/cu130 docker compose -f docker-compose.yml -f docker-compose.speech.yml build
```

## Nexus AI is pointed at them for you

The overlay fills in `/settings/audio-preference`, so the page comes up with both
halves on Generic OpenAI and the endpoints `http://stt:8000/v1` and
`http://tts:8000/v1` already set. The host names are the compose services,
not localhost, because the backend reaches them across the compose network.

These are defaults, not overrides: anything set for the same key in `docker/.env`
wins, and saving on the Settings page writes the value there - so a choice made
in the UI survives the next `up`. Delete the key from `docker/.env` to go back to
the default.

The included FLEURS reference pairs are named `female` and `male`, with `female`
selected by default. Set `TTS_DEFAULT_VOICE=male` to switch it, or add a
different WAV/TXT pair and set the variable to that filename stem.

This works with either base file. `docker-compose.split.yml` calls its backend
`nexusai` as well, so the same overlay patches both deployments.

## Transcription

The default model is Whisper large-v3 fine-tuned on Thai, about 3GB and roughly
1.5GB of GPU memory in fp16. `STT_MODEL_ID` takes any Whisper checkpoint:

| Model | Size | Trade |
| --- | --- | --- |
| `typhoon-ai/typhoon-whisper-large-v3` | 3.1GB | the default |
| `typhoon-ai/typhoon-whisper-turbo` | 1.6GB | several times faster, less accurate |
| `typhoon-ai/typhoon-whisper-medium` | 1.5GB | smaller still |

The language is pinned to Thai by default. Whisper can detect it on its own, but
on the short clips a chat recording produces it sometimes guesses wrong and
transcribes into the wrong language entirely. Set `STT_LANGUAGE` empty to
let it decide, or to another language code to pin that one instead.

Audio arrives in whatever container the browser recorded. The collector converts
to WAV when it has ffmpeg; when it does not, the original is forwarded and
decoded here, which is why the image installs ffmpeg of its own.

## Synthesis

Beyond the voices themselves, the knobs worth touching are in
`docker-compose.speech.yml` and the service's own environment:

- `TTS_CFG_VALUE`, 2.0 by default. Higher follows the reference more closely,
  while lower allows more variation.
- `TTS_INFERENCE_TIMESTEPS`, 10 by default. More steps may improve quality but
  take longer.
- `TTS_NORMALIZE_TEXT`, enabled by default for numbers and abbreviations.
- `TTS_LOAD_DENOISER`, disabled by default. Its additional model and licence must
  be reviewed separately before commercial deployment.
- `TTS_MAX_INPUT_CHARS`, 2000. Long inputs are slow and drift; Nexus AI reads
  whole chat messages aloud, so this bites in practice.

`GET /v1/voices` on the service lists what it picked up, including clips it had
to ignore for want of a transcript.

## Both models are ungated

Neither needs a Hugging Face token. `HF_TOKEN` is passed through only so that
`STT_MODEL_ID` can point at a gated checkpoint if you ever want it to.

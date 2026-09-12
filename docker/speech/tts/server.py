"""
Multilingual text-to-speech behind the OpenAI speech API.

Nexus AI's generic OpenAI TTS provider (server/utils/TextToSpeech/openAiGeneric)
posts {model, voice, input} to /v1/audio/speech and plays back whatever bytes
come out. Serving that shape is the whole integration.

Two routes matter:

    POST /v1/audio/speech   what the provider calls
    GET  /v1/models         what the model dropdown in Settings reads

VoxCPM2 can design voices, but this service deliberately uses its high-fidelity
voice-cloning mode so named voices remain stable. Every voice is a short reference
recording plus a transcript of exactly what is said in it:

    voices/<name>.wav   3 to 30 seconds of clean speech
    voices/<name>.txt   exactly what that clip says, in any supported language

The service reads that directory at startup and again whenever a voice it does
not know is asked for, so adding one does not need a restart. With no voices
present it starts and reports itself unhealthy rather than failing silently at
the first request.

VoxCPM2 code and weights are Apache-2.0 and support commercial use. The person in
the reference recording must still have consented to voice cloning and the
intended use.
"""

import contextlib
import os
import tempfile
import threading
import time
from pathlib import Path

from fastapi import FastAPI, Header, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel

# Loaded once and reused. PIPELINE_LOCK serializes GPU work: the pipeline is not
# safe to call from two threads at once. FastAPI runs the sync route in a
# threadpool, so waiting here blocks the caller rather than the event loop.
PIPELINE = None
PIPELINE_LOCK = threading.Lock()
STATE = {"status": "loading", "error": None}

MODEL_ID = os.getenv("TTS_MODEL_ID", "openbmb/VoxCPM2")
# What this service calls itself over the wire. It is what you put in
# TTS_OPEN_AI_COMPATIBLE_MODEL, and what the Settings dropdown lists.
MODEL_NAME = os.getenv("TTS_MODEL_NAME", "voxcpm2")
API_KEY = os.getenv("TTS_API_KEY") or None

VOICES_DIR = Path(os.getenv("TTS_VOICES_DIR", "/voices"))
DEFAULT_VOICE = os.getenv("TTS_DEFAULT_VOICE") or None

CFG_VALUE = float(os.getenv("TTS_CFG_VALUE", "2.0"))
INFERENCE_TIMESTEPS = int(os.getenv("TTS_INFERENCE_TIMESTEPS", "10"))
NORMALIZE_TEXT = os.getenv("TTS_NORMALIZE_TEXT", "true").lower() in {
    "1",
    "true",
    "yes",
}
LOAD_DENOISER = os.getenv("TTS_LOAD_DENOISER", "false").lower() in {
    "1",
    "true",
    "yes",
}
DEVICE = os.getenv("TTS_DEVICE", "auto")
# Long inputs are slow and drift; Nexus AI reads whole chat messages aloud, so
# this is a real limit rather than a theoretical one.
MAX_INPUT_CHARS = int(os.getenv("TTS_MAX_INPUT_CHARS", "2000"))


@contextlib.asynccontextmanager
async def lifespan(_app):
    # Loading happens off the event loop so the server answers /health during the
    # first download rather than looking dead for the length of it.
    threading.Thread(target=load_pipeline, daemon=True).start()
    yield


app = FastAPI(title="Multilingual text-to-speech", lifespan=lifespan)


def log(message):
    print(f"[multilingual-tts] {message}", flush=True)


def list_voices():
    """
    A voice is a .wav with a .txt of the same name beside it. A .wav on its own is
    reported so the operator can see why it is not usable, rather than having it
    disappear without explanation.
    """
    voices, incomplete = {}, []
    if not VOICES_DIR.is_dir():
        return voices, incomplete
    for wav in sorted(VOICES_DIR.glob("*.wav")):
        transcript = wav.with_suffix(".txt")
        if transcript.is_file() and transcript.read_text(encoding="utf-8").strip():
            voices[wav.stem] = (wav, transcript)
        else:
            incomplete.append(wav.name)
    return voices, incomplete


def resolve_voice(requested):
    """
    Pick the reference clip to clone. Falls back to TTS_DEFAULT_VOICE and then to
    the first voice alphabetically, because Nexus AI sends OpenAI's own voice
    names ('alloy' and friends) when nothing else is configured, and none of them
    will ever match a file here.
    """
    voices, incomplete = list_voices()
    if not voices:
        hint = (
            f" Found {', '.join(incomplete)} without a matching .txt transcript."
            if incomplete
            else ""
        )
        raise HTTPException(
            status_code=503,
            detail=(
                f"No voices are configured. Put a reference clip and its "
                f"transcript in the voices directory as <name>.wav and "
                f"<name>.txt.{hint}"
            ),
        )
    if requested and requested in voices:
        return requested, voices[requested]
    if DEFAULT_VOICE and DEFAULT_VOICE in voices:
        return DEFAULT_VOICE, voices[DEFAULT_VOICE]
    name = next(iter(voices))
    return name, voices[name]


def load_pipeline():
    """
    Build the synthesis pipeline. Runs on a background thread from startup; the
    checkpoint and the vocoder are both pulled from Hugging Face on first use.
    """
    global PIPELINE
    try:
        # Imported inside the try so dependency or device failures are surfaced
        # through /health instead of silently killing the loader thread.
        import torch
        from voxcpm import VoxCPM

        has_cuda = torch.cuda.is_available()
        if not has_cuda:
            log(
                "No CUDA device visible. Falling back to CPU, where synthesis is "
                "slow enough to be impractical for reading chat replies aloud."
            )

        device = DEVICE
        if device == "auto":
            device = "cuda" if has_cuda else "cpu"
        optimize = device.startswith("cuda")

        log(f"Loading {MODEL_ID}. The first run downloads the weights.")
        started = time.time()
        PIPELINE = VoxCPM.from_pretrained(
            MODEL_ID,
            device=device,
            optimize=optimize,
            load_denoiser=LOAD_DENOISER,
        )

        voices, incomplete = list_voices()
        if voices:
            log(f"Voices available: {', '.join(voices)}.")
        else:
            log(
                "No voices configured yet. Add <name>.wav and <name>.txt to the "
                "voices directory - synthesis will fail until you do."
            )
        if incomplete:
            log(f"Ignoring clips with no transcript: {', '.join(incomplete)}.")

        STATE["status"] = "ready"
        log(f"Ready in {time.time() - started:.0f}s. Serving as '{MODEL_NAME}'.")
    except Exception as e:  # surfaced through /health rather than killing the process
        STATE["status"] = "error"
        STATE["error"] = str(e)
        log(f"Failed to load the model: {e}")


def require_key(authorization):
    """
    Optional bearer check. An unset TTS_API_KEY leaves the service open, which is
    the sane default when it is only reachable on the compose network.
    """
    if not API_KEY:
        return
    if authorization != f"Bearer {API_KEY}":
        raise HTTPException(status_code=401, detail="Invalid API key.")


class SpeechRequest(BaseModel):
    input: str
    model: str | None = None
    voice: str | None = None
    # Accepted for OpenAI compatibility. VoxCPM2 always writes WAV and does not
    # expose a numeric speed control; style is inferred from the text/reference.
    response_format: str | None = None
    speed: float | None = None


@app.get("/health")
def health():
    voices, incomplete = list_voices()
    status = STATE["status"]
    # Ready but voiceless is not ready: every request would fail. Saying so here
    # is what makes the container's healthcheck tell the truth.
    if status == "ready" and not voices:
        status = "no-voices"
    return {
        "status": status,
        "model": MODEL_NAME,
        "model_id": MODEL_ID,
        "voices": sorted(voices),
        "voices_missing_transcript": incomplete,
        "error": STATE["error"],
    }


@app.get("/v1/models")
def list_models():
    return {
        "object": "list",
        "data": [
            {
                "id": MODEL_NAME,
                "object": "model",
                "created": 0,
                "owned_by": "openbmb",
            }
        ],
    }


@app.get("/v1/voices")
def voices_route():
    """Not an OpenAI route. Here so you can check what the service picked up."""
    voices, incomplete = list_voices()
    return {"voices": sorted(voices), "missing_transcript": incomplete}


@app.post("/v1/audio/speech")
def speech(body: SpeechRequest, authorization: str = Header(default=None)):
    require_key(authorization)

    if STATE["status"] == "error":
        raise HTTPException(
            status_code=503, detail=f"Model failed to load: {STATE['error']}"
        )
    if PIPELINE is None:
        raise HTTPException(
            status_code=503,
            detail="Model is still loading. The first start downloads the weights.",
        )

    text = (body.input or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Input text is required.")
    if len(text) > MAX_INPUT_CHARS:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Input is {len(text)} characters, over the {MAX_INPUT_CHARS} "
                f"limit. Raise TTS_MAX_INPUT_CHARS if you want longer synthesis."
            ),
        )

    voice_name, (ref_wav, ref_txt) = resolve_voice(body.voice)
    ref_text = ref_txt.read_text(encoding="utf-8").strip()

    started = time.time()
    with tempfile.TemporaryDirectory() as workdir:
        output_path = os.path.join(workdir, "speech.wav")
        with PIPELINE_LOCK:
            try:
                audio = PIPELINE.generate(
                    text=text,
                    prompt_wav_path=str(ref_wav),
                    prompt_text=ref_text,
                    reference_wav_path=str(ref_wav),
                    cfg_value=CFG_VALUE,
                    inference_timesteps=INFERENCE_TIMESTEPS,
                    normalize=NORMALIZE_TEXT,
                    denoise=LOAD_DENOISER,
                )
                import soundfile as sf

                sf.write(output_path, audio, PIPELINE.tts_model.sample_rate)
            except Exception as e:
                log(f"Synthesis failed: {e}")
                raise HTTPException(status_code=500, detail=f"Synthesis failed: {e}")

        if not os.path.exists(output_path):
            raise HTTPException(
                status_code=500, detail="The pipeline produced no audio file."
            )
        audio = Path(output_path).read_bytes()

    log(
        f"Synthesized {len(text)} characters as '{voice_name}' "
        f"in {time.time() - started:.1f}s."
    )
    return Response(content=audio, media_type="audio/wav")

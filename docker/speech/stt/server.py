"""
Speech-to-text behind the OpenAI transcription API.

Nexus AI's generic OpenAI STT provider (server/utils/speechToText/openAiGeneric)
posts multipart audio to /v1/audio/transcriptions and reads `text` off the reply.
Serving that shape is the whole integration - no backend change needed.

Two routes matter:

    POST /v1/audio/transcriptions   what the provider calls
    GET  /v1/models                 what the model dropdown in Settings reads

The default model is typhoon-ai/typhoon-whisper-large-v3, a Thai fine-tune of
Whisper large-v3 under the MIT licence. Any Whisper checkpoint on Hugging Face
works: set STT_MODEL_ID. typhoon-whisper-turbo is a third of the size and much
faster, at some cost in accuracy.
"""

import contextlib
import io
import os
import threading
import time

from fastapi import FastAPI, File, Form, Header, HTTPException, UploadFile
from fastapi.responses import PlainTextResponse

# Loaded once and reused. PIPELINE_LOCK serializes GPU work: two concurrent
# transcriptions on one card compete for memory and finish no sooner. FastAPI
# runs the sync route in a threadpool, so waiting here blocks the caller rather
# than the event loop.
PIPELINE = None
PIPELINE_LOCK = threading.Lock()
STATE = {"status": "loading", "error": None}

MODEL_ID = os.getenv("STT_MODEL_ID", "typhoon-ai/typhoon-whisper-large-v3")
# What this service calls itself over the wire. It is what you put in
# STT_OPEN_AI_COMPATIBLE_MODEL, and what the Settings dropdown lists.
MODEL_NAME = os.getenv("STT_MODEL_NAME", "typhoon-whisper")
API_KEY = os.getenv("STT_API_KEY") or None

# Whisper hears the language rather than being told, but naming it removes the
# one failure that matters here: short Thai clips being detected as another
# language and transcribed into nonsense. Set STT_LANGUAGE empty to auto-detect.
LANGUAGE = os.getenv("STT_LANGUAGE", "th") or None
# Whisper's encoder takes 30 seconds at a time; longer audio is windowed.
CHUNK_LENGTH_S = int(os.getenv("STT_CHUNK_LENGTH_S", "30"))
BATCH_SIZE = int(os.getenv("STT_BATCH_SIZE", "8"))


@contextlib.asynccontextmanager
async def lifespan(_app):
    # Loading happens off the event loop so the server answers /health during the
    # first download rather than looking dead for the length of it.
    threading.Thread(target=load_pipeline, daemon=True).start()
    yield


app = FastAPI(title="Speech-to-text", lifespan=lifespan)


def log(message):
    print(f"[stt] {message}", flush=True)


def load_pipeline():
    """
    Pull the weights and build the pipeline. Runs on a background thread from
    startup; the large-v3 checkpoint is ~3GB and a cold volume takes a while.
    """
    global PIPELINE
    try:
        # Inside the try so an import failure is reported through /health rather
        # than killing the thread and leaving the status stuck on "loading".
        import torch
        from transformers import pipeline as hf_pipeline

        has_cuda = torch.cuda.is_available()
        if not has_cuda:
            log(
                "No CUDA device visible. Falling back to CPU, which is slower "
                "but usable for this model."
            )
        dtype = torch.float16 if has_cuda else torch.float32

        log(f"Loading {MODEL_ID} ({dtype}). The first run downloads the weights.")
        started = time.time()
        PIPELINE = hf_pipeline(
            "automatic-speech-recognition",
            model=MODEL_ID,
            torch_dtype=dtype,
            device="cuda:0" if has_cuda else "cpu",
            token=os.getenv("HF_TOKEN") or None,
        )
        STATE["status"] = "ready"
        log(f"Ready in {time.time() - started:.0f}s. Serving as '{MODEL_NAME}'.")
    except Exception as e:  # surfaced through /health rather than killing the process
        STATE["status"] = "error"
        STATE["error"] = str(e)
        log(f"Failed to load {MODEL_ID}: {e}")


def require_key(authorization):
    """
    Optional bearer check. An unset STT_API_KEY leaves the service open, which is
    the sane default when it is only reachable on the compose network.
    """
    if not API_KEY:
        return
    if authorization != f"Bearer {API_KEY}":
        raise HTTPException(status_code=401, detail="Invalid API key.")


def decode_audio(raw, filename):
    """
    Turn an uploaded recording into the mono 16kHz float array Whisper wants.
    librosa reads WAV and FLAC itself and hands anything else to ffmpeg, which is
    why the image installs it - the browser records WebM and the collector only
    converts to WAV when it has ffmpeg of its own.
    """
    import librosa

    try:
        audio, _ = librosa.load(io.BytesIO(raw), sr=16000, mono=True)
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Could not decode '{filename}': {e}",
        )
    if audio.size == 0:
        raise HTTPException(status_code=400, detail="The audio was empty.")
    return audio


@app.get("/health")
def health():
    return {
        "status": STATE["status"],
        "model": MODEL_NAME,
        "model_id": MODEL_ID,
        "language": LANGUAGE or "auto",
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
                "owned_by": "typhoon-ai",
            }
        ],
    }


@app.post("/v1/audio/transcriptions")
def transcribe(
    file: UploadFile = File(...),
    model: str = Form(default=None),
    language: str = Form(default=None),
    prompt: str = Form(default=None),
    response_format: str = Form(default="json"),
    temperature: float = Form(default=0.0),
    authorization: str = Header(default=None),
):
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

    # The requested model is not checked against MODEL_NAME. This service hosts
    # exactly one model, and rejecting a mismatch would only turn a harmless bit
    # of config drift into a failed transcription.
    raw = file.file.read()
    audio = decode_audio(raw, file.filename or "audio")

    generate_kwargs = {"task": "transcribe"}
    chosen_language = language or LANGUAGE
    if chosen_language:
        generate_kwargs["language"] = chosen_language
    if temperature:
        generate_kwargs["temperature"] = temperature
    if prompt:
        generate_kwargs["prompt_ids"] = PIPELINE.tokenizer.get_prompt_ids(
            prompt, return_tensors="pt"
        ).to(PIPELINE.model.device)

    started = time.time()
    with PIPELINE_LOCK:
        result = PIPELINE(
            audio,
            chunk_length_s=CHUNK_LENGTH_S,
            batch_size=BATCH_SIZE,
            generate_kwargs=generate_kwargs,
        )

    text = (result.get("text") or "").strip()
    seconds = audio.size / 16000
    log(f"Transcribed {seconds:.1f}s of audio in {time.time() - started:.1f}s.")

    # `text` and `srt`/`vtt` are the other formats OpenAI defines. Only plain text
    # is worth supporting here: Nexus AI asks for json and reads `text`.
    if response_format == "text":
        return PlainTextResponse(text)
    return {"text": text}

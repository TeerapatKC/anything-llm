# Deploying to a DGX Spark with no internet

The target machine never opens a network connection. Everything it needs -
container images, model weights, configuration - is built somewhere else and
carried across on a disk.

Two scripts do it:

| | runs on | needs a network | produces |
|---|---|---|---|
| `docker/bundle.sh` | Windows, or a DGX Spark that has a network | yes | one directory with the images and weights |
| `docker/install.sh --offline` | the air-gapped target | no | a running stack |

## Rehearse the production offline install on this x86_64 machine

The rehearsal uses the same bundle and installer as production, with three
small, real GGUF models in place of the 37GB production set. From Git Bash or
WSL on this machine, while it still has internet and Docker Desktop is running
in Linux-container mode:

```bash
bash docker/bundle.sh --quick-test --checksums
```

PowerShell's `bash` may open WSL. The bundler detects a Windows-only Docker
credential helper there and uses a temporary anonymous Docker configuration
for the public images it needs, while retaining the selected context and buildx
builder. Your Docker configuration is not changed.
Docker Desktop's WSL integration must be enabled. You can also start Git Bash
explicitly from PowerShell:

```powershell
cd D:\work\nexus-ai\anything-llm
& 'C:\Program Files\Git\bin\bash.exe' -lc 'bash docker/bundle.sh --quick-test --checksums'
```

This writes `docker/bundle-quick-test/` for `linux/amd64`. The GGUF files total
about 1.17GB; building the full app image and collecting its dependencies takes
additional time and disk space. Check `MANIFEST.txt` and keep the whole directory.
If an image export fails, rerun the same bundle command while still online.
The script replaces an archive only after the new tar is complete and verified;
do not run the offline installer until the bundle command finishes. Under WSL,
the app image is staged temporarily on the Linux filesystem before it is copied
to `/mnt/<drive>`, so both filesystems need enough free space during export.
The test can then be run with the host disconnected from the internet:

```bash
bash docker/bundle-quick-test/docker/install.sh --offline
```

On Windows, run that install command from Git Bash when the bundle lives on a
Windows drive. Docker Desktop can fail to create its internal WSL bind mount
from a `/mnt/d/...` source with `docker-desktop-bind-mounts/...: file exists`.
Git Bash makes the installer write a `D:/...` source instead. From PowerShell:

```powershell
cd D:\work\nexus-ai\anything-llm
& 'C:\Program Files\Git\bin\bash.exe' -lc 'bash docker/bundle-quick-test/docker/install.sh --offline'
```

Re-running the installer is safe and does not remove the containers or their
persistent storage. The Compose orphan warning is unrelated to the bind mount
error; do not add `--remove-orphans` just to address it.

The installer loads the saved images, checks that every listed image archive and
model weight is present, selects `qwen2.5-0.5b` initially, and exposes all three
models through the live `/v1/models` endpoint. It sets a 2048-token context and
serves one model at a time. The app and llama.cpp use the same production Compose
files; the installer uses `docker compose up --pull never --no-build`, and the
model fetcher refuses network downloads. Check `http://localhost:8082/v1/models` and the model
picker at `http://localhost:3001/settings/llm-preference` after startup.

This rehearsal uses the normal container names and host ports, including backend
port 3001, so stop any existing Nexus AI Compose stack using them first. It also
needs the NVIDIA container runtime used by the production llama.cpp service;
`--skip-gpu-check` only bypasses the installer's detection when GPU containers
already work. An x86_64 bundle cannot be installed on a DGX Spark: build the
production `linux/arm64` bundle separately for that machine. Testing on a fresh
Docker daemon or VM additionally checks that no images were supplied by the
workstation's existing cache.

## Build the bundle

From Git Bash or WSL on Windows, or from a shell on any Spark that can reach
the network:

```bash
bash docker/bundle.sh
```

It writes `docker/bundle/`:

```
bundle/
  docker/          the compose files, the installer, the reference voices
  collector/       the upload directories the app bind-mounts
  images/          every container image, saved with docker save
  models/
    llamacpp/      the GGUF weights and the router preset
    sdcpp/         FLUX.1-schnell
    hf/            a Hugging Face cache for the two speech services
  offline.env      what points the stack at images/ and models/
  images.list      every image archive the installer expects
  MANIFEST.txt     what is in here, and what to run next
```

The default bundle is for `linux/arm64`, because the production target is a DGX
Spark. `--quick-test` instead builds `linux/amd64` for this workstation.
For a default arm64 bundle, Windows cross-builds under emulation and takes the
better part of an hour; on a Spark the build is native and takes minutes. The
quick-test amd64 build is native on this workstation.

To trim it, name fewer services or fewer models:

```bash
bash docker/bundle.sh --services llm --models gemma-4-12b
```

Re-running is cheap. Every downloader skips a file that is already there, so an
interrupted transfer resumes rather than restarting, and topping up a finished
bundle costs a few seconds.

## Carry it across

The bundle is a plain directory. Copy it however the site allows - an external
disk, `scp`, `rsync`. Nothing inside it is machine-specific: the installer
rewrites the paths for wherever it lands.

## Install

On the Spark, with no network:

```bash
<bundle>/docker/install.sh --offline
```

That loads every image tarball, writes `docker/.env` with the bundle's own paths
substituted in, and starts the stack. It builds nothing and pulls nothing.

Re-running it is safe. It preserves generated secrets and other local settings,
while applying the image references, model paths and LLM settings recorded in
`offline.env`. This also replaces a remote model URL left by an earlier install.

## What makes the offline path work

The pieces were already mostly there; three things had to be true for a host
with no route out.

**The weights are read from a directory, not downloaded.** Both model fetchers
already left an existing file alone, so seeding a directory turns the download
job into a no-op that exits successfully - which matters, because the model
servers wait on that job through `service_completed_successfully` and will not
start until it finishes. `SDCPP_MODELS_DIR`, `LLAMACPP_MODELS_DIR` and
`SPEECH_MODELS_DIR` swap each named volume for a host path.

**The Hugging Face libraries are told not to try.** The speech services fetch
their checkpoints at runtime. `HF_HUB_OFFLINE=1` makes them read the cache and
fail loudly if something is missing, rather than spending a DNS timeout per file
on every start and then failing anyway.

The cache holds every file in each repository, including weights in formats
neither service loads. Trimming those looks like free savings and is not: offline,
`snapshot_download` compares the cache against the file list it recorded and
refuses a partial snapshot. With an exclusion list an air-gapped load failed on a
TensorFlow checkpoint nothing would ever have opened.

**Every image is in the bundle, not just the ones this project builds.** That
includes the monitoring four from the base compose file, which would otherwise
leave four containers stuck pulling on an otherwise working stack.

## The models that are not in the bundle

Four features fetch a model from the internet the first time someone uses them,
through a different library and into a different place than the model servers:
both native embedders, the reranker, the transcription of uploaded audio, and the
language data for OCR. The app also refreshes a model pricing table at boot.

None of that is in the bundle, and none of it needs to be - `docker/prefetch-models.sh`
puts all of it inside the app image at build time, with every revision pinned.
The files land outside `/app/server/storage`, because that path is a volume at
runtime and a volume hides whatever the image left underneath it; the entrypoint
copies what is missing into the volume on each start, never overwriting. The
transcription model is the exception: 1.5GB is read in place rather than
duplicated into a customer's data volume.

This was found the hard way. The embedder used to reach the image only because
the build context happened to include whatever the build machine had already
downloaded, which `.dockerignore` now excludes - so a build from a clean checkout
produced an image that failed at the first document upload, with an error naming
a Hugging Face URL. Verified since with the container on `--network none`:
embedding, reranking, the transcription model path, both OCR languages and the
pricing cache all resolve with no route out.

## Per-workspace models

Each workspace stores its own provider and model, and the request carries that
name to llama-server, which runs in router mode and matches it against the models
in the bundle. So two workspaces on two different models work with no extra
configuration, offline included.

How many of those models stay in memory at once is the part worth setting.
`install.sh` reads the total GPU memory and, above 64GB, raises the resident
limit to one per model. A Spark has 128GB shared between CPU and GPU, so all
three fit and switching workspaces never waits for a reload. The production
bundle writes a 16384-token context into both the model preset and app config;
the small test bundle uses 2048. Set `LLAMACPP_CTX` while building a bundle to
choose a different value. The bundle records that value in `offline.env` so the
installed server and app agree.

## Checking a bundle before you carry it

`MANIFEST.txt` lists the images and the size of each model directory. For a
transfer you want to be able to verify on the far side:

```bash
bash docker/bundle.sh --checksums
```

That appends a SHA-256 per file. It reads the whole bundle back, so it is slow.

## If something is missing on the Spark

The installer names what it cannot find rather than letting compose fail later:

- *"is not a bundle - no offline.env in it"* - the path is wrong, or the copy
  did not finish.
- *"Missing or empty image tarball: X"* - the copy is incomplete, even if a
  matching image is cached in Docker already.
- *"Incomplete image tarball: X"* - a previous image export was interrupted;
  rerun `bundle.sh` on the online build machine before installing.
- *"Missing or empty model file: X"* - a GGUF file did not arrive intact.
- *"The bundle names X for Y, but no tarball in it carries that image"* -
  `images/` is incomplete. Re-run `bundle.sh --skip-models` on the build machine.
- *"No image tarballs in .../images"* - only the directory structure arrived.

For transferred files, `--checksums` writes SHA-256 values into `MANIFEST.txt`.
Use them to verify the copy if you suspect corruption; the installer's fast
presence check cannot prove that a nonempty GGUF or tarball is uncorrupted.

# Deploying to a DGX Spark with no internet

The target machine never opens a network connection. Everything it needs -
container images, model weights, configuration - is built somewhere else and
carried across on a disk.

Two scripts do it:

| | runs on | needs a network | produces |
|---|---|---|---|
| `docker/bundle.sh` | Windows, or a DGX Spark that has a network | yes | one directory, 60GB or so |
| `docker/install.sh --offline` | the air-gapped DGX Spark | no | a running stack |

## Build the bundle

From Git Bash on Windows, or from a shell on any Spark that can reach the
network:

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
  MANIFEST.txt     what is in here, and what to run next
```

Everything in it is for `linux/arm64`, because the deployment target always is.
On Windows the app image cross-builds under emulation and takes the better part
of an hour; on a Spark it is native and takes minutes. The model downloads are
the same either way and dominate the wall clock.

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

Re-running it is safe. It only adds the keys that are missing, apart from the
image references and model paths, which it always rewrites - pointing the
deployment at a bundle in a new location is the reason you would run it again.

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

## Per-workspace models

Each workspace stores its own provider and model, and the request carries that
name to llama-server, which runs in router mode and matches it against the models
in the bundle. So two workspaces on two different models work with no extra
configuration, offline included.

How many of those models stay in memory at once is the part worth setting.
`install.sh` reads the total GPU memory and, above 64GB, raises the resident
limit to one per model and the context window to 16384. A Spark has 128GB shared
between CPU and GPU, so all three fit and switching workspaces never waits for a
reload. Below that threshold it leaves the conservative values alone and says so.
Set `LLAMACPP_MODELS_MAX` or `LLAMACPP_CTX` in `docker/.env` by hand to override
either; the installer never rewrites a value that is already there.

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
- *"The bundle names X for Y, but no tarball in it carries that image"* -
  `images/` is incomplete. Re-run `bundle.sh --skip-models` on the build machine.
- *"No image tarballs in .../images"* - only the directory structure arrived.

For the model weights there is no such check at install time, because the files
are only opened when a server starts. If a model server exits at once, compare
its directory against `MANIFEST.txt`.

# Reference voices for VoxCPM2

This directory is mounted read-only into the `thai-tts` container. Until it holds
at least one pair of files, the service starts but reports `no-voices` and every
synthesis request fails with a message saying so.

A voice is two files with the same stem:

```
default.wav   3 to 30 seconds of clean speech, one speaker, no music
default.txt   exactly what that clip says, in any supported language
```

This project includes `female` and `male` sample pairs from Google FLEURS, with
`female` selected by default. Set `THAI_TTS_DEFAULT_VOICE=male` to use the other
pair, or set it to the filename stem of a pair you add.

The included samples come from the `en_us` validation split of Google FLEURS by
Conneau et al., licensed under CC BY 4.0:
https://huggingface.co/datasets/google/fleurs. They were converted from 32-bit
float WAV to 16-bit PCM WAV; the speech content was not changed. Preserve this
attribution and modification notice when redistributing the sample files.

The transcript has to match the audio. VoxCPM2 uses both files for its highest-
fidelity cloning mode, so a transcript that disagrees with the recording degrades
everything it then says. A reference may be in one supported language while the
target text uses another, including Thai, English, or Japanese.

Other names work too - put the stem in `THAI_TTS_DEFAULT_VOICE` so the Settings
page agrees with what is actually here. Several pairs can live here at once, and
the service picks up a new one without a restart.

A reference sample must be one you are legally allowed to clone. The transcription
service in this same overlay can help produce the matching text:

```bash
curl -s -F file=@default.wav -F model=typhoon-whisper \
  http://localhost:7871/v1/audio/transcriptions
```

Recordings you put here are not covered by this repository's licence. VoxCPM2's
code and weights are Apache-2.0, but that does not grant permission to clone a
person's voice; obtain the speaker's consent for the intended use.

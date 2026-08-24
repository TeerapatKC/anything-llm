/**
 * Client-side WAV encoding for the server-side STT flow.
 *
 * `MediaRecorder` can only give us webm/ogg (opus) - no browser records WAV -
 * but several transcription backends (whisper.cpp, and some OpenAI-compatible
 * services) accept WAV only. The server can transcode with the collector's
 * ffmpeg wrapper, which needs an `ffmpeg` binary on the host; that is not
 * installed everywhere, and when it is missing STT fails outright.
 *
 * The browser already has an opus decoder - it just recorded with it - so we
 * decode our own recording through Web Audio and re-encode it as the 16kHz mono
 * WAV whisper backends want. That removes the ffmpeg dependency for the common
 * case and skips a round trip through the collector.
 */

const TARGET_SAMPLE_RATE = 16000;

/**
 * Decode a recorded audio blob and re-encode it as 16kHz mono 16-bit WAV.
 * Never throws - callers fall back to uploading the original recording.
 * @param {Blob} blob - The recording produced by MediaRecorder.
 * @returns {Promise<Blob|null>} The WAV blob, or null if the browser could not decode it.
 */
export async function audioBlobToWav(blob) {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass || !window.OfflineAudioContext) return null;

    const arrayBuffer = await blob.arrayBuffer();
    const context = new AudioContextClass();
    let decoded;
    try {
      decoded = await context.decodeAudioData(arrayBuffer);
    } finally {
      context.close().catch(() => {});
    }
    if (!decoded?.length) return null;

    const { samples, sampleRate } = await toMonoAtTargetRate(decoded);
    if (!samples?.length) return null;
    return new Blob([encodeWav(samples, sampleRate)], { type: "audio/wav" });
  } catch (e) {
    console.error("Could not convert recording to WAV:", e);
    return null;
  }
}

/**
 * Downmix to mono and resample to TARGET_SAMPLE_RATE using an OfflineAudioContext,
 * which does the resampling natively. Falls back to the first channel at its
 * original rate if the browser rejects the target rate (older Safari) - the rate
 * travels with the samples so the WAV header always describes what it contains.
 * @param {AudioBuffer} decoded - The decoded recording.
 * @returns {Promise<{samples: Float32Array, sampleRate: number}>} Mono PCM samples and their rate.
 */
async function toMonoAtTargetRate(decoded) {
  try {
    const frames = Math.ceil(decoded.duration * TARGET_SAMPLE_RATE);
    const offline = new OfflineAudioContext(1, frames, TARGET_SAMPLE_RATE);
    const source = offline.createBufferSource();
    source.buffer = decoded;
    source.connect(offline.destination);
    source.start();
    const rendered = await offline.startRendering();
    return {
      samples: rendered.getChannelData(0),
      sampleRate: TARGET_SAMPLE_RATE,
    };
  } catch (e) {
    console.error(
      `Could not resample recording to ${TARGET_SAMPLE_RATE}Hz, sending it at ${decoded.sampleRate}Hz:`,
      e
    );
    return {
      samples: decoded.getChannelData(0),
      sampleRate: decoded.sampleRate,
    };
  }
}

/**
 * Write mono float samples into a 16-bit PCM WAV container.
 * @param {Float32Array} samples - Mono PCM samples in the -1..1 range.
 * @param {number} sampleRate - Sample rate of `samples`.
 * @returns {ArrayBuffer} The complete WAV file.
 */
export function encodeWav(samples, sampleRate) {
  const bytesPerSample = 2;
  const buffer = new ArrayBuffer(44 + samples.length * bytesPerSample);
  const view = new DataView(buffer);
  const writeString = (offset, text) => {
    for (let i = 0; i < text.length; i++)
      view.setUint8(offset + i, text.charCodeAt(i));
  };

  writeString(0, "RIFF");
  view.setUint32(4, 36 + samples.length * bytesPerSample, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true); // PCM header size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * bytesPerSample, true); // byte rate
  view.setUint16(32, bytesPerSample, true); // block align
  view.setUint16(34, 8 * bytesPerSample, true); // bits per sample
  writeString(36, "data");
  view.setUint32(40, samples.length * bytesPerSample, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += bytesPerSample) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(
      offset,
      clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff,
      true
    );
  }
  return buffer;
}

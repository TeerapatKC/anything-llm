import { useEffect, useRef } from "react";

const RMS_THRESHOLD = 0.02; // 0..1 — RMS volume below which we treat the mic as silent.
const FFT_SIZE = 2048;

/**
 * Watches a MediaStream's amplitude via the Web Audio API and fires
 * `onSilence` after `silenceMs` of mic input below the RMS threshold —
 * but only once speech has been detected, so the timer never fires
 * before the user has actually spoken.
 *
 * Pass `stream = null` to disable detection (e.g., when not listening).
 * @param {MediaStream | null} stream - Active mic stream, or null to disable
 * @param {Object} options
 * @param {() => void} options.onSilence - Called when sustained silence is detected
 * @param {number} options.silenceMs - Milliseconds of continuous silence before firing
 */
export default function useSilenceDetector(
  stream,
  { onSilence, silenceMs, onLevel }
) {
  const onSilenceRef = useRef(onSilence);
  const onLevelRef = useRef(onLevel);
  useEffect(() => {
    onSilenceRef.current = onSilence;
  }, [onSilence]);
  useEffect(() => {
    onLevelRef.current = onLevel;
  }, [onLevel]);

  useEffect(() => {
    if (!stream) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = FFT_SIZE;
    analyser.smoothingTimeConstant = 0.3;
    ctx.createMediaStreamSource(stream).connect(analyser);
    const buffer = new Uint8Array(analyser.fftSize);

    let raf = null;
    let silenceTimer = null;
    let hasSpoken = false;
    let smoothedLevel = 0;

    const tick = () => {
      analyser.getByteTimeDomainData(buffer);
      let sumSquares = 0;
      for (let i = 0; i < buffer.length; i++) {
        const sample = buffer[i] / 128 - 1;
        sumSquares += sample * sample;
      }
      const rms = Math.sqrt(sumSquares / buffer.length);
      const normalizedLevel = Math.min(1, rms * 10);
      smoothedLevel = smoothedLevel * 0.65 + normalizedLevel * 0.35;
      onLevelRef.current?.(smoothedLevel);

      if (rms > RMS_THRESHOLD) {
        hasSpoken = true;
        if (silenceTimer) {
          clearTimeout(silenceTimer);
          silenceTimer = null;
        }
      } else if (hasSpoken && !silenceTimer) {
        silenceTimer = setTimeout(() => onSilenceRef.current?.(), silenceMs);
      }

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      if (silenceTimer) clearTimeout(silenceTimer);
      if (ctx.state !== "closed") ctx.close().catch(() => {});
      onLevelRef.current?.(0);
    };
  }, [stream, silenceMs]);
}

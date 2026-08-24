import { useEffect, useRef } from "react";

const FFT_SIZE = 1024;

/**
 * Reports a smoothed, normalized microphone level from a MediaStream.
 * @param {MediaStream | null} stream
 * @param {(level: number) => void} onLevel
 */
export default function useAudioLevel(stream, onLevel) {
  const onLevelRef = useRef(onLevel);

  useEffect(() => {
    onLevelRef.current = onLevel;
  }, [onLevel]);

  useEffect(() => {
    if (!stream) {
      onLevelRef.current?.(0);
      return;
    }

    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    const context = new AudioCtx();
    const analyser = context.createAnalyser();
    analyser.fftSize = FFT_SIZE;
    analyser.smoothingTimeConstant = 0.35;
    context.createMediaStreamSource(stream).connect(analyser);
    const samples = new Uint8Array(analyser.fftSize);
    let animationFrame = null;
    let smoothedLevel = 0;

    const measure = () => {
      analyser.getByteTimeDomainData(samples);
      let sumSquares = 0;
      for (let index = 0; index < samples.length; index++) {
        const sample = samples[index] / 128 - 1;
        sumSquares += sample * sample;
      }
      const rms = Math.sqrt(sumSquares / samples.length);
      const normalizedLevel = Math.min(1, rms * 10);
      smoothedLevel = smoothedLevel * 0.65 + normalizedLevel * 0.35;
      onLevelRef.current?.(smoothedLevel);
      animationFrame = requestAnimationFrame(measure);
    };

    animationFrame = requestAnimationFrame(measure);
    return () => {
      if (animationFrame) cancelAnimationFrame(animationFrame);
      if (context.state !== "closed") context.close().catch(() => {});
      onLevelRef.current?.(0);
    };
  }, [stream]);
}

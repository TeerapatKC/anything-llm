import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import System from "@/models/system";
import showToast from "@/utils/toast";
import MicButton from "../MicButton";
import useSilenceDetector from "../useSilenceDetector";
import { audioBlobToWav } from "@/utils/audio/toWav";

const SILENCE_INTERVAL = 3_200; // ms of silence before auto-stop, matches BrowserNative.
const MIME_CANDIDATES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/ogg;codecs=opus",
];

/**
 * Records mic audio with MediaRecorder and uploads it to the configured
 * server-side STT provider. Auto-stops after SILENCE_INTERVAL of mic silence
 * via useSilenceDetector, then returns the transcript to the prompt for review.
 * @param {Object} props - The component props
 * @param {(textToAppend: string, autoSubmit: boolean) => void} props.sendCommand - The function to send the command
 * @returns {React.ReactElement} The ServerSTT component
 */
export default function ServerSTT({
  sendCommand,
  onStateChange,
  onAudioLevel,
}) {
  const { t } = useTranslation();
  const [listening, setListening] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [stream, setStream] = useState(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);

  useEffect(
    () => () => {
      onStateChange?.("idle");
      onAudioLevel?.(0);
    },
    [onAudioLevel, onStateChange]
  );

  const updateListening = useCallback(
    (value) => {
      setListening(value);
      onStateChange?.(value ? "listening" : "idle");
    },
    [onStateChange]
  );

  const stopListening = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
  }, []);

  useSilenceDetector(listening ? stream : null, {
    onSilence: stopListening,
    silenceMs: SILENCE_INTERVAL,
    onLevel: onAudioLevel,
  });

  const startListening = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      showToast(t("chat_window.stt_unsupported"), "error");
      return;
    }

    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      const mimeType = MIME_CANDIDATES.find((m) =>
        MediaRecorder.isTypeSupported(m)
      );
      const recorder = mimeType
        ? new MediaRecorder(audioStream, { mimeType })
        : new MediaRecorder(audioStream);

      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data?.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        audioStream.getTracks().forEach((t) => t.stop());
        setStream(null);
        onAudioLevel?.(0);
        setListening(false);
        recorderRef.current = null;

        const chunks = chunksRef.current;
        chunksRef.current = [];
        if (!chunks.length) {
          onStateChange?.("idle");
          return;
        }
        const blob = new Blob(chunks, { type: recorder.mimeType });
        if (blob.size === 0) {
          onStateChange?.("idle");
          return;
        }

        await uploadAndDispatch(
          blob,
          recorder.mimeType,
          sendCommand,
          setProcessing,
          onStateChange,
          t
        );
      };

      recorderRef.current = recorder;
      recorder.start();
      setStream(audioStream);
      updateListening(true);
    } catch (e) {
      console.error("Failed to start microphone:", e);
      showToast(t("chat_window.stt_mic_denied"), "error", { clear: true });
    }
  }, [sendCommand, t, updateListening, onAudioLevel, onStateChange]);

  return (
    <MicButton
      listening={listening}
      processing={processing}
      onStart={startListening}
      onStop={stopListening}
    />
  );
}

async function uploadAndDispatch(
  blob,
  mimeType,
  sendCommand,
  setProcessing,
  onStateChange,
  t
) {
  setProcessing(true);
  onStateChange?.("processing");
  // Prefer WAV: whisper backends want it, and converting here means the server
  // does not need an ffmpeg binary to do it. Falls back to the raw recording if
  // the browser cannot decode its own output.
  const wavBlob = await audioBlobToWav(blob);
  const extension = mimeType.includes("ogg") ? "ogg" : "webm";
  const { text, error } = await System.transcribeAudio(
    wavBlob ?? blob,
    wavBlob ? "audio.wav" : `audio.${extension}`
  );
  setProcessing(false);
  onStateChange?.("idle");

  if (error) {
    showToast(t("chat_window.stt_transcription_failed", { error }), "error", {
      clear: true,
    });
    return;
  }
  if (!text) return;

  sendCommand({
    text,
    autoSubmit: false,
    writeMode: "append",
  });
}

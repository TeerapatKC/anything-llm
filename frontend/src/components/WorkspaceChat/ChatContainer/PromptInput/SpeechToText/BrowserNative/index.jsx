import { useEffect, useRef, useState } from "react";
import "regenerator-runtime"; //required polyfill for speech recognition;
import SpeechRecognition, {
  useSpeechRecognition,
} from "react-speech-recognition";
import MicButton from "../MicButton";
import useAudioLevel from "../useAudioLevel";

let timeout;
const SILENCE_INTERVAL = 3_200; // wait in seconds of silence before closing.

/**
 * Browser-native speech-to-text using the Web Speech API.
 * @param {Object} props - The component props
 * @param {Function} props.sendCommand - Adds the completed transcript to the prompt
 * @returns {React.ReactElement} The SpeechToText component
 */
export default function BrowserNativeSTT({
  sendCommand,
  onStateChange,
  onAudioLevel,
}) {
  const transcriptRef = useRef("");
  const wasListeningRef = useRef(false);
  const [levelStream, setLevelStream] = useState(null);
  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition,
    browserSupportsContinuousListening,
    isMicrophoneAvailable,
  } = useSpeechRecognition({
    clearTranscriptOnListen: true,
  });

  useAudioLevel(listening ? levelStream : null, onAudioLevel);

  function closeLevelStream() {
    levelStream?.getTracks().forEach((track) => track.stop());
    setLevelStream(null);
    onAudioLevel?.(0);
  }

  async function startSTTSession() {
    if (!isMicrophoneAvailable) {
      alert(
        "NexusAI does not have access to microphone. Please enable for this site to use this feature."
      );
      return;
    }

    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      setLevelStream(audioStream);
      resetTranscript();
      transcriptRef.current = "";
      SpeechRecognition.startListening({
        continuous: browserSupportsContinuousListening,
        language: window?.navigator?.language ?? "en-US",
      });
    } catch {
      closeLevelStream();
      alert(
        "NexusAI does not have access to microphone. Please enable for this site to use this feature."
      );
    }
  }

  function endSTTSession() {
    SpeechRecognition.stopListening();
    closeLevelStream();
    clearTimeout(timeout);
  }

  useEffect(() => {
    transcriptRef.current = transcript;
    onStateChange?.(listening ? "listening" : "idle");

    if (transcript?.length > 0 && listening) {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        endSTTSession();
      }, SILENCE_INTERVAL);
    }

    if (wasListeningRef.current && !listening) {
      closeLevelStream();
      const finalTranscript = transcriptRef.current.trim();
      if (finalTranscript)
        sendCommand({ text: finalTranscript, writeMode: "append" });
      resetTranscript();
      transcriptRef.current = "";
    }
    wasListeningRef.current = listening;
  }, [transcript, listening, onStateChange, sendCommand, resetTranscript]);

  useEffect(
    () => () => {
      clearTimeout(timeout);
      levelStream?.getTracks().forEach((track) => track.stop());
      onStateChange?.("idle");
      onAudioLevel?.(0);
    },
    [levelStream, onAudioLevel, onStateChange]
  );

  if (!browserSupportsSpeechRecognition) return null;
  return (
    <MicButton
      listening={listening}
      onStart={startSTTSession}
      onStop={endSTTSession}
    />
  );
}

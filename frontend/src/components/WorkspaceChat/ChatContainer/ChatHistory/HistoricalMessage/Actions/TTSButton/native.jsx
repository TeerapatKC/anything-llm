import React, { useEffect, useState } from "react";
import { CirclePause, Volume2 } from "lucide-react";
import messageToSpeech from "@/utils/chat/messageToSpeech";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function NativeTTSMessage({ chatId, message }) {
  const [speaking, setSpeaking] = useState(false);
  const [supported, setSupported] = useState(false);
  useEffect(() => {
    setSupported("speechSynthesis" in window);
  }, []);

  function endSpeechUtterance() {
    window.speechSynthesis?.cancel();
    setSpeaking(false);
    return;
  }

  function speakMessage() {
    // if the user is pausing this particular message
    // while the synth is speaking we can end it.
    // If they are clicking another message's TTS
    // we need to ignore that until they pause the one that is playing.
    if (window.speechSynthesis.speaking && speaking) {
      endSpeechUtterance();
      return;
    }

    if (window.speechSynthesis.speaking && !speaking) return;
    const utterance = new SpeechSynthesisUtterance(messageToSpeech(message));
    utterance.addEventListener("end", endSpeechUtterance);
    window.speechSynthesis.speak(utterance);
    setSpeaking(true);
  }

  if (!supported) return null;
  return (
    <div className="mt-3 relative">
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={speakMessage}
            data-auto-play-chat-id={chatId}
            className="border-none text-zinc-300 light:text-slate-500"
            aria-label={speaking ? "Pause speech" : "Speak message"}
          >
            {speaking ? (
              <CirclePause size={18} className="mb-1" />
            ) : (
              <Volume2 size={18} className="mb-1" />
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[250px] text-xs">
          {speaking ? "Pause TTS speech of message" : "TTS Speak message"}
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

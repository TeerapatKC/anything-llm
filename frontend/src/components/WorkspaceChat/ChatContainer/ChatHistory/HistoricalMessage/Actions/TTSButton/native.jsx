import React, { useEffect, useState } from "react";
import { Pause, Volume2 } from "lucide-react";
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
    <div className="relative">
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              onClick={speakMessage}
              data-auto-play-chat-id={chatId}
              className="flex size-7 items-center justify-center rounded-md border-none text-zinc-400 transition-colors hover:bg-white/5 hover:text-zinc-200 light:text-slate-500 light:hover:bg-black/5 light:hover:text-slate-700"
              aria-label={speaking ? "Pause speech" : "Speak message"}
            />
          }
        >
          {speaking ? <Pause size={16} /> : <Volume2 size={16} />}
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[250px] text-xs">
          {speaking ? "Pause TTS speech of message" : "TTS Speak message"}
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

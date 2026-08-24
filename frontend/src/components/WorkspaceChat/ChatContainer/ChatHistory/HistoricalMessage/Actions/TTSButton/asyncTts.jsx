import { useEffect, useState, useRef } from "react";
import { Spinner } from "@/components/ui/spinner";
import { Pause, Volume2 } from "lucide-react";
import Workspace from "@/models/workspace";
import showToast from "@/utils/toast";
import { useTranslation } from "react-i18next";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function AsyncTTSMessage({ slug, chatId }) {
  const playerRef = useRef(null);
  const [speaking, setSpeaking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [audioSrc, setAudioSrc] = useState(null);
  const { t } = useTranslation();

  function speakMessage() {
    if (speaking) {
      playerRef?.current?.pause();
      return;
    }

    try {
      if (!audioSrc) {
        setLoading(true);
        Workspace.ttsMessage(slug, chatId)
          .then((audioBlob) => {
            if (!audioBlob)
              throw new Error("Failed to load or play TTS message response.");
            setAudioSrc(audioBlob);
          })
          .catch((e) => showToast(e.message, "error", { clear: true }))
          .finally(() => setLoading(false));
      } else {
        playerRef.current.play();
      }
    } catch (e) {
      console.error(e);
      setLoading(false);
      setSpeaking(false);
    }
  }

  useEffect(() => {
    function setupPlayer() {
      if (!playerRef?.current) return;
      playerRef.current.addEventListener("play", () => {
        setSpeaking(true);
      });

      playerRef.current.addEventListener("pause", () => {
        playerRef.current.currentTime = 0;
        setSpeaking(false);
      });
    }
    setupPlayer();
  }, []);

  if (!chatId) return null;
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
          {speaking ? (
            <Pause size={16} />
          ) : (
            <>{loading ? <Spinner /> : <Volume2 size={16} />}</>
          )}
          <audio
            ref={playerRef}
            hidden={true}
            src={audioSrc}
            autoPlay={true}
            controls={false}
          />
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[250px] text-xs">
          {speaking
            ? t("pause_tts_speech_message")
            : t("chat_window.tts_speak_message")}
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

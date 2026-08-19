import { useEffect, useState, useRef } from "react";
import { Spinner } from "@/components/ui/spinner";
import { CirclePause, Volume2 } from "lucide-react";
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
    <div className="mt-3 relative">
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              onClick={speakMessage}
              data-auto-play-chat-id={chatId}
              className="border-none text-zinc-300 light:text-slate-500"
              aria-label={speaking ? "Pause speech" : "Speak message"}
            />
          }
        >
          {speaking ? (
            <CirclePause size={18} className="mb-1" />
          ) : (
            <>
              {loading ? (
                <Spinner className="mb-1" />
              ) : (
                <Volume2 size={18} className="mb-1" />
              )}
            </>
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

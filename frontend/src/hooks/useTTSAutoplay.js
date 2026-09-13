import { useEffect } from "react";
import Appearance from "@/models/appearance";

const ASSISTANT_MESSAGE_COMPLETE_EVENT = "ASSISTANT_MESSAGE_COMPLETE_EVENT";

export function emitAssistantMessageCompleteEvent(chatId) {
  window.dispatchEvent(
    new CustomEvent(ASSISTANT_MESSAGE_COMPLETE_EVENT, { detail: { chatId } })
  );
}

export function useWatchForAutoPlayAssistantTTSResponse() {
  const autoPlayAssistantTtsResponse = Appearance.get(
    "autoPlayAssistantTtsResponse"
  );

  useEffect(() => {
    if (!autoPlayAssistantTtsResponse) return;

    function handleAutoPlayTTSEvent(event) {
      let attempts = 0;
      const { chatId } = event.detail;

      function attemptToPlay() {
        const playButton = document.querySelector(
          `[data-auto-play-chat-id="${chatId}"]`
        );
        if (playButton) {
          playButton.click();
          return;
        }
        attempts += 1;
        if (attempts <= 3) setTimeout(attemptToPlay, 1000 * attempts);
      }

      setTimeout(attemptToPlay, 800);
    }

    window.addEventListener(
      ASSISTANT_MESSAGE_COMPLETE_EVENT,
      handleAutoPlayTTSEvent
    );
    return () =>
      window.removeEventListener(
        ASSISTANT_MESSAGE_COMPLETE_EVENT,
        handleAutoPlayTTSEvent
      );
  }, [autoPlayAssistantTtsResponse]);
}

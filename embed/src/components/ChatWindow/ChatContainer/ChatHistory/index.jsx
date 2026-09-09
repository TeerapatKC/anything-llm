import HistoricalMessage from "./HistoricalMessage";
import PromptReply from "./PromptReply";
import { useEffect, useRef, useState } from "react";
import { ArrowDown, CircleNotch } from "@phosphor-icons/react";
import debounce from "lodash.debounce";
import { SEND_TEXT_EVENT } from "..";

export default function ChatHistory({ settings = {}, history = [] }) {
  const replyRef = useRef(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const chatHistoryRef = useRef(null);

  useEffect(() => {
    scrollToBottom();
  }, [history]);

  const handleScroll = () => {
    if (!chatHistoryRef.current) return;
    const diff =
      chatHistoryRef.current.scrollHeight -
      chatHistoryRef.current.scrollTop -
      chatHistoryRef.current.clientHeight;
    // Fuzzy margin for what qualifies as "bottom". Stronger than straight comparison since that may change over time.
    const isBottom = diff <= 40;
    setIsAtBottom(isBottom);
  };

  const debouncedScroll = debounce(handleScroll, 100);
  useEffect(() => {
    function watchScrollEvent() {
      if (!chatHistoryRef.current) return null;
      const chatHistoryElement = chatHistoryRef.current;
      if (!chatHistoryElement) return null;
      chatHistoryElement.addEventListener("scroll", debouncedScroll);
    }
    watchScrollEvent();
  }, []);

  const scrollToBottom = () => {
    if (chatHistoryRef.current) {
      chatHistoryRef.current.scrollTo({
        top: chatHistoryRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  };

  if (history.length === 0) {
    return (
      <div className="allm-no-scroll allm-flex allm-h-full allm-flex-col allm-justify-start allm-overflow-y-auto allm-bg-white allm-px-4 allm-py-6">
        <div className="allm-flex allm-h-full allm-flex-col allm-items-center allm-justify-center">
          <p className="allm-max-w-[280px] allm-py-4 allm-text-center allm-font-sans allm-text-sm allm-leading-6 allm-text-slate-500">
            {settings?.greeting ?? "Send a chat to get started."}
          </p>
          <SuggestedMessages settings={settings} />
        </div>
      </div>
    );
  }

  return (
    <div
      className="allm-no-scroll allm-flex allm-h-full allm-min-w-0 allm-flex-col allm-justify-start allm-overflow-x-hidden allm-overflow-y-auto allm-bg-white allm-px-4 allm-py-5"
      id="chat-history"
      ref={chatHistoryRef}
    >
      <div className="allm-flex allm-flex-col allm-gap-y-5">
        {history.map((props, index) => {
          const isLastMessage = index === history.length - 1;
          const isLastBotReply =
            index === history.length - 1 && props.role === "assistant";

          if (isLastBotReply && props.animate) {
            return (
              <PromptReply
                key={props.uuid}
                ref={isLastMessage ? replyRef : null}
                uuid={props.uuid}
                reply={props.content}
                pending={props.pending}
                sources={props.sources}
                error={props.error}
                closed={props.closed}
              />
            );
          }

          return (
            <HistoricalMessage
              key={index}
              ref={isLastMessage ? replyRef : null}
              message={props.content}
              sentAt={props.sentAt || Date.now() / 1000}
              role={props.role}
              sources={props.sources}
              chatId={props.chatId}
              feedbackScore={props.feedbackScore}
              error={props.error}
              errorMsg={props.errorMsg}
            />
          );
        })}
      </div>
      {!isAtBottom && (
        <div className="allm-absolute allm-bottom-24 allm-right-5 allm-z-20 allm-cursor-pointer">
          <div className="allm-flex allm-flex-col allm-items-center">
            <div className="allm-flex allm-h-8 allm-w-8 allm-items-center allm-justify-center allm-rounded-full allm-border allm-border-slate-200 allm-bg-white allm-text-slate-600 allm-shadow-md hover:allm-bg-slate-50 hover:allm-text-slate-950">
              <ArrowDown
                weight="bold"
                className="allm-h-4 allm-w-4"
                onClick={scrollToBottom}
                id="scroll-to-bottom-button"
                aria-label="Scroll to bottom"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function ChatHistoryLoading() {
  return (
    <div className="allm-h-full allm-w-full allm-relative">
      <div className="allm-no-scroll allm-flex allm-h-full allm-max-h-[82vh] allm-flex-col allm-justify-start allm-gap-y-2 allm-overflow-y-scroll allm-bg-white allm-px-4 allm-pb-[100px] allm-pt-2">
        <div className="allm-flex allm-h-full allm-flex-col allm-items-center allm-justify-center">
          <CircleNotch
            size={14}
            className="allm-text-slate-400 allm-animate-spin"
          />
        </div>
      </div>
    </div>
  );
}

function SuggestedMessages({ settings }) {
  if (!settings?.defaultMessages?.length) return null;

  return (
    <div className="allm-flex allm-w-full allm-max-w-[300px] allm-flex-col allm-gap-y-2">
      {settings.defaultMessages.map((content, i) => (
        <button
          key={i}
          style={{
            opacity: 0,
            wordBreak: "break-word",
            fontSize: settings.textSize,
          }}
          type="button"
          onClick={() => {
            window.dispatchEvent(
              new CustomEvent(SEND_TEXT_EVENT, { detail: { command: content } })
            );
          }}
          className="msg-suggestion allm-w-full allm-cursor-pointer allm-rounded-lg allm-border allm-border-slate-200 allm-bg-white allm-px-3 allm-py-2 allm-text-sm allm-font-medium allm-text-slate-700 allm-shadow-sm allm-transition-colors hover:allm-bg-slate-50 hover:allm-text-slate-950 focus:allm-outline-none focus:allm-ring-2 focus:allm-ring-slate-300"
        >
          {content}
        </button>
      ))}
    </div>
  );
}

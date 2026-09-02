/* eslint-disable react-hooks/refs */
import { memo, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import renderMarkdown from "@/utils/chat/markdown";
import DOMPurify from "@/utils/chat/purify";
import Citations from "../Citation";
import {
  THOUGHT_REGEX_CLOSE,
  THOUGHT_REGEX_COMPLETE,
  THOUGHT_REGEX_OPEN,
  ThoughtChainComponent,
} from "../ThoughtContainer";
import ErrorResponse from "../ErrorResponse";

const PromptReply = ({
  uuid,
  reply,
  pending,
  error,
  sources = [],
  statusMessages = [],
  runIsLive = true,
}) => {
  const { t } = useTranslation();
  if (!reply && sources.length === 0 && !pending && !error) return null;

  if (pending) {
    return (
      // Same row geometry as the Thinking disclosure - full width, `py-2`, an
      // 18px leading slot - so the two loading states occupy the same line and
      // the same left edge instead of each sitting at its own inset.
      <div className="flex w-full justify-start">
        <div className="flex w-full items-center gap-x-2.5 py-2">
          {/*
            The dots below are the only signal that a reply is coming, and they
            are purely visual. The status region gives a screen reader user the
            same information. It carries the text rather than wrapping the
            animation so that it announces once, on appearance, instead of on
            every repaint.
          */}
          <span className="sr-only" role="status">
            {t("chat_window.generating_response")}
          </span>
          <span
            className="flex size-[18px] shrink-0 items-center gap-[3px]"
            aria-hidden="true"
          >
            <span className="typing-dot" />
            <span className="typing-dot" style={{ animationDelay: "0.15s" }} />
            <span className="typing-dot" style={{ animationDelay: "0.3s" }} />
          </span>
        </div>
      </div>
    );
  }

  if (error) {
    return <ErrorResponse error={error} />;
  }

  return (
    <div key={uuid} className="flex justify-start w-full">
      <div className="py-4 pl-0 pr-4 flex flex-col w-full">
        <RenderAssistantChatContent
          key={`${uuid}-prompt-reply-content`}
          message={reply}
          messageId={uuid}
          statusMessages={statusMessages}
          runIsLive={runIsLive}
        />
        <Citations sources={sources} />
      </div>
    </div>
  );
};

function RenderAssistantChatContent({
  message,
  messageId,
  statusMessages,
  runIsLive,
}) {
  const contentRef = useRef("");
  const thoughtChainRef = useRef(null);

  useEffect(() => {
    const thinking =
      message.match(THOUGHT_REGEX_OPEN) && !message.match(THOUGHT_REGEX_CLOSE);

    if (thinking && thoughtChainRef.current) {
      thoughtChainRef.current.updateContent(message);
      return;
    }

    const completeThoughtChain = message.match(THOUGHT_REGEX_COMPLETE)?.[0];
    const msgToRender = message.replace(THOUGHT_REGEX_COMPLETE, "");

    if (completeThoughtChain && thoughtChainRef.current) {
      thoughtChainRef.current.updateContent(completeThoughtChain);
    }

    contentRef.current = msgToRender;
  }, [message]);

  const thinking =
    message.match(THOUGHT_REGEX_OPEN) && !message.match(THOUGHT_REGEX_CLOSE);
  if (thinking)
    return (
      <ThoughtChainComponent
        ref={thoughtChainRef}
        content=""
        messageId={messageId}
        allowAnimation={true}
        statusMessages={statusMessages}
        runIsLive={runIsLive}
      />
    );

  return (
    <div className="flex flex-col gap-y-1">
      {message.match(THOUGHT_REGEX_COMPLETE) && (
        <ThoughtChainComponent
          ref={thoughtChainRef}
          content=""
          messageId={messageId}
          allowAnimation={true}
        />
      )}
      <span
        className="wrap-break-word"
        dangerouslySetInnerHTML={{
          __html: DOMPurify.sanitize(renderMarkdown(contentRef.current)),
        }}
      />
    </div>
  );
}

export default memo(PromptReply);

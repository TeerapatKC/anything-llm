import React, { memo, useLayoutEffect, useRef, useState } from "react";
import { CircleStop, Info } from "lucide-react";
import Actions from "./Actions";
import renderMarkdown from "@/utils/chat/markdown";
import Citations from "../Citation";
import { v4 } from "uuid";
import DOMPurify from "@/utils/chat/purify";
import { EditMessageForm, useEditMessage } from "./Actions/EditMessage";
import { useWatchDeleteMessage } from "./Actions/DeleteMessage";
import TTSMessage from "./Actions/TTSButton";
import {
  THOUGHT_REGEX_CLOSE,
  THOUGHT_REGEX_COMPLETE,
  THOUGHT_REGEX_OPEN,
  ThoughtChainComponent,
} from "../ThoughtContainer";
import paths from "@/utils/paths";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { chatQueryRefusalResponse } from "@/utils/chat";
import HistoricalOutputs from "./HistoricalOutputs";
import HistoricalClarifyingQuestions from "./HistoricalClarifyingQuestions";
import ErrorResponse from "../ErrorResponse";
import { openImageLightbox } from "@/components/ImageLightbox";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

function hasVisibleContent(message) {
  if (!message) return false;
  const stripped = message
    .replace(new RegExp(THOUGHT_REGEX_COMPLETE, "g"), "")
    .trim();
  if (!stripped) return false;
  if (
    stripped.match(THOUGHT_REGEX_OPEN) &&
    !stripped.match(THOUGHT_REGEX_CLOSE)
  )
    return false;
  return true;
}

/**
 * A completed thought chain takes itself off screen once the answer it preceded
 * arrives (see ThoughtChainComponent), so an assistant message that is *only* a
 * completed thought chain renders nothing at all - yet its wrapper still lays out
 * `py-4`, 32px of blank space. An agent run emits one of these per step, so the
 * gap between the prompt and the live status row grew by 32px on every tool call.
 *
 * @returns {boolean} true when the row would be empty and should not be rendered
 */
function assistantRendersNothing({
  message,
  stopped,
  sources,
  attachments,
  outputs,
  clarifyingQuestions,
}) {
  if (stopped) return false;
  if (
    sources?.length ||
    attachments?.length ||
    outputs?.length ||
    clarifyingQuestions?.length
  )
    return false;
  if (!message) return true;
  if (hasVisibleContent(message)) return false;
  // An unclosed chain is still being written, and that row is on screen.
  return !(
    message.match(THOUGHT_REGEX_OPEN) && !message.match(THOUGHT_REGEX_CLOSE)
  );
}

const HistoricalMessage = ({
  uuid: uuidProp,
  message,
  role,
  workspace,
  sources = [],
  attachments = [],
  error = false,
  feedbackScore = null,
  chatId = null,
  isLastMessage = false,
  regenerateMessage,
  saveEditedMessage,
  forkThread,
  metrics = {},
  outputs = [],
  clarifyingQuestions = [],
  stopped = false,
  statusMessages = [],
  runIsLive = true,
}) => {
  // Freeze uuid on first render. User messages arrive without a uuid and this value
  // is used as the wrapper div's `key` — a default param fallback would regenerate
  // on every render and remount the subtree, wiping TruncatableContent state.
  const [uuid] = useState(() => uuidProp ?? v4());
  // Identity for the edit/delete actions. A turn only earns a chatId once its answer
  // completes and the pair is saved, so before that - and forever, if the answer
  // failed - the client-side uuid is the only handle the message has.
  const messageKey = chatId ?? uuid;
  const { t } = useTranslation();
  const { isEditing } = useEditMessage({ messageKey, role });
  const { isDeleted, completeDelete, onEndAnimation } = useWatchDeleteMessage({
    chatId,
    role,
  });
  const adjustTextArea = (event) => {
    const element = event.target;
    element.style.height = "auto";
    element.style.height = element.scrollHeight + "px";
  };

  const isRefusalMessage =
    role === "assistant" && message === chatQueryRefusalResponse(workspace);

  if (completeDelete) return null;

  if (!!error) {
    return (
      <div key={uuid} className="flex w-full flex-col group">
        <ErrorResponse error={error} />
        {/*
          Without this the failed answer had no actions at all, so the one turn a
          person actually wants to re-run was the only one they could not.
        */}
        <div className="px-4 md:pl-0">
          <Actions
            message={message}
            feedbackScore={feedbackScore}
            messageKey={messageKey}
            chatId={chatId}
            slug={workspace?.slug}
            isLastMessage={isLastMessage}
            regenerateMessage={regenerateMessage}
            isEditing={isEditing}
            role={role}
            forkThread={forkThread}
            metrics={metrics}
          />
        </div>
      </div>
    );
  }

  if (role === "user") {
    if (isEditing) {
      return (
        <div key={uuid} className="flex justify-end w-full py-4 px-4">
          <EditMessageForm
            role={role}
            messageKey={messageKey}
            chatId={chatId}
            message={message}
            attachments={attachments}
            adjustTextArea={adjustTextArea}
            saveChanges={saveEditedMessage}
          />
        </div>
      );
    }

    return (
      <div
        key={uuid}
        onAnimationEnd={onEndAnimation}
        className={`${isDeleted ? "animate-remove" : ""} flex justify-end w-full group`}
      >
        <div className="py-4 px-4 flex flex-col items-end">
          <div className="bg-zinc-800 light:bg-slate-100 rounded-[20px] rounded-br-none px-4 py-3.5 max-w-[600px] [&_p]:m-0">
            <TruncatableContent>
              <RenderChatContent
                role={role}
                message={message}
                messageId={uuid}
              />
              <ChatAttachments attachments={attachments} />
            </TruncatableContent>
          </div>
          <Actions
            message={message}
            feedbackScore={feedbackScore}
            messageKey={messageKey}
            chatId={chatId}
            slug={workspace?.slug}
            isLastMessage={isLastMessage}
            regenerateMessage={regenerateMessage}
            isEditing={isEditing}
            role={role}
            forkThread={forkThread}
            metrics={metrics}
          />
        </div>
      </div>
    );
  }

  if (
    !isEditing &&
    assistantRendersNothing({
      message,
      stopped,
      sources,
      attachments,
      outputs,
      clarifyingQuestions,
    })
  )
    return null;

  return (
    <div
      key={uuid}
      onAnimationEnd={onEndAnimation}
      className={`${isDeleted ? "animate-remove" : ""} flex justify-start w-full group`}
    >
      <div className="py-4 px-4 md:pl-0 flex flex-col w-full">
        {isEditing ? (
          <EditMessageForm
            role={role}
            messageKey={messageKey}
            chatId={chatId}
            message={message}
            attachments={attachments}
            adjustTextArea={adjustTextArea}
            saveChanges={saveEditedMessage}
          />
        ) : (
          <div className="wrap-break-word">
            <HistoricalClarifyingQuestions surveys={clarifyingQuestions} />
            <RenderChatContent
              role={role}
              message={message}
              messageId={uuid}
              allowAnimation={isLastMessage && !stopped}
              stopped={stopped}
              statusMessages={statusMessages}
              runIsLive={runIsLive}
            />
            {stopped && !message?.match(THOUGHT_REGEX_OPEN) && (
              <StoppedResponse />
            )}
            {isRefusalMessage && (
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Link
                      className="no-underline! group flex! w-fit"
                      to={paths.chatModes()}
                      target="_blank"
                    />
                  }
                >
                  <div className="flex flex-row items-center gap-x-1 group-hover:opacity-100 opacity-60 w-fit">
                    <Info className="text-theme-text-secondary" />
                    <p className="m-0! p-0! text-theme-text-secondary no-underline! text-xs cursor-pointer">
                      {t("chat.refusal.tooltip-title")}
                    </p>
                  </div>
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  className="max-w-[250px] text-xs"
                >{`${t("chat.refusal.tooltip-description")}`}</TooltipContent>
              </Tooltip>
            )}
            <ChatAttachments attachments={attachments} />
            <HistoricalOutputs outputs={outputs} />
          </div>
        )}
        {hasVisibleContent(message) && (
          <div className="mt-1">
            <Actions
              message={message}
              feedbackScore={feedbackScore}
              messageKey={messageKey}
              chatId={chatId}
              slug={workspace?.slug}
              isLastMessage={isLastMessage}
              regenerateMessage={regenerateMessage}
              isEditing={isEditing}
              role={role}
              forkThread={forkThread}
              metrics={metrics}
              leadingAction={
                <TTSMessage
                  slug={workspace?.slug}
                  chatId={chatId}
                  message={message}
                />
              }
            />
          </div>
        )}
        {role === "assistant" && <Citations sources={sources} />}
      </div>
    </div>
  );
};

export default memo(
  HistoricalMessage,
  // Skip re-render the historical message:
  // - if the content is the exact same
  // - AND (not streaming)
  // - the lastMessage status is the same (regen icon)
  // - the chatID matches between renders. (feedback icons)
  // - the metrics are the same (metrics are updated in real time)
  (prevProps, nextProps) => {
    return (
      prevProps.message === nextProps.message &&
      prevProps.isLastMessage === nextProps.isLastMessage &&
      prevProps.chatId === nextProps.chatId &&
      JSON.stringify(prevProps.metrics) === JSON.stringify(nextProps.metrics) &&
      JSON.stringify(prevProps.sources) === JSON.stringify(nextProps.sources) &&
      JSON.stringify(prevProps.clarifyingQuestions) ===
        JSON.stringify(nextProps.clarifyingQuestions) &&
      // Folded-in agent commentary grows during a run; without this the row keeps
      // rendering the first batch it was given.
      prevProps.statusMessages?.length === nextProps.statusMessages?.length &&
      // The row switches from "Thinking" to "Stopped" on this alone.
      prevProps.runIsLive === nextProps.runIsLive
    );
  }
);

/**
 * Currently only renders image attachments as clickable thumbnails that open in the lightbox.
 * Other attachment types may be supported here in the future.
 */
function ChatAttachments({ attachments = [] }) {
  if (!attachments.length) return null;
  return (
    <div className="flex flex-wrap gap-4 mt-4">
      {attachments.map((item, index) => (
        <button
          type="button"
          key={item.name}
          onClick={() => openImageLightbox(attachments, index)}
          className="p-0 border-none bg-transparent cursor-pointer hover:opacity-80 transition-opacity"
        >
          <img
            alt={`Attachment: ${item.name}`}
            src={item.contentString}
            className="w-[120px] h-[120px] object-cover rounded-lg"
          />
        </button>
      ))}
    </div>
  );
}

function TruncatableContent({ children }) {
  const contentRef = useRef(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const { t } = useTranslation();

  // useLayoutEffect (not useEffect) so collapse applies before paint — avoids a
  // one-frame flash of uncollapsed content on mount.
  useLayoutEffect(() => {
    if (contentRef.current) {
      setIsOverflowing(contentRef.current.scrollHeight > 250);
    }
  }, []);

  const showTruncation = !isExpanded && isOverflowing;

  return (
    <>
      <div className="relative">
        <div
          ref={contentRef}
          className={showTruncation ? "max-h-[250px] overflow-hidden" : ""}
        >
          {children}
        </div>
        {showTruncation && (
          <>
            <div
              className="absolute bottom-0 left-0 right-0 h-[36px] light:hidden pointer-events-none"
              style={{
                background:
                  "linear-gradient(180deg, rgba(39, 39, 42, 0.00) 0%, rgba(39, 39, 42, 0.65) 50%, #27272A 100%)",
              }}
            />
            <div
              className="absolute bottom-0 left-0 right-0 h-[36px] hidden light:block pointer-events-none"
              style={{
                background:
                  "linear-gradient(180deg, rgba(241, 245, 249, 0.00) 0%, rgba(241, 245, 249, 0.65) 50%, #F1F5F9 100%)",
              }}
            />
          </>
        )}
      </div>
      {isOverflowing && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-zinc-300 light:text-slate-700 hover:text-white light:hover:text-slate-900 text-xs font-medium leading-4 mt-2"
        >
          {isExpanded ? t("chat_window.see_less") : t("chat_window.see_more")}
        </button>
      )}
    </>
  );
}

const RenderChatContent = memo(
  ({
    role,
    message,
    messageId,
    allowAnimation = false,
    stopped = false,
    statusMessages = [],
    runIsLive = true,
  }) => {
    // If the message is not from the assistant, we can render it directly
    // as normal since the user cannot think (lol)
    if (role !== "assistant")
      return (
        <span
          className="flex flex-col gap-y-1 text-theme-text-primary light:text-slate-900"
          dangerouslySetInnerHTML={{
            __html: DOMPurify.sanitize(renderMarkdown(message)),
          }}
        />
      );
    let thoughtChain = null;
    let msgToRender = message;
    if (!message) return stopped ? <StoppedResponse /> : null;

    // If the message is a perfect thought chain, we can render it directly
    // Complete == open and close tags match perfectly.
    if (message.match(THOUGHT_REGEX_COMPLETE)) {
      thoughtChain = message.match(THOUGHT_REGEX_COMPLETE)?.[0];
      msgToRender = message.replace(THOUGHT_REGEX_COMPLETE, "");
    }

    // If the message is a thought chain but not a complete thought chain (matching opening tags but not closing tags),
    // we can render it as a thought chain if we can at least find a closing tag
    // This can occur when the assistant starts with <thinking> and then <response>'s later.
    if (
      message.match(THOUGHT_REGEX_OPEN) &&
      !message.match(THOUGHT_REGEX_CLOSE)
    ) {
      thoughtChain = message;
      msgToRender = "";
    }

    return (
      <>
        {thoughtChain && (
          <ThoughtChainComponent
            content={thoughtChain}
            messageId={messageId}
            allowAnimation={allowAnimation}
            stopped={stopped}
            statusMessages={statusMessages}
            runIsLive={runIsLive}
          />
        )}
        {msgToRender.trim().length > 0 && (
          <span
            className="flex flex-col gap-y-1 text-theme-text-primary light:text-slate-900"
            dangerouslySetInnerHTML={{
              __html: DOMPurify.sanitize(renderMarkdown(msgToRender)),
            }}
          />
        )}
      </>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.role === nextProps.role &&
      prevProps.message === nextProps.message &&
      prevProps.messageId === nextProps.messageId &&
      prevProps.allowAnimation === nextProps.allowAnimation &&
      prevProps.stopped === nextProps.stopped
    );
  }
);

function StoppedResponse() {
  return (
    <div className="mt-2 flex items-center gap-x-2 font-mono text-xs text-white/40 light:text-slate-900/40">
      <CircleStop className="size-3.5" />
      <span>Response stopped</span>
    </div>
  );
}

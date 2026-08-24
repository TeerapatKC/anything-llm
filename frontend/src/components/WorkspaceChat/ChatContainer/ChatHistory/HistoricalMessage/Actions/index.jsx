import React, { memo, useState } from "react";
import useCopyText from "@/hooks/useCopyText";
import { Check, ClipboardCopy, RotateCcw, ThumbsUp } from "lucide-react";
import Workspace from "@/models/workspace";
import { EditMessageAction } from "./EditMessage";
import RenderMetrics from "./RenderMetrics";
import ActionMenu from "./ActionMenu";
import { useTranslation } from "react-i18next";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const Actions = ({
  message,
  feedbackScore,
  chatId,
  slug,
  isLastMessage,
  regenerateMessage,
  forkThread,
  isEditing,
  role,
  metrics = {},
}) => {
  const { t } = useTranslation();
  const [selectedFeedback, setSelectedFeedback] = useState(feedbackScore);
  const handleFeedback = async (newFeedback) => {
    const updatedFeedback =
      selectedFeedback === newFeedback ? null : newFeedback;
    await Workspace.updateChatFeedback(chatId, slug, updatedFeedback);
    setSelectedFeedback(updatedFeedback);
  };

  return (
    <div
      className={`flex w-full flex-wrap items-center gap-y-1 ${role === "user" ? "justify-end" : "justify-between"}`}
    >
      <div className="flex items-center justify-start gap-x-0.5">
        <div className="flex items-center justify-start gap-x-0.5 transition-all duration-300 md:opacity-0 md:group-hover:opacity-100">
          <div
            className={`flex items-center justify-start gap-x-0.5 ${role === "user" ? "flex-row-reverse" : ""}`}
          >
            <CopyMessage message={message} />
            <EditMessageAction
              chatId={chatId}
              role={role}
              isEditing={isEditing}
            />
          </div>
          {isLastMessage && !isEditing && (
            <RegenerateMessage
              regenerateMessage={regenerateMessage}
              slug={slug}
              chatId={chatId}
            />
          )}
          {chatId && role !== "user" && !isEditing && (
            <FeedbackButton
              isSelected={selectedFeedback === true}
              handleFeedback={() => handleFeedback(true)}
              tooltipId="feedback-button"
              tooltipContent={t("chat_window.good_response")}
              IconComponent={ThumbsUp}
            />
          )}
          <ActionMenu
            chatId={chatId}
            forkThread={forkThread}
            isEditing={isEditing}
            role={role}
          />
        </div>
      </div>
      <RenderMetrics metrics={metrics} />
    </div>
  );
};

function FeedbackButton({
  isSelected,
  handleFeedback,
  tooltipContent,
  IconComponent,
}) {
  return (
    <div className="relative">
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              onClick={handleFeedback}
              className="flex size-7 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-white/5 hover:text-zinc-200 light:text-slate-500 light:hover:bg-black/5 light:hover:text-slate-700"
              aria-label={tooltipContent}
            />
          }
        >
          {/* lucide icons are stroked outlines; filling with the current
              colour is how the selected state reads as "solid". */}
          <IconComponent
            size={16}
            fill={isSelected ? "currentColor" : "none"}
          />
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[250px] text-xs">
          {tooltipContent}
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

function CopyMessage({ message }) {
  const { copied, copyText } = useCopyText();
  const { t } = useTranslation();

  return (
    <>
      <div className="relative">
        <Tooltip>
          <TooltipTrigger
            render={
              <button
                onClick={() => copyText(message)}
                className="flex size-7 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-white/5 hover:text-zinc-200 light:text-slate-500 light:hover:bg-black/5 light:hover:text-slate-700"
                aria-label={t("chat_window.copy")}
              />
            }
          >
            {copied ? <Check size={16} /> : <ClipboardCopy size={16} />}
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-[250px] text-xs">
            {t("chat_window.copy")}
          </TooltipContent>
        </Tooltip>
      </div>
    </>
  );
}

function RegenerateMessage({ regenerateMessage, chatId }) {
  const { t } = useTranslation();
  if (!chatId) return null;
  return (
    <div className="relative">
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              onClick={() => regenerateMessage(chatId)}
              className="flex size-7 items-center justify-center rounded-md border-none text-zinc-400 transition-colors hover:bg-white/5 hover:text-zinc-200 light:text-slate-500 light:hover:bg-black/5 light:hover:text-slate-700"
              aria-label={t("chat_window.regenerate")}
            />
          }
        >
          <RotateCcw size={16} />
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[250px] text-xs">
          {t("chat_window.regenerate_response")}
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

export default memo(Actions);

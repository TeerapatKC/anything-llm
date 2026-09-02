import React, { memo, useState } from "react";
import useCopyText from "@/hooks/useCopyText";
import {
  Check,
  ClipboardCopy,
  RotateCcw,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
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
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

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
  leadingAction = null,
}) => {
  const { t } = useTranslation();
  const [selectedFeedback, setSelectedFeedback] = useState(feedbackScore);
  const [askingWhy, setAskingWhy] = useState(false);

  const handleFeedback = async (newFeedback) => {
    const updatedFeedback =
      selectedFeedback === newFeedback ? null : newFeedback;
    await Workspace.updateChatFeedback(chatId, slug, updatedFeedback);
    setSelectedFeedback(updatedFeedback);

    // The rating is already saved before the reason is asked for, so closing
    // the dialog or typing nothing still leaves a recorded thumbs-down.
    if (updatedFeedback === false) setAskingWhy(true);
  };

  const submitReason = async (comment) => {
    await Workspace.updateChatFeedback(chatId, slug, false, comment);
    setAskingWhy(false);
  };

  return (
    <div
      className={`flex w-full flex-wrap items-center gap-y-1 ${role === "user" ? "justify-end" : "justify-between"}`}
    >
      <div className="flex shrink-0 items-center justify-start gap-x-0.5">
        {leadingAction}
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
            <>
              <FeedbackButton
                isSelected={selectedFeedback === true}
                handleFeedback={() => handleFeedback(true)}
                tooltipContent={t("chat_window.good_response")}
                IconComponent={ThumbsUp}
              />
              <FeedbackButton
                isSelected={selectedFeedback === false}
                handleFeedback={() => handleFeedback(false)}
                tooltipContent={t("chat_window.bad_response")}
                IconComponent={ThumbsDown}
              />
            </>
          )}
          <ActionMenu
            chatId={chatId}
            forkThread={forkThread}
            isEditing={isEditing}
            role={role}
          />
        </div>
      </div>
      {/* Assistant rows only: on a user row this would be an empty flex-1
          spacer, and the actions are right-aligned there. */}
      {role !== "user" && (
        <div className="flex min-w-0 flex-1 justify-end">
          <RenderMetrics metrics={metrics} />
        </div>
      )}
      <FeedbackReasonDialog
        open={askingWhy}
        onClose={() => setAskingWhy(false)}
        onSubmit={submitReason}
      />
    </div>
  );
};

/**
 * Asks what was wrong with an answer that was just marked unhelpful. Optional
 * by design - a rating with no explanation is still worth having.
 */
function FeedbackReasonDialog({ open, onClose, onSubmit }) {
  const { t } = useTranslation();
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!comment.trim()) return onClose();
    setSaving(true);
    await onSubmit(comment.trim());
    setSaving(false);
    setComment("");
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          setComment("");
          onClose();
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            {t("chat_window.feedback_reason_title")}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Textarea
            autoFocus
            rows={4}
            maxLength={1000}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={t("chat_window.feedback_reason_placeholder")}
          />
          <DialogFooter>
            <DialogClose render={<Button variant="outline" type="button" />}>
              {t("chat_window.feedback_reason_skip")}
            </DialogClose>
            <Button variant="default" type="submit" disabled={saving}>
              {t("chat_window.feedback_reason_submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

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

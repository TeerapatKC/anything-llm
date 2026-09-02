import { Info, SquarePen } from "lucide-react";
import { useRef, useEffect } from "react";
import Appearance from "@/models/appearance";
import { useTranslation } from "react-i18next";
import {
  useMessageActionsContext,
  EDIT_EVENT,
} from "@/components/WorkspaceChat/ChatContainer/ChatHistory/MessageActionsContext";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function useEditMessage({ messageKey, role }) {
  const context = useMessageActionsContext();
  const isEditing = context?.isEditing(messageKey, role) ?? false;
  return { isEditing };
}

/**
 * @param {Object} props
 * @param {string} props.messageKey - Stable identity for this message: its chatId once
 *   the turn is saved, otherwise its client-side uuid.
 * @param {string|null} props.chatId - Null until the turn has been written to the database.
 */
export function EditMessageAction({
  messageKey = null,
  chatId = null,
  role,
  isEditing,
}) {
  const { t } = useTranslation();
  function handleEditClick() {
    window.dispatchEvent(
      new CustomEvent(EDIT_EVENT, { detail: { messageKey, chatId, role } })
    );
  }

  // An unsaved assistant answer has nothing to edit into - there is no stored text
  // to correct, and re-running it is what Retry is for. A prompt is editable either
  // way: unsaved, editing it just replays the turn locally.
  if (!messageKey || isEditing) return null;
  if (!chatId && role !== "user") return null;
  return (
    <div
      className={`relative ${role === "user" && !isEditing ? "" : "opacity-100!"}`}
    >
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              onClick={handleEditClick}
              className="flex size-7 items-center justify-center rounded-md border-none p-0 text-zinc-400 transition-colors hover:bg-white/5 hover:text-zinc-200 light:text-slate-500 light:hover:bg-black/5 light:hover:text-slate-700"
              aria-label={`Edit ${role === "user" ? t("chat_window.edit_prompt") : t("chat_window.edit_response")}`}
            />
          }
        >
          <SquarePen size={16} />
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[250px] text-xs">{`${
          role === "user"
            ? t("chat_window.edit_prompt")
            : t("chat_window.edit_response")
        } `}</TooltipContent>
      </Tooltip>
    </div>
  );
}

export function EditMessageForm({
  role,
  messageKey,
  chatId,
  message,
  attachments = [],
  adjustTextArea,
  saveChanges,
}) {
  const formRef = useRef(null);

  function closeEditor() {
    window.dispatchEvent(
      new CustomEvent(EDIT_EVENT, {
        detail: { messageKey, chatId, role, attachments },
      })
    );
  }

  function handleSubmit(e) {
    e.preventDefault();
    const editedMessage = formRef.current.value;
    saveChanges({ editedMessage, messageKey, chatId, role, attachments });
    closeEditor();
  }

  function handleSave() {
    const editedMessage = formRef.current.value;
    saveChanges({
      editedMessage,
      messageKey,
      chatId,
      role,
      attachments,
      saveOnly: true,
    });
    closeEditor();
  }

  function cancelEdits() {
    closeEditor();
    return false;
  }

  useEffect(() => {
    if (!formRef?.current) return;
    formRef.current.focus();
    adjustTextArea({ target: formRef.current });
  }, []);

  if (role === "user") {
    return (
      <form
        onSubmit={handleSubmit}
        className="flex flex-col w-full max-w-[650px]"
      >
        <textarea
          ref={formRef}
          name="editedMessage"
          spellCheck={Appearance.get("enableSpellCheck")}
          className="text-theme-text-primary light:text-slate-900 w-full rounded-2xl bg-zinc-800 light:bg-slate-100 border border-sky-300 focus:border-sky-300 active:outline-none focus:outline-none focus:ring-0 px-4 py-3 resize-none overflow-hidden"
          defaultValue={message}
          onChange={adjustTextArea}
        />
        <EditActionBar
          onCancel={cancelEdits}
          onSave={handleSave}
          isUserMessage
        />
      </form>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col w-full max-w-[650px]"
    >
      <textarea
        ref={formRef}
        name="editedMessage"
        spellCheck={Appearance.get("enableSpellCheck")}
        className="text-theme-text-primary light:text-slate-900 w-full rounded-2xl bg-zinc-800 light:bg-slate-100 border border-sky-300 focus:border-sky-300 active:outline-none focus:outline-none focus:ring-0 px-4 py-3 resize-none overflow-hidden"
        defaultValue={message}
        onChange={adjustTextArea}
      />
      <EditActionBar onCancel={cancelEdits} />
    </form>
  );
}

function EditActionBar({ onCancel, onSave, isUserMessage = false }) {
  const { t } = useTranslation();
  return (
    <div className="mt-2 flex flex-col md:flex-row md:items-center justify-between gap-2 bg-zinc-800 light:bg-slate-200 rounded-lg p-2">
      <div className="flex items-start gap-2">
        <Info
          size={12}
          className="shrink-0 mt-0.5 text-zinc-200 light:text-slate-800"
        />
        <span className="text-zinc-200 light:text-slate-800 text-xs leading-4">
          {isUserMessage
            ? t("chat_window.edit_info_user")
            : t("chat_window.edit_info_assistant")}
        </span>
      </div>
      <div className="flex items-center gap-2 self-end shrink-0">
        <button
          type="button"
          onClick={onCancel}
          className="border-none text-theme-text-primary light:text-slate-900 text-sm font-medium w-[70px] h-9 rounded-lg hover:bg-white/5 light:hover:bg-slate-300"
        >
          {t("chat_window.cancel")}
        </button>
        {isUserMessage && (
          <button
            type="button"
            onClick={onSave}
            className="border border-zinc-600 light:border-slate-600 text-theme-text-primary light:text-slate-900 text-sm font-medium w-[70px] h-9 rounded-lg hover:bg-white/5 light:hover:bg-slate-300"
          >
            {t("chat_window.save")}
          </button>
        )}
        <button
          type="submit"
          className="border-none bg-zinc-50 light:bg-slate-800 text-zinc-800 light:text-white text-sm font-medium w-[70px] h-9 rounded-lg hover:bg-zinc-200 light:hover:bg-slate-800"
        >
          {isUserMessage ? t("chat_window.submit") : t("chat_window.save")}
        </button>
      </div>
    </div>
  );
}

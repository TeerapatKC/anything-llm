import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogClose,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

/**
 * @param {Object} props
 * @param {boolean} props.isOpen
 * @param {function} props.onClose
 * @param {function} props.onSubmit - Called with (content)
 * @param {string} [props.initialContent] - Pre-filled content for editing
 * @param {"create"|"edit"} [props.mode]
 */
export default function MemoryModal({
  isOpen,
  onClose,
  onSubmit,
  initialContent = "",
  mode = "create",
}) {
  const { t } = useTranslation();
  const [content, setContent] = useState(initialContent);
  const isCreate = mode === "create";
  const [title, submitLabel, description] = useMemo(() => {
    if (isCreate) {
      return [
        t("chat_window.memories.modal.create_title"),
        t("chat_window.memories.modal.create"),
        t("chat_window.memories.modal.create_description"),
      ];
    } else {
      return [
        t("chat_window.memories.modal.edit_title"),
        t("chat_window.memories.modal.save"),
        t("chat_window.memories.modal.edit_description"),
      ];
    }
  }, [isCreate, t]);

  useEffect(() => {
    if (isOpen) setContent(initialContent);
  }, [isOpen, initialContent]);

  function handleSubmit() {
    if (!content.trim()) return;
    onSubmit(content.trim());
    onClose();
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[400px] bg-zinc-900 light:bg-white border-zinc-800 light:border-slate-300">
        <div className="flex flex-col gap-1">
          <DialogTitle className="text-sm font-semibold text-zinc-50 light:text-slate-800">
            {title}
          </DialogTitle>
          <p className="text-xs leading-4 text-zinc-400 light:text-slate-500">
            {description}
          </p>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-zinc-200 light:text-slate-700">
            {t("chat_window.memories.modal.label")}
          </label>
          <textarea
            autoFocus
            onFocus={(e) => {
              const len = e.currentTarget.value.length;
              e.currentTarget.setSelectionRange(len, len);
            }}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={t("chat_window.memories.modal.placeholder")}
            rows={4}
            className="w-full bg-zinc-800 light:bg-white text-zinc-50 light:border light:border-slate-300 light:text-slate-700 placeholder:text-zinc-500 light:placeholder:text-slate-400 text-sm rounded-lg p-3 resize-none outline-none focus:border-zinc-500 light:focus:border-slate-400"
          />
        </div>
        <DialogFooter className="p-0 sm:justify-between">
          <DialogClose asChild>
            <Button variant="outline" type="button">
              {t("chat_window.memories.modal.cancel")}
            </Button>
          </DialogClose>
          <Button
            variant="default"
            type="button"
            onClick={handleSubmit}
            disabled={!content.trim()}
          >
            {submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

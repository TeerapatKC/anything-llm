import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  SHORTCUTS,
  isMac,
  KEYBOARD_SHORTCUTS_HELP_EVENT,
} from "@/utils/keyboardShortcuts";

export default function KeyboardShortcutsHelp() {
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    window.addEventListener(KEYBOARD_SHORTCUTS_HELP_EVENT, () =>
      setIsOpen((prev) => !prev)
    );
    return () => {
      window.removeEventListener(KEYBOARD_SHORTCUTS_HELP_EVENT, () =>
        setIsOpen(false)
      );
    };
  }, []);

  if (!isOpen) return null;
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-2xl bg-theme-bg-secondary border-theme-modal-border">
        <DialogHeader className="p-0">
          <DialogTitle>{t("keyboard-shortcuts.title")}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(SHORTCUTS).map(([key, shortcut]) => (
            <div
              key={key}
              className="flex items-center justify-between p-3 bg-theme-bg-hover rounded-lg"
            >
              <span className="text-theme-text-primary">
                {t(`keyboard-shortcuts.shortcuts.${shortcut.translationKey}`)}
              </span>
              <kbd className="px-2 py-1 bg-theme-bg-secondary text-theme-text-primary rounded border border-gray-600">
                {isMac ? key : key.replace("⌘", "Ctrl")}
              </kbd>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

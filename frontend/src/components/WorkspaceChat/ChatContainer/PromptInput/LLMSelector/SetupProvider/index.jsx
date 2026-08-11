import { WarningCircle } from "@phosphor-icons/react";
import System from "@/models/system";
import showToast from "@/utils/toast";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogFooter,
} from "@/components/ui/dialog";

export default function SetupProvider({
  isOpen,
  closeModal,
  postSubmit,
  settings,
  llmProvider,
}) {
  if (!isOpen) return null;

  async function handleUpdate(e) {
    e.preventDefault();
    e.stopPropagation();
    const data = {};
    const form = new FormData(e.target);
    for (var [key, value] of form.entries()) data[key] = value;
    const { error } = await System.updateSystem(data);
    if (error) {
      showToast(
        `Failed to save ${llmProvider.name} settings: ${error}`,
        "error"
      );
      return;
    }

    closeModal();
    postSubmit();
    return false;
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && closeModal()}>
      <DialogContent className="max-w-2xl bg-theme-bg-secondary border-theme-modal-border">
        <DialogHeader className="p-0">
          <DialogTitle className="text-sm font-semibold">
            {llmProvider.name} Settings
          </DialogTitle>
        </DialogHeader>
        <form id="provider-form" onSubmit={handleUpdate}>
          <div className="space-y-4 p-1">
            <p className="text-sm text-white/60">
              To use {llmProvider.name} as this workspace's LLM you need to set
              it up first.
            </p>
            <div>
              {llmProvider.options(settings, { credentialsOnly: true })}
            </div>
          </div>
          <DialogFooter className="mt-6 p-0 sm:justify-between">
            <DialogClose asChild>
              <Button variant="outline" type="button">
                Cancel
              </Button>
            </DialogClose>
            <Button variant="default" type="submit" form="provider-form">
              Save settings
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function NoSetupWarning({ showing, onSetupClick }) {
  const { t } = useTranslation();
  if (!showing) return null;

  return (
    <div className="flex items-start gap-1.5">
      <WarningCircle
        size={16}
        className="text-white light:text-slate-800 shrink-0 mt-0.5"
      />
      <p className="text-[13px] text-white light:text-slate-800 leading-5">
        {t("chat_window.workspace_llm_manager.missing_credentials")}{" "}
        <span
          onClick={onSetupClick}
          className="text-sky-400 font-semibold cursor-pointer hover:underline"
          role="button"
        >
          {t(
            "chat_window.workspace_llm_manager.missing_credentials_description"
          )}
        </span>
      </p>
    </div>
  );
}

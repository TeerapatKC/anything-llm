// This component differs from the main LLMItem in that it shows if a provider is
// "ready for use" and if not - will then highjack the click handler to show a modal
// of the provider options that must be saved to continue.
import { createPortal } from "react-dom";
import { useModal } from "@/hooks/useModal";
import { Gear } from "@phosphor-icons/react";
import System from "@/models/system";
import showToast from "@/utils/toast";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const NO_SETTINGS_NEEDED = ["default"];
export default function WorkspaceLLM({
  llm,
  availableLLMs,
  settings,
  checked,
  onClick,
}) {
  const { isOpen, openModal, closeModal } = useModal();
  const { name, value, logo, description } = llm;
  const [currentSettings, setCurrentSettings] = useState(settings);

  useEffect(() => {
    async function getSettings() {
      if (isOpen) {
        const _settings = await System.keys();
        setCurrentSettings(_settings ?? {});
      }
    }
    getSettings();
  }, [isOpen]);

  function handleProviderSelection() {
    // Determine if provider needs additional setup because its minimum required keys are
    // not yet set in settings.
    if (!checked) {
      const requiresAdditionalSetup = (llm.requiredConfig || []).some(
        (key) => !currentSettings[key]
      );
      if (requiresAdditionalSetup) {
        openModal();
        return;
      }
      onClick(value);
    }
  }

  return (
    <>
      <div
        onClick={handleProviderSelection}
        className={`w-full p-2 rounded-md hover:cursor-pointer hover:bg-theme-bg-secondary ${
          checked ? "bg-theme-bg-secondary" : ""
        }`}
      >
        <input
          type="checkbox"
          value={value}
          className="peer hidden"
          checked={checked}
          readOnly={true}
          formNoValidate={true}
        />
        <div className="flex gap-x-4 items-center justify-between">
          <div className="flex gap-x-4 items-center">
            <img
              src={logo}
              alt={`${name} logo`}
              className="w-10 h-10 rounded-md"
            />
            <div className="flex flex-col">
              <div className="text-sm font-semibold text-white">{name}</div>
              <div className="mt-1 text-xs text-white/60">{description}</div>
            </div>
          </div>
          {checked && !NO_SETTINGS_NEEDED.includes(value) && (
            <button
              onClick={(e) => {
                e.preventDefault();
                openModal();
              }}
              className="p-2 text-white/60 hover:text-white hover:bg-theme-bg-hover rounded-md transition-all duration-300"
              title="Edit Settings"
            >
              <Gear size={20} weight="bold" />
            </button>
          )}
        </div>
      </div>
      <SetupProvider
        availableLLMs={availableLLMs}
        isOpen={isOpen}
        provider={value}
        closeModal={closeModal}
        postSubmit={onClick}
        settings={currentSettings}
      />
    </>
  );
}

function SetupProvider({
  availableLLMs,
  isOpen,
  provider,
  closeModal,
  postSubmit,
  settings,
}) {
  if (!isOpen) return null;
  const LLMOption = availableLLMs.find((llm) => llm.value === provider);
  if (!LLMOption) return null;

  async function handleUpdate(e) {
    e.preventDefault();
    e.stopPropagation();
    const data = {};
    const form = new FormData(e.target);
    for (var [key, value] of form.entries()) data[key] = value;
    const { error } = await System.updateSystem(data);
    if (error) {
      showToast(`Failed to save ${LLMOption.name} settings: ${error}`, "error");
      return;
    }

    closeModal();
    postSubmit();
    return false;
  }

  // Cannot do nested forms, it will cause all sorts of issues, so we portal this out
  // to the parent container form so we don't have nested forms.
  return createPortal(
    <Dialog open={isOpen} onOpenChange={(open) => !open && closeModal()}>
      <DialogContent className="max-w-2xl bg-theme-bg-secondary border-theme-modal-border">
        <DialogHeader className="p-0">
          <DialogTitle className="text-sm font-semibold">
            {LLMOption.name} Settings
          </DialogTitle>
        </DialogHeader>
        <form id="provider-form" onSubmit={handleUpdate}>
          <div className="space-y-4 p-1">
            <p className="text-sm text-white/60">
              To use {LLMOption.name} as this workspace's LLM you need to set it
              up first.
            </p>
            <div>{LLMOption.options(settings, { credentialsOnly: true })}</div>
          </div>
          <DialogFooter className="mt-4 p-0">
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
    </Dialog>,
    document.getElementById("workspace-chat-settings-container")
  );
}

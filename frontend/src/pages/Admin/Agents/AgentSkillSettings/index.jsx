import { useModal } from "@/hooks/useModal";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { SlidersHorizontal } from "@phosphor-icons/react";
import { useTranslation } from "react-i18next";
import MaxToolCallStack from "./MaxToolCallStack";
import AgentClarifyingQuestions from "./AgentClarifyingQuestions";
import AgentSkillReranker from "./AgentSkillReranker";

export default function AgentSkillSettings() {
  const { isOpen, openModal, closeModal } = useModal();
  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => (open ? openModal() : closeModal())}
    >
      <DialogTrigger asChild>
        <button
          type="button"
          className={`w-10 h-10 flex items-center justify-center light:border-black/10 light:border-solid border-none light:!border rounded-lg transition-colors outline-none bg-transparent hover:bg-theme-bg-secondary`}
        >
          <SlidersHorizontal
            size={24}
            className={`text-theme-text-secondary`}
          />
        </button>
      </DialogTrigger>
      <AgentSkillSettingsModal />
    </Dialog>
  );
}

function AgentSkillSettingsModal() {
  const { t } = useTranslation();

  return (
    <DialogContent className="max-w-[500px] bg-theme-bg-sidebar border-white/10">
      <DialogHeader className="p-0">
        <DialogTitle className="text-sm font-semibold">
          {t("agent.settings.title")}
        </DialogTitle>
      </DialogHeader>

      <div className="flex flex-col w-full">
        <div className="flex flex-col gap-y-5 w-full">
          <MaxToolCallStack />
          <div className="border-b border-white/10 h-[1px] w-full" />
          <AgentSkillReranker />
          <div className="border-b border-white/10 h-[1px] w-full" />
          <AgentClarifyingQuestions />
        </div>
      </div>
    </DialogContent>
  );
}

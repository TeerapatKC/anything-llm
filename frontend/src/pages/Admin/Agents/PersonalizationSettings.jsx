import { Brain } from "lucide-react";
import { useTranslation } from "react-i18next";
import AgentMemory from "./AgentSkillSettings/AgentMemory";

export default function PersonalizationSettings({ setHasChanges }) {
  const { t } = useTranslation();

  return (
    <section className="rounded-xl bg-card/70 p-3 text-theme-text-primary ring-1 ring-foreground/10">
      <div className="flex items-center gap-2">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted/40 text-theme-text-secondary">
          <Brain className="size-4" />
        </span>
        <div className="min-w-0">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-theme-text-secondary">
            {t("agent-panel.personalization-settings")}
          </h2>
          <p className="text-xs text-theme-text-secondary/80">
            {t("agent-panel.personalization-description")}
          </p>
        </div>
      </div>

      <div className="mt-2 border-t border-theme-sidebar-border py-3">
        <AgentMemory setHasChanges={setHasChanges} />
      </div>
    </section>
  );
}

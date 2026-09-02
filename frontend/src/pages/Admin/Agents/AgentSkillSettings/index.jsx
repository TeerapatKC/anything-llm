import { SlidersHorizontal } from "lucide-react";
import { useTranslation } from "react-i18next";
import MaxToolCallStack from "./MaxToolCallStack";
import AgentClarifyingQuestions from "./AgentClarifyingQuestions";
import AgentSkillReranker from "./AgentSkillReranker";

export default function AgentSkillSettings() {
  const { t } = useTranslation();

  return (
    <section className="rounded-xl bg-card/70 ring-1 ring-foreground/10 p-3 text-theme-text-primary">
      <div className="flex items-center gap-2">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted/40 text-theme-text-secondary">
          <SlidersHorizontal className="size-4" />
        </span>
        <div className="min-w-0">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-theme-text-secondary">
            {t("agent.settings.title")}
          </h2>
          <p className="text-xs text-theme-text-secondary/80">
            {t("help.agent-skill-settings")}
          </p>
        </div>
      </div>

      <div className="mt-2 w-full divide-y divide-theme-sidebar-border">
        <div className="py-3">
          <MaxToolCallStack />
        </div>
        <div className="py-3">
          <AgentSkillReranker />
        </div>
        <div className="py-3">
          <AgentClarifyingQuestions />
        </div>
      </div>
    </section>
  );
}

import { useEffect, useState } from "react";
import { Spinner } from "@/components/ui/spinner";
import { useTranslation } from "react-i18next";
import Toggle from "@/components/lib/Toggle";
import System from "@/models/system";

export default function AgentClarifyingQuestions({ setHasChanges }) {
  const { t } = useTranslation();
  const [enabled, setEnabled] = useState(false);
  const [maxPerTurn, setMaxPerTurn] = useState(3);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    System.keys()
      .then((res) => {
        setEnabled(!!res.AgentClarifyingQuestionsEnabled);
        setMaxPerTurn(parseInt(res.AgentClarifyingQuestionsMaxPerTurn) || 3);
      })
      .finally(() => setLoading(false));
  }, []);

  function toggleEnabled(next) {
    setEnabled(next);
    setHasChanges?.(true);
  }

  return (
    <div className="flex flex-col gap-y-3">
      <div className="flex items-center gap-x-4">
        <div className="min-w-0 flex-1">
          <label className="flex items-center gap-x-1 text-md font-medium text-theme-text-primary">
            {t("agent.settings.clarifying-questions.title")}
            {/* <i className="ml-1 rounded-md bg-blue-500/40 px-2 py-0.5 text-xs text-theme-text-primary">
              {t("agent.settings.clarifying-questions.beta-badge")}
            </i> */}
          </label>
          <p className="mt-1 text-xs text-theme-text-secondary">
            {t("agent.settings.clarifying-questions.description")}
          </p>
        </div>
        {loading ? (
          <Spinner className="shrink-0 text-theme-text-primary" />
        ) : (
          <>
            <input
              type="hidden"
              name="system::agent_clarifying_questions_enabled"
              value={String(enabled)}
            />
            <Toggle size="lg" enabled={enabled} onChange={toggleEnabled} />
          </>
        )}
      </div>
      {enabled && (
        <>
          <div className="flex items-center gap-x-4 rounded-lg bg-muted/20 p-3">
            <div className="flex flex-col gap-y-1 flex-1">
              <label className="block text-md font-medium text-theme-text-primary">
                {t("agent.settings.clarifying-questions.max-per-turn.title")}
              </label>
              <p className="text-xs text-theme-text-secondary">
                {t(
                  "agent.settings.clarifying-questions.max-per-turn.description"
                )}
              </p>
            </div>
            <input
              type="number"
              name="system::agent_clarifying_questions_max_per_turn"
              min={1}
              value={maxPerTurn}
              onChange={(e) => {
                if (e.target.value < 1) return;
                setMaxPerTurn(parseInt(e.target.value));
                setHasChanges?.(true);
              }}
              onWheel={(e) => e.target.blur()}
              className="border border-theme-sidebar-border bg-theme-settings-input-bg text-theme-text-primary placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-[80px] p-2.5 text-center"
              placeholder="3"
              autoComplete="off"
            />
          </div>
        </>
      )}
    </div>
  );
}

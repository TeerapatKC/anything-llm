import { useEffect, useState } from "react";
import { Spinner } from "@/components/ui/spinner";
import { useTranslation } from "react-i18next";
import Toggle from "@/components/lib/Toggle";
import System from "@/models/system";

/**
 * The instance-wide personalization policy.
 *
 * This lives here rather than in the chat sidebar because it is a deployment
 * decision - it governs LLM spend and what the product may retain about people
 * - and only an admin can make it. Each user then opts themselves in or out
 * underneath it, from the Memories panel in chat.
 */
export default function AgentMemory({ setHasChanges }) {
  const { t } = useTranslation();
  const [enabled, setEnabled] = useState(false);
  const [autoExtraction, setAutoExtraction] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    System.keys()
      .then((res) => {
        setEnabled(!!res?.MemoryEnabled);
        setAutoExtraction(res?.MemoryAutoExtraction !== false);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col gap-y-3">
      <div className="flex items-center gap-x-4">
        <div className="min-w-0 flex-1">
          <label className="block text-md font-medium text-theme-text-primary">
            {t("agent.settings.personalization.label")}
          </label>
          <p className="mt-1 text-xs text-theme-text-secondary">
            {t("agent.settings.personalization.description")}
          </p>
        </div>
        {loading ? (
          <Spinner className="shrink-0 text-theme-text-primary" />
        ) : (
          <>
            <input
              type="hidden"
              name="system::memory_enabled"
              value={String(enabled)}
            />
            <Toggle
              size="lg"
              enabled={enabled}
              onChange={(next) => {
                setEnabled(next);
                setHasChanges?.(true);
              }}
            />
          </>
        )}
      </div>
      {!loading && enabled && (
        <div className="flex items-center gap-x-4 rounded-lg bg-muted/20 p-3">
          <div className="min-w-0 flex-1">
            <label className="block text-md font-medium text-theme-text-primary">
              {t("agent.settings.personalization.auto_label")}
            </label>
            <p className="mt-1 text-xs text-theme-text-secondary">
              {t("agent.settings.personalization.auto_description")}
            </p>
          </div>
          <>
            <input
              type="hidden"
              name="system::memory_auto_extraction"
              value={String(autoExtraction)}
            />
            <Toggle
              size="lg"
              enabled={autoExtraction}
              onChange={(next) => {
                setAutoExtraction(next);
                setHasChanges?.(true);
              }}
            />
          </>
        </div>
      )}
    </div>
  );
}

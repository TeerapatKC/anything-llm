import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import System from "@/models/system";

export default function MaxToolCallStack({ setHasChanges }) {
  const { t } = useTranslation();
  const [maxCallStack, setMaxCallStack] = useState(10);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    System.keys()
      .then((res) => {
        setMaxCallStack(parseInt(res.AgentSkillMaxToolCalls));
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return (
    <div className="flex flex-col gap-y-2">
      <div className="flex items-center gap-x-4">
        <div className="flex flex-col gap-y-1 flex-1">
          <label className="block text-md font-medium text-theme-text-primary">
            {t("agent.settings.max-tool-calls.title")}
          </label>
          <p className="text-xs text-theme-text-secondary">
            {t("agent.settings.max-tool-calls.description")}
          </p>
        </div>
        <input
          type="number"
          name="env::AgentSkillMaxToolCalls"
          min={1}
          value={maxCallStack}
          disabled={loading}
          onChange={(e) => {
            if (e.target.value < 1) return;
            setMaxCallStack(parseInt(e.target.value));
            setHasChanges?.(true);
          }}
          onWheel={(e) => e.target.blur()}
          className="border border-theme-sidebar-border bg-theme-settings-input-bg text-theme-text-primary placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-[80px] p-2.5 text-center"
          placeholder="10"
          autoComplete="off"
        />
      </div>
    </div>
  );
}

import { SimpleToggleSwitch } from "@/components/lib/Toggle";
import { useTranslation } from "react-i18next";
import { useMemoriesContext } from "../MemoriesContext";

/**
 * The signed-in user's own personalization switches.
 *
 * These write to the user's account, not to the instance: whether the feature
 * exists at all is an admin policy set in Settings, and the sidebar is not
 * rendered when that policy is off. So everything shown here is safe for every
 * user to change, and nobody has to ask an admin to stop being remembered.
 */
export default function PersonalizationToggle() {
  const { enabled, autoExtraction, updatePreferences, loadingEnabled } =
    useMemoriesContext();
  const { t } = useTranslation();

  if (loadingEnabled) return null;

  return (
    <div className="shrink-0 bg-zinc-900 light:bg-white light:border light:border-slate-300 rounded-2xl p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-zinc-50 light:text-slate-900">
            {t("chat_window.memories.toggle.label")}
          </p>
          <p className="text-xs leading-4 text-zinc-400 light:text-slate-500">
            {t("chat_window.memories.toggle.description")}
          </p>
        </div>
        <SimpleToggleSwitch
          size="md"
          enabled={enabled}
          onChange={(checked) => updatePreferences({ memoryEnabled: checked })}
        />
      </div>
      {enabled && (
        <div className="flex items-start gap-3 pt-2 border-t border-zinc-800 light:border-slate-200">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-zinc-50 light:text-slate-900">
              {t("chat_window.memories.auto_extraction.label")}
            </p>
            <p className="text-xs leading-4 text-zinc-400 light:text-slate-500">
              {t("chat_window.memories.auto_extraction.description")}
            </p>
          </div>
          <SimpleToggleSwitch
            size="md"
            enabled={autoExtraction}
            onChange={(checked) =>
              updatePreferences({ memoryAutoExtraction: checked })
            }
          />
        </div>
      )}
      <p className="pt-1 text-[11px] leading-4 text-zinc-500 light:text-slate-400">
        {t("chat_window.memories.scope_hint")}
      </p>
    </div>
  );
}

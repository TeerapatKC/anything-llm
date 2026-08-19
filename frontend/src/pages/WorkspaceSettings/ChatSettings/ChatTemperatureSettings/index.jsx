import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
function recommendedSettings(provider = null) {
  switch (provider) {
    case "mistral":
      return { temp: 0 };
    default:
      return { temp: 0.7 };
  }
}

export default function ChatTemperatureSettings({
  settings,
  workspace,
  setHasChanges,
}) {
  const defaults = recommendedSettings(settings?.LLMProvider);
  const { t } = useTranslation();
  return (
    <div>
      <div className="flex flex-col gap-y-[8px]">
        <label htmlFor="name" className="block input-label">
          {t("chat.temperature.title")}
        </label>
        <p className="text-theme-text-primary text-opacity-60 text-xs font-medium">
          {t("chat.temperature.desc-end")}
        </p>
      </div>
      <Input
        variant="settings"
        name="openAiTemp"
        type="number"
        min={0.0}
        step={0.1}
        onWheel={(e) => e.target.blur()}
        defaultValue={workspace?.openAiTemp ?? defaults.temp}
        placeholder="0.7"
        required={true}
        autoComplete="off"
        onChange={() => setHasChanges(true)}
      />
    </div>
  );
}

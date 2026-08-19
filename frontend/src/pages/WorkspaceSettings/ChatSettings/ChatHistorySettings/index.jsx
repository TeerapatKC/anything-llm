import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
export default function ChatHistorySettings({ workspace, setHasChanges }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-y-[8px]">
      <div className="flex flex-col gap-y-[8px]">
        <label htmlFor="name" className="block input-label">
          {t("chat.history.title")}
        </label>
        <p className="text-theme-text-primary/60 text-xs font-medium">
          {t("chat.history.desc-start")}
          <i> {t("chat.history.recommend")} </i>
        </p>
      </div>
      <Input
        name="openAiHistory"
        type="number"
        min={1}
        step={1}
        onWheel={(e) => e.target.blur()}
        defaultValue={workspace?.openAiHistory ?? 20}
        placeholder="20"
        required={true}
        autoComplete="off"
        onChange={() => setHasChanges(true)}
      />
    </div>
  );
}

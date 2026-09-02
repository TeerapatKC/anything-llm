import { useTranslation } from "react-i18next";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
export default function GenericOpenAiWhisperOptions({ settings }) {
  const { t } = useTranslation();
  return (
    <div className="flex gap-x-7 gap-[36px] mt-1.5 flex-wrap">
      <div className="flex flex-col w-60">
        <Label className="block mb-3">{t("provider-options.base-url")}</Label>
        <Input
          type="url"
          name="WhisperGenericOpenAiBaseUrl"
          placeholder="http://localhost:8000/v1"
          defaultValue={settings?.WhisperGenericOpenAiBaseUrl}
          required={true}
          autoComplete="off"
          spellCheck={false}
        />
        <p className="text-xs/60 leading-[18px] font-base text-theme-text-primary mt-2">
          {t("help.generic-open-ai-options-5")}
        </p>
      </div>
      <div className="flex flex-col w-60">
        <Label className="block mb-3">{t("provider-options.api-key")}</Label>
        <Input
          type="password"
          name="WhisperGenericOpenAiApiKey"
          placeholder="API Key"
          defaultValue={
            settings?.WhisperGenericOpenAiApiKey ? "*".repeat(20) : ""
          }
          autoComplete="new-password"
          spellCheck={false}
        />
        <p className="text-xs/60 leading-[18px] font-base text-theme-text-primary mt-2">
          Optional - Only required if your service enforces authentication.
        </p>
      </div>
      <div className="flex flex-col w-60">
        <Label className="block mb-3">
          {t("provider-options.transcription-model")}
        </Label>
        <Input
          type="text"
          name="WhisperGenericOpenAiModel"
          placeholder="whisper-small"
          defaultValue={settings?.WhisperGenericOpenAiModel}
          required={true}
          autoComplete="off"
          spellCheck={false}
        />
        <p className="text-xs/60 leading-[18px] font-base text-theme-text-primary mt-2">
          The model identifier to be used for transcription.
        </p>
      </div>
    </div>
  );
}

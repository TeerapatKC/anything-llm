import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import System from "@/models/system";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function OpenAiSpeechToTextOptions({ settings }) {
  const { t } = useTranslation();
  const [inputValue, setInputValue] = useState(settings?.OpenAiKey);
  const [openAIKey, setOpenAIKey] = useState(settings?.OpenAiKey);

  return (
    <div className="flex gap-x-4">
      <div className="flex flex-col w-60">
        <Label className="block mb-3">{t("provider-options.api-key")}</Label>
        <Input
          type="password"
          name="OpenAiKey"
          placeholder="OpenAI API Key"
          defaultValue={settings?.OpenAiKey ? "*".repeat(20) : ""}
          required={true}
          autoComplete="new-password"
          spellCheck={false}
          onChange={(e) => setInputValue(e.target.value)}
          onBlur={() => setOpenAIKey(inputValue)}
        />
      </div>
      <OpenAiSttModelSelection settings={settings} apiKey={openAIKey} />
    </div>
  );
}

function OpenAiSttModelSelection({ apiKey, settings }) {
  const { t } = useTranslation();
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function findModels() {
      setLoading(true);
      const { models } = await System.customModels(
        "openai-stt",
        typeof apiKey === "boolean" ? null : apiKey
      );
      setModels(models || []);
      setLoading(false);
    }
    findModels();
  }, [apiKey]);

  if (loading) {
    return (
      <div className="flex flex-col w-60">
        <Label className="block mb-3">
          {t("provider-options.transcription-model")}
        </Label>
        <Select name="STTOpenAIModel" disabled={true}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder={t("provider-options.loading-models")} />
          </SelectTrigger>
          <SelectContent />
        </Select>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-60">
      <Label className="block mb-3">
        {t("provider-options.transcription-model")}
      </Label>
      <Select
        name="STTOpenAIModel"
        required={true}
        defaultValue={settings?.STTOpenAIModel ?? "whisper-1"}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder={t("provider-options.select-option")} />
        </SelectTrigger>
        <SelectContent>
          {models.map((model) => (
            <SelectItem key={model.id} value={model.id}>
              {model.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

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

export default function DeepgramSpeechToTextOptions({ settings }) {
  const { t } = useTranslation();
  const [inputValue, setInputValue] = useState(settings?.STTDeepgramApiKey);
  const [deepgramApiKey, setDeepgramApiKey] = useState(
    settings?.STTDeepgramApiKey
  );

  return (
    <div className="flex gap-x-4">
      <div className="flex flex-col w-60">
        <Label className="block mb-3">{t("provider-options.api-key")}</Label>
        <Input
          type="password"
          name="STTDeepgramApiKey"
          placeholder="Deepgram API Key"
          defaultValue={settings?.STTDeepgramApiKey ? "*".repeat(20) : ""}
          required={true}
          autoComplete="new-password"
          spellCheck={false}
          onChange={(e) => setInputValue(e.target.value)}
          onBlur={() => setDeepgramApiKey(inputValue)}
        />
      </div>
      <DeepgramSttModelSelection apiKey={deepgramApiKey} settings={settings} />
    </div>
  );
}

function DeepgramSttModelSelection({ apiKey, settings }) {
  const { t } = useTranslation();
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function findModels() {
      setLoading(true);
      const { models } = await System.customModels(
        "deepgram-stt",
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
        <Select name="STTDeepgramModel" disabled={true}>
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
        name="STTDeepgramModel"
        required={true}
        defaultValue={settings?.STTDeepgramModel ?? "nova-3"}
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

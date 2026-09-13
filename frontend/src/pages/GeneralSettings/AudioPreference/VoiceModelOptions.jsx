import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import System from "@/models/system";

export default function VoiceModelOptions({ value, onChange }) {
  const { t } = useTranslation();
  const [voices, setVoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    System.customModels("generic-openai-tts-voices")
      .then(({ models }) => {
        if (active) setVoices((models || []).filter((voice) => voice?.id));
      })
      .catch(() => {
        if (active) setVoices([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const savedVoiceMissing =
    !!value && !voices.some((voice) => voice.id === value);

  return (
    <div className="mt-6 max-w-4xl">
      <Label className="mb-2 block text-base font-semibold text-theme-text-primary">
        {t("provider-options.voice-model")}
      </Label>
      <Select
        value={savedVoiceMissing ? null : value || null}
        onValueChange={onChange}
        disabled={loading || voices.length === 0}
      >
        <SelectTrigger className="h-11 w-full max-w-md bg-theme-settings-input-bg text-theme-text-primary">
          <SelectValue
            placeholder={
              loading
                ? t("provider-options.loading-models")
                : t("provider-options.select-option")
            }
          />
        </SelectTrigger>
        <SelectContent>
          {voices.map((voice) => (
            <SelectItem key={voice.id} value={voice.id}>
              {voice.name || voice.id}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {!loading && voices.length === 0 && (
        <p className="mt-2 text-sm text-theme-text-secondary">
          {t("settings-page.audio.voices-unavailable")}
        </p>
      )}
      {!loading && savedVoiceMissing && (
        <p className="mt-2 text-sm text-theme-text-secondary">
          {t("settings-page.audio.saved-voice-unavailable", { voice: value })}
        </p>
      )}
    </div>
  );
}

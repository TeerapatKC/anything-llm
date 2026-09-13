import { useState } from "react";
import { useTranslation } from "react-i18next";
import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import System from "@/models/system";
import showToast from "@/utils/toast";
import ProviderCard from "./ProviderCard";
import VoiceModelOptions from "./VoiceModelOptions";

const VOICE_KEY = "TTSOpenAICompatibleVoiceModel";
export default function TextToSpeechProvider({ settings }) {
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);
  const [savedVoice, setSavedVoice] = useState(settings?.[VOICE_KEY] || "");
  const [voice, setVoice] = useState(savedVoice);
  const providerId = settings?.TextToSpeechProvider || "generic-openai";
  const supported = providerId === "generic-openai";
  const hasChanges = supported && voice !== savedVoice;

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!hasChanges || saving || !voice.trim()) return;

    setSaving(true);
    const { error, refused, newValues } = await System.updateSystem({
      [VOICE_KEY]: voice.trim(),
    });
    setSaving(false);

    if (error || refused?.length || !newValues?.[VOICE_KEY]) {
      showToast(
        `Failed to save voice model: ${error || "Permission denied."}`,
        "error"
      );
      return;
    }
    showToast("Voice model saved successfully.", "success");
    setSavedVoice(voice.trim());
    setVoice(voice.trim());
  };

  return (
    <form onSubmit={handleSubmit} className="flex w-full">
      <div className="flex w-full flex-col px-1 pb-6 pt-8 md:px-6">
        <PageHeader
          title={t("settings-page.audio.tts-title")}
          description={t("settings-page.audio.tts-description")}
        />
        <ProviderCard
          icon="speaker"
          description={t("settings-page.audio.tts-model-description")}
          modelName={
            supported ? settings?.TTSOpenAICompatibleModel || "tts-1" : null
          }
        />
        {supported && <VoiceModelOptions value={voice} onChange={setVoice} />}
        {hasChanges && (
          <div className="mt-6 flex max-w-4xl justify-end">
            <Button size="lg" type="submit" disabled={saving || !voice.trim()}>
              {saving
                ? t("settings-page.audio.saving")
                : t("settings-page.audio.save-changes")}
            </Button>
          </div>
        )}
      </div>
    </form>
  );
}

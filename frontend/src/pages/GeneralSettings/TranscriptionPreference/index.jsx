import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import SettingsLayout from "@/components/layout/SettingsLayout";
import PageHeader from "@/components/layout/PageHeader";
import { SpinnerBlock } from "@/components/ui/spinner";
import System from "@/models/system";
import ProviderCard from "../AudioPreference/ProviderCard";

const BUILT_IN_MODEL = "Xenova/whisper-large";

export default function TranscriptionModelPreference() {
  const { t } = useTranslation();
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    System.keys().then((current) => setSettings(current ?? {}));
  }, []);

  const provider = settings?.WhisperProvider || "local";
  const modelName =
    provider === "local"
      ? settings?.WhisperModelPref || BUILT_IN_MODEL
      : settings?.WhisperGenericOpenAiModel;
  const ready =
    (provider === "local" || provider === "generic-openai") && !!modelName;

  return (
    <SettingsLayout>
      {!settings ? (
        <SpinnerBlock className="min-h-[60vh]" />
      ) : (
        <div className="flex w-full flex-col">
          <PageHeader
            title={t("transcription.title")}
            description={t("transcription.description")}
          />
          {ready ? (
            <ProviderCard
              icon="wave"
              modelName={modelName}
              description={t("transcription.model-description")}
            />
          ) : (
            <p className="mt-6 text-sm text-theme-text-secondary">
              {t("transcription.invalid")}
            </p>
          )}
        </div>
      )}
    </SettingsLayout>
  );
}

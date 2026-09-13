import { useTranslation } from "react-i18next";
import PageHeader from "@/components/layout/PageHeader";
import ProviderCard from "./ProviderCard";

export default function SpeechToTextProvider({ settings }) {
  const { t } = useTranslation();
  const providerId = settings?.SpeechToTextProvider || "generic-openai";

  return (
    <section className="flex w-full flex-col px-1 pb-8 pt-16 md:px-6 md:pt-6">
      <PageHeader
        title={t("settings-page.audio.stt-title")}
        description={t("settings-page.audio.stt-description")}
      />
      <ProviderCard
        icon="wave"
        description={t("settings-page.audio.stt-model-description")}
        modelName={
          providerId === "generic-openai"
            ? settings?.STTOpenAICompatibleModel || "whisper-1"
            : null
        }
      />
    </section>
  );
}

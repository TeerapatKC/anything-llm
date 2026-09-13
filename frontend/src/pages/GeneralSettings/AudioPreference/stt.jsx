import { useTranslation } from "react-i18next";
import PageHeader from "@/components/layout/PageHeader";
import GenericOpenAiLogo from "@/media/llmprovider/generic-openai.png";
import ProviderCard from "./ProviderCard";

const OPENAI_COMPATIBLE = {
  name: "OpenAI Compatible",
  value: "generic-openai",
  logo: GenericOpenAiLogo,
};

export default function SpeechToTextProvider({ settings }) {
  const { t } = useTranslation();
  const providerId = settings?.SpeechToTextProvider || "generic-openai";
  const provider =
    providerId === "generic-openai"
      ? OPENAI_COMPATIBLE
      : { name: providerId, value: providerId };

  return (
    <section className="flex w-full flex-col px-1 py-16 md:px-6 md:py-6">
      <PageHeader
        title={t("settings-page.audio.stt-title")}
        description={t("settings-page.audio.stt-description")}
      />
      <ProviderCard
        provider={provider}
        modelName={
          providerId === "generic-openai"
            ? settings?.STTOpenAICompatibleModel || "whisper-1"
            : null
        }
        envKey="STT_PROVIDER"
      />
    </section>
  );
}

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Gauge } from "lucide-react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function NativeTranscriptionOptions({ settings }) {
  const { t } = useTranslation();
  const [model, setModel] = useState(settings?.WhisperModelPref);

  return (
    <div className="w-full flex flex-col gap-y-4">
      <LocalWarning model={model} />
      <div className="w-full flex items-center gap-4">
        <div className="flex flex-col w-60">
          <Label className="block mb-3">{t("common.selection")}</Label>
          <Select
            name="WhisperModelPref"
            defaultValue={model}
            onValueChange={setModel}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t("provider-options.select-option")} />
            </SelectTrigger>
            <SelectContent>
              {["Xenova/whisper-small", "Xenova/whisper-large"].map(
                (value, i) => {
                  return (
                    <SelectItem key={i} value={value}>
                      {value}
                    </SelectItem>
                  );
                }
              )}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

function LocalWarning({ model }) {
  switch (model) {
    case "Xenova/whisper-small":
      return <WhisperSmall />;
    case "Xenova/whisper-large":
      return <WhisperLarge />;
    default:
      return <WhisperSmall />;
  }
}

function WhisperSmall() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col md:flex-row md:items-center gap-x-2 text-theme-text-primary mb-4 bg-blue-800/30 w-fit rounded-lg px-4 py-2">
      <div className="gap-x-2 flex items-center">
        <Gauge size={25} />
        <p className="text-sm">
          {t("transcription.warn-start")}
          <br />
          {t("transcription.warn-recommend")}
          <br />
          <br />
          <i>{t("transcription.warn-end")} (250mb)</i>
        </p>
      </div>
    </div>
  );
}

function WhisperLarge() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col md:flex-row md:items-center gap-x-2 text-theme-text-primary mb-4 bg-blue-800/30 w-fit rounded-lg px-4 py-2">
      <div className="gap-x-2 flex items-center">
        <Gauge size={25} />
        <p className="text-sm">
          {t("transcription.warn-start")}
          <br />
          {t("transcription.warn-recommend")}
          <br />
          <br />
          <i>{t("transcription.warn-end")} (1.56GB)</i>
        </p>
      </div>
    </div>
  );
}

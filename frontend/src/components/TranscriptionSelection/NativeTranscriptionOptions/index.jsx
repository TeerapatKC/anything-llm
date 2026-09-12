import { useTranslation } from "react-i18next";
import { Gauge } from "lucide-react";
import { Label } from "@/components/ui/label";

const BUILT_IN_MODEL = "Xenova/whisper-large";

export default function NativeTranscriptionOptions() {
  const { t } = useTranslation();

  return (
    <div className="flex w-full flex-col gap-y-4">
      <div className="mb-4 w-fit rounded-lg bg-blue-800/30 px-4 py-2 text-theme-text-primary">
        <div className="flex items-center gap-x-2">
          <Gauge size={25} />
          <p className="text-sm">
            {t("transcription.warn-start")}
            <br />
            {t("transcription.warn-recommend")}
            <br />
            <br />
            <i>{t("transcription.warn-prebuilt")} (1.56GB)</i>
          </p>
        </div>
      </div>
      <input type="hidden" name="WhisperModelPref" value={BUILT_IN_MODEL} />
      <div className="flex flex-col gap-2">
        <Label>{t("common.selection")}</Label>
        <div className="w-fit rounded-lg border border-theme-modal-border px-3 py-2 text-theme-text-primary">
          {BUILT_IN_MODEL}
        </div>
      </div>
    </div>
  );
}

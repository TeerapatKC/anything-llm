import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ImageIcon } from "lucide-react";
import SettingsLayout from "@/components/layout/SettingsLayout";
import PageHeader from "@/components/layout/PageHeader";
import { SpinnerBlock } from "@/components/ui/spinner";
import System from "@/models/system";

export default function ImageGenerationPreference() {
  const { t } = useTranslation();
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    System.keys().then((current) => setSettings(current ?? {}));
  }, []);

  const ready =
    settings?.ImageGenerationProvider === "localai" &&
    !!settings?.ImageGenerationModelPref;

  return (
    <SettingsLayout>
      {!settings ? (
        <SpinnerBlock className="min-h-[60vh]" />
      ) : (
        <div className="flex w-full flex-col">
          <PageHeader
            title={t("imageGeneration.title")}
            description={t("imageGeneration.description")}
          />
          <div className="mt-6 max-w-4xl">
            <h2 className="text-base font-semibold text-theme-text-primary">
              {t("imageGeneration.model-title")}
            </h2>
            <p className="mt-1 text-sm text-theme-text-secondary">
              {t("imageGeneration.model-help")}
            </p>
            {ready ? (
              <div className="mt-5 rounded-xl border border-theme-modal-border bg-theme-bg-secondary p-4 sm:p-5">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-theme-modal-border bg-theme-settings-input-bg text-primary-button">
                    <ImageIcon size={26} strokeWidth={1.8} aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="break-all font-semibold text-theme-text-primary">
                      {settings.ImageGenerationModelPref}
                    </p>
                    <p className="mt-0.5 text-sm text-theme-text-secondary">
                      {t("imageGeneration.model-description")}
                    </p>
                  </div>
                  <span className="rounded-full border border-primary-button px-2.5 py-1 text-xs font-semibold text-primary-button">
                    {t("imageGeneration.active")}
                  </span>
                </div>
              </div>
            ) : (
              <p className="mt-5 text-sm text-theme-text-secondary">
                {t("imageGeneration.invalid")}
              </p>
            )}
          </div>
        </div>
      )}
    </SettingsLayout>
  );
}

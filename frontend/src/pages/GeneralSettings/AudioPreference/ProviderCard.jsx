import { AudioLines } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function ProviderCard({ provider, modelName, envKey }) {
  const { t } = useTranslation();

  return (
    <div className="mt-6 max-w-4xl">
      <h2 className="text-base font-semibold text-theme-text-primary">
        {t("settings-page.audio.model")}
      </h2>
      <p className="mt-1 text-sm text-theme-text-secondary">
        {t("settings-page.audio.model-description")}
      </p>
      <div className="mt-5 rounded-xl border border-theme-modal-border bg-theme-bg-secondary p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-white p-1.5">
            {provider.logo ? (
              <img
                src={provider.logo}
                alt=""
                className="size-full object-contain"
              />
            ) : (
              <AudioLines size={27} className="text-theme-text-secondary" />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className="break-all font-semibold text-theme-text-primary">
              {modelName || t("settings-page.audio.model-unavailable")}
            </p>
            <p className="mt-0.5 text-sm text-theme-text-secondary">
              {t("settings-page.audio.provider")}: {provider.name}
            </p>
          </div>
          <span className="rounded-full border border-primary-button px-2.5 py-1 text-xs font-semibold text-primary-button">
            {t("settings-page.audio.active")}
          </span>
        </div>
        <p className="mt-5 border-t border-theme-modal-border pt-4 text-sm text-theme-text-secondary">
          {t("settings-page.audio.managed-by-env", { envKey })}
        </p>
      </div>
    </div>
  );
}

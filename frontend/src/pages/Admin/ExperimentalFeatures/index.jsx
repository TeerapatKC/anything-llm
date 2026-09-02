import { useEffect, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { SplitLayout } from "@/components/layout/SettingsLayout";
import Admin from "@/models/admin";
import { FullScreenLoader } from "@/components/Preloader";
import { ChevronRight, FlaskConical } from "lucide-react";
import { configurableFeatures } from "./features";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import paths from "@/utils/paths";
import showToast from "@/utils/toast";

export default function ExperimentalFeatures() {
  const { t } = useTranslation();
  const [featureFlags, setFeatureFlags] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedFeature, setSelectedFeature] = useState(
    "experimental_live_file_sync"
  );

  useEffect(() => {
    async function fetchSettings() {
      setLoading(true);
      const { settings } = await Admin.systemPreferencesByFields([
        "feature_flags",
      ]);
      setFeatureFlags(settings?.feature_flags ?? {});
      setLoading(false);
    }
    fetchSettings();
  }, []);

  const refresh = async () => {
    const { settings } = await Admin.systemPreferencesByFields([
      "feature_flags",
    ]);
    setFeatureFlags(settings?.feature_flags ?? {});
  };

  if (loading) {
    return (
      <div
        style={{ height: "100%" }}
        className="relative w-full h-full flex justify-center items-center"
      >
        <FullScreenLoader />
      </div>
    );
  }

  return (
    <FeatureLayout>
      <div className="flex-1 flex gap-x-6 p-4 mt-10">
        {/* Feature settings nav */}
        <div className="flex flex-col gap-y-[18px]">
          <div className="text-theme-text-primary flex items-center gap-x-2">
            <FlaskConical size={24} />
            <p className="text-lg font-medium">
              {t("experimental-features.title")}
            </p>
          </div>
          {/* Feature list */}
          <div className="bg-theme-bg-secondary text-theme-text-primary rounded-xl min-w-[360px] w-fit">
            {Object.values(configurableFeatures).map((feature, index) => {
              const isFirst = index === 0;
              const isLast =
                index === Object.values(configurableFeatures).length - 1;
              return (
                <FeatureItem
                  key={feature.key}
                  feature={feature}
                  isSelected={selectedFeature === feature.key}
                  isActive={featureFlags[feature.key]}
                  handleClick={setSelectedFeature}
                  borderClass={[
                    ...(isFirst ? ["rounded-t-xl"] : []),
                    ...(isLast
                      ? ["rounded-b-xl"]
                      : ["border-b border-theme-sidebar-border"]),
                  ].join(" ")}
                />
              );
            })}
          </div>
        </div>

        {/* Selected feature setting panel */}
        <FeatureVerification>
          <div className="flex-2 flex flex-col gap-y-[18px] mt-10">
            <div className="bg-theme-bg-secondary text-theme-text-primary rounded-xl flex-1 p-4">
              {selectedFeature ? (
                <SelectedFeatureComponent
                  feature={configurableFeatures[selectedFeature]}
                  settings={featureFlags}
                  refresh={refresh}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-theme-text-secondary">
                  <FlaskConical size={40} />
                  <p className="font-medium">
                    {t("experimental-features.select-feature")}
                  </p>
                </div>
              )}
            </div>
          </div>
        </FeatureVerification>
      </div>
    </FeatureLayout>
  );
}

function FeatureLayout({ children }) {
  return (
    <SplitLayout id="workspace-feature-settings-container">
      {children}
    </SplitLayout>
  );
}

function FeatureItem({
  feature = {},
  isSelected = false,
  isActive = false,
  handleClick = () => {},
  borderClass = "border-b border-theme-sidebar-border",
}) {
  const { t } = useTranslation();
  return (
    <div
      key={feature.key}
      className={`py-3 px-4 flex items-center justify-between cursor-pointer transition-all duration-300 hover:bg-white/5 ${borderClass} ${
        isSelected ? "bg-white/10 light:bg-theme-bg-sidebar" : ""
      }`}
      onClick={() => {
        if (feature?.href) window.location = feature.href;
        else handleClick?.(feature.key);
      }}
    >
      <div className="text-sm font-light">{feature.title}</div>
      <div className="flex items-center gap-x-2">
        {feature.autoEnabled ? (
          <>
            <div className="text-sm text-theme-text-secondary font-medium">
              {t("experimental-features.on")}
            </div>
            <div className="w-[14px]" />
          </>
        ) : (
          <>
            <div className="text-sm text-theme-text-secondary font-medium">
              {isActive
                ? t("experimental-features.on")
                : t("experimental-features.off")}
            </div>
            <ChevronRight size={14} className="text-theme-text-secondary" />
          </>
        )}
      </div>
    </div>
  );
}

function SelectedFeatureComponent({ feature, settings, refresh }) {
  const Component = feature?.component;
  return Component ? (
    <Component
      enabled={settings[feature.key]}
      feature={feature.key}
      onToggle={refresh}
    />
  ) : null;
}

function FeatureVerification({ children }) {
  const { t } = useTranslation();
  if (
    !window.localStorage.getItem("anythingllm_tos_experimental_feature_set")
  ) {
    function acceptTos(e) {
      e.preventDefault();

      window.localStorage.setItem(
        "anythingllm_tos_experimental_feature_set",
        "accepted"
      );
      showToast(
        "Experimental Feature set enabled. Reloading the page.",
        "success"
      );
      setTimeout(() => {
        window.location.reload();
      }, 2_500);
      return;
    }

    return (
      <>
        <Dialog open={true}>
          <DialogContent showCloseButton={false}>
            <DialogHeader>
              <div className="flex items-center gap-2">
                <FlaskConical size={18} className="text-theme-text-primary" />
                <DialogTitle className="text-sm font-semibold">
                  {t("experimental-features.tos.title")}
                </DialogTitle>
              </div>
            </DialogHeader>
            <form onSubmit={acceptTos}>
              <div className="space-y-4 flex-col">
                <div className="w-full text-theme-text-primary text-md flex flex-col gap-y-4">
                  <p>
                    <Trans
                      i18nKey="experimental-features.tos.intro"
                      components={{ b: <b /> }}
                    />
                  </p>

                  <div>
                    <p>{t("experimental-features.tos.risks-intro")}</p>
                    <ul className="list-disc ml-6 text-sm font-mono mt-2">
                      <li>{t("experimental-features.tos.risk-data-loss")}</li>
                      <li>{t("experimental-features.tos.risk-quality")}</li>
                      <li>{t("experimental-features.tos.risk-storage")}</li>
                      <li>{t("experimental-features.tos.risk-resources")}</li>
                      <li>{t("experimental-features.tos.risk-cost")}</li>
                      <li>{t("experimental-features.tos.risk-bugs")}</li>
                    </ul>
                  </div>

                  <div>
                    <p>{t("experimental-features.tos.conditions-intro")}</p>
                    <ul className="list-disc ml-6 text-sm font-mono mt-2">
                      <li>
                        {t("experimental-features.tos.condition-removal")}
                      </li>
                      <li>
                        {t("experimental-features.tos.condition-stability")}
                      </li>
                      <li>
                        {t("experimental-features.tos.condition-availability")}
                      </li>
                      <li>
                        <Trans
                          i18nKey="experimental-features.tos.condition-privacy"
                          components={{ b: <b /> }}
                        />
                      </li>
                      <li>{t("experimental-features.tos.condition-change")}</li>
                    </ul>
                  </div>

                  <p>
                    {t("experimental-features.tos.docs-prefix")}{" "}
                    <a
                      href="https://docs.anythingllm.com/beta-preview/overview"
                      className="underline text-blue-500"
                    >
                      docs.anythingllm.com
                    </a>{" "}
                    {t("experimental-features.tos.docs-or-email")}{" "}
                    <a
                      href="mailto:team@mintplexlabs.com"
                      className="underline text-blue-500"
                    >
                      team@mintplexlabs.com
                    </a>
                  </p>
                </div>
              </div>
              <div className="flex w-full justify-between items-center mt-6 space-x-2">
                <Button
                  variant="outline"
                  type="button"
                  render={<a href={paths.home()} />}
                >
                  {t("experimental-features.tos.reject")}
                </Button>
                <Button variant="default" type="submit">
                  {t("experimental-features.tos.accept")}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        {children}
      </>
    );
  }
  return <>{children}</>;
}

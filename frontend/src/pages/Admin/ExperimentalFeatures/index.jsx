import { useEffect, useState } from "react";
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
            <p className="text-lg font-medium">Experimental Features</p>
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
          <div className="flex-[2] flex flex-col gap-y-[18px] mt-10">
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
                  <p className="font-medium">Select an experimental feature</p>
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
              On
            </div>
            <div className="w-[14px]" />
          </>
        ) : (
          <>
            <div className="text-sm text-theme-text-secondary font-medium">
              {isActive ? "On" : "Off"}
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
          <DialogContent
            className="max-w-2xl bg-theme-bg-secondary border-theme-modal-border [&>button]:hidden"
            onEscapeKeyDown={(e) => e.preventDefault()}
            onPointerDownOutside={(e) => e.preventDefault()}
            onInteractOutside={(e) => e.preventDefault()}
          >
            <DialogHeader className="p-0">
              <div className="flex items-center gap-2">
                <FlaskConical size={18} className="text-theme-text-primary" />
                <DialogTitle className="text-sm font-semibold">
                  Terms of use for experimental features
                </DialogTitle>
              </div>
            </DialogHeader>
            <form onSubmit={acceptTos}>
              <div className="space-y-4 flex-col">
                <div className="w-full text-theme-text-primary text-md flex flex-col gap-y-4">
                  <p>
                    Experimental features of AnythingLLM are features that we
                    are piloting and are <b>opt-in</b>. We proactively will
                    condition or warn you on any potential concerns should any
                    exist prior to approval of any feature.
                  </p>

                  <div>
                    <p>
                      Use of any feature on this page can result in, but not
                      limited to, the following possibilities.
                    </p>
                    <ul className="list-disc ml-6 text-sm font-mono mt-2">
                      <li>Loss of data.</li>
                      <li>Change in quality of results.</li>
                      <li>Increased storage.</li>
                      <li>Increased resource consumption.</li>
                      <li>
                        Increased cost or use of any connected LLM or embedding
                        provider.
                      </li>
                      <li>Potential bugs or issues using AnythingLLM.</li>
                    </ul>
                  </div>

                  <div>
                    <p>
                      Use of an experimental feature also comes with the
                      following list of non-exhaustive conditions.
                    </p>
                    <ul className="list-disc ml-6 text-sm font-mono mt-2">
                      <li>Feature may not exist in future updates.</li>
                      <li>The feature being used is not currently stable.</li>
                      <li>
                        The feature may not be available in future versions,
                        configurations, or subscriptions of AnythingLLM.
                      </li>
                      <li>
                        Your privacy settings <b>will be honored</b> with use of
                        any beta feature.
                      </li>
                      <li>These conditions may change in future updates.</li>
                    </ul>
                  </div>

                  <p>
                    Access to any features requires approval of this modal. If
                    you would like to read more you can refer to{" "}
                    <a
                      href="https://docs.anythingllm.com/beta-preview/overview"
                      className="underline text-blue-500"
                    >
                      docs.anythingllm.com
                    </a>{" "}
                    or email{" "}
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
                <Button variant="outline" type="button" asChild>
                  <a href={paths.home()}>Reject &amp; close</a>
                </Button>
                <Button variant="default" type="submit">
                  I understand
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

import { useEffect, useState } from "react";
import SettingsLayout from "@/components/layout/SettingsLayout";
import PageHeader from "@/components/layout/PageHeader";
import showToast from "@/utils/toast";
import System from "@/models/system";
import PreLoader from "@/components/Preloader";
import { useTranslation } from "react-i18next";
import ProviderPrivacy from "@/components/ProviderPrivacy";
import Toggle from "@/components/lib/Toggle";
import Admin from "@/models/admin";
import { Separator } from "@/components/ui/separator";

export default function PrivacyAndDataHandling() {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation();
  useEffect(() => {
    async function fetchSettings() {
      setLoading(true);
      const settings = await System.keys();
      setSettings(settings);
      setLoading(false);
    }
    fetchSettings();
  }, []);

  return (
    <SettingsLayout>
      <PageHeader
        title={t("privacy.title")}
        description={t("privacy.description")}
      />
      {loading ? (
        <div className="h-1/2 transition-all duration-500 relative md:ml-[2px] md:mr-[8px] md:my-[16px] md:rounded-[26px] p-[18px] h-full overflow-y-scroll">
          <div className="w-full h-full flex justify-center items-center">
            <PreLoader />
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto flex flex-col gap-y-6 pt-6">
          <ProviderPrivacy />
          <Separator />
          <Personalization settings={settings} />
          <Separator />
          <TelemetryLogs settings={settings} />
        </div>
      )}
    </SettingsLayout>
  );
}

/**
 * The instance-wide personalization policy.
 *
 * This lives here rather than in the chat sidebar because it is a deployment
 * decision - it governs LLM spend and what the product may retain about people
 * - and only an admin can make it. Each user then opts themselves in or out
 * underneath it, from the Memories panel in chat.
 */
function Personalization({ settings }) {
  const [enabled, setEnabled] = useState(!!settings?.MemoryEnabled);
  const [autoExtraction, setAutoExtraction] = useState(
    settings?.MemoryAutoExtraction !== false
  );
  const { t } = useTranslation();

  async function persist(updates, apply) {
    const { success, error } = await Admin.updateSystemPreferences(updates);
    if (!success) return showToast(error || "Failed to save.", "error");
    apply();
  }

  return (
    <div className="relative w-full max-h-full">
      <div className="flex w-full flex-col gap-y-4">
        <Toggle
          size="lg"
          label={t("privacy.personalization.label")}
          enabled={enabled}
          onChange={() =>
            persist({ memory_enabled: enabled ? "false" : "true" }, () =>
              setEnabled(!enabled)
            )
          }
        />
        {enabled && (
          <Toggle
            size="lg"
            label={t("privacy.personalization.auto_label")}
            enabled={autoExtraction}
            onChange={() =>
              persist(
                { memory_auto_extraction: autoExtraction ? "false" : "true" },
                () => setAutoExtraction(!autoExtraction)
              )
            }
          />
        )}
        <p className="w-96 text-xs text-theme-text-secondary">
          {t("privacy.personalization.description")}
        </p>
      </div>
    </div>
  );
}

function TelemetryLogs({ settings }) {
  const [telemetry, setTelemetry] = useState(
    settings?.DisableTelemetry !== "true"
  );
  const { t } = useTranslation();
  async function toggleTelemetry() {
    await System.updateSystem({
      DisableTelemetry: !telemetry ? "false" : "true",
    });
    setTelemetry(!telemetry);
    showToast(
      `Anonymous Telemetry has been ${!telemetry ? "enabled" : "disabled"}.`,
      "info",
      { clear: true }
    );
  }

  return (
    <div className="relative w-full max-h-full">
      <div className="relative rounded-lg">
        <div className="space-y-6 flex h-full w-full">
          <div className="w-full flex flex-col gap-y-4">
            <div className="">
              <Toggle
                size="lg"
                className="mb-4"
                label={t("privacy.anonymous")}
                enabled={telemetry}
                onChange={toggleTelemetry}
              />
            </div>
          </div>
        </div>
        <div className="flex flex-col items-left space-y-2">
          <p className="text-theme-text-secondary text-xs rounded-lg w-96">
            All events do not record IP-address and contain{" "}
            <b>no identifying</b> content, settings, chats, or other non-usage
            based information. To see the list of event tags collected you can
            look on{" "}
            <a
              href="https://github.com/search?q=repo%3AMintplex-Labs%2Fanything-llm%20.sendTelemetry(&type=code"
              className="underline text-blue-400"
              target="_blank"
              rel="noreferrer"
            >
              GitHub here
            </a>
            .
          </p>
          <p className="text-theme-text-secondary text-xs rounded-lg w-96">
            As an open-source project we respect your right to privacy. We are
            dedicated to building the best solution for integrating AI and
            documents privately and securely. If you do decide to turn off
            telemetry all we ask is to consider sending us feedback and thoughts
            so that we can continue to improve NexusAI for you.{" "}
            <a
              href="mailto:team@mintplexlabs.com"
              className="underline text-blue-400"
              target="_blank"
              rel="noreferrer"
            >
              team@mintplexlabs.com
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}

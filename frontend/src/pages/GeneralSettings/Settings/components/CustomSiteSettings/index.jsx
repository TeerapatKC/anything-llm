import { useEffect, useState } from "react";
import Admin from "@/models/admin";
import showToast from "@/utils/toast";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function CustomSiteSettings() {
  const { t } = useTranslation();
  const [hasChanges, setHasChanges] = useState(false);
  const [settings, setSettings] = useState({
    title: null,
    faviconUrl: null,
  });

  useEffect(() => {
    Admin.systemPreferencesByFields([
      "meta_page_title",
      "meta_page_favicon",
    ]).then(({ settings }) => {
      setSettings({
        title: settings?.meta_page_title,
        faviconUrl: settings?.meta_page_favicon,
      });
    });
  }, []);

  async function handleSiteSettingUpdate(e) {
    e.preventDefault();
    await Admin.updateSystemPreferences({
      meta_page_title: settings.title ?? null,
      meta_page_favicon: settings.faviconUrl ?? null,
    });
    showToast(
      "Site preferences updated! They will reflect on page reload.",
      "success",
      { clear: true }
    );
    setHasChanges(false);
    return;
  }

  return (
    <form
      className="flex flex-col gap-y-2 my-4 border-t border-theme-sidebar-border pt-6"
      onSubmit={handleSiteSettingUpdate}
    >
      <div>
        <p className="text-sm leading-6 font-semibold text-theme-text-primary">
          {t("customization.items.browser-appearance.title")}
        </p>
        <p className="text-xs text-theme-text-secondary">
          {t("customization.items.browser-appearance.description")}
        </p>
      </div>

      <div className="w-full max-w-lg mt-2">
        <p className="text-sm leading-6 font-medium text-theme-text-primary">
          {t("customization.items.browser-appearance.tab.title")}
        </p>
        <p className="text-xs text-theme-text-secondary mb-1">
          {t("customization.items.browser-appearance.tab.description")}
        </p>
        <Input
          name="meta_page_title"
          type="text"
          placeholder="NexusAI | Your personal LLM trained on anything"
          autoComplete="off"
          onChange={(e) => {
            setHasChanges(true);
            setSettings((prev) => ({ ...prev, title: e.target.value }));
          }}
          value={
            settings.title ?? "NexusAI | Your personal LLM trained on anything"
          }
        />
      </div>

      <div className="w-full max-w-lg mt-2">
        <p className="text-sm leading-6 font-medium text-theme-text-primary">
          {t("customization.items.browser-appearance.favicon.title")}
        </p>
        <p className="text-xs text-theme-text-secondary mb-1">
          {t("customization.items.browser-appearance.favicon.description")}
        </p>
        <div className="flex items-center gap-x-2">
          <img
            src={settings.faviconUrl ?? "/favicon.png"}
            onError={(e) => (e.target.src = "/favicon.png")}
            className="h-8 w-8 rounded-lg border border-theme-sidebar-border object-contain shrink-0"
            alt="Site favicon"
          />
          <Input
            name="meta_page_favicon"
            type="url"
            placeholder="https://example.com/favicon.png"
            onChange={(e) => {
              setHasChanges(true);
              setSettings((prev) => ({ ...prev, faviconUrl: e.target.value }));
            }}
            autoComplete="off"
            value={settings.faviconUrl ?? ""}
          />
        </div>
      </div>

      {hasChanges && (
        <Button
          type="submit"
          variant="default"
          size="sm"
          className="mt-2 w-fit"
        >
          Save
        </Button>
      )}
    </form>
  );
}

import Admin from "@/models/admin";
import System, { CUSTOM_APP_NAME_UPDATED_EVENT } from "@/models/system";
import showToast from "@/utils/toast";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function CustomAppName() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);
  const [customAppName, setCustomAppName] = useState("");
  const [originalAppName, setOriginalAppName] = useState("");
  const [canCustomize, setCanCustomize] = useState(false);

  useEffect(() => {
    const fetchInitialParams = async () => {
      const { appName } = await System.fetchCustomAppName();
      setCustomAppName(appName || "");
      setOriginalAppName(appName || "");
      setCanCustomize(true);
      setLoading(false);
    };
    fetchInitialParams();
  }, []);

  const updateCustomAppName = async (e, newValue = null) => {
    e.preventDefault();
    let custom_app_name = newValue;
    if (newValue === null) {
      const form = new FormData(e.target);
      custom_app_name = form.get("customAppName");
    }
    custom_app_name = custom_app_name?.trim() ?? "";
    const { success, error } = await Admin.updateSystemPreferences({
      custom_app_name,
    });
    if (!success) {
      showToast(`Failed to update custom app name: ${error}`, "error");
      return;
    } else {
      showToast("Successfully updated custom app name.", "success");
      window.localStorage.removeItem(System.cacheKeys.customAppName);
      window.dispatchEvent(
        new CustomEvent(CUSTOM_APP_NAME_UPDATED_EVENT, {
          detail: { appName: custom_app_name },
        })
      );
      setCustomAppName(custom_app_name);
      setOriginalAppName(custom_app_name);
      setHasChanges(false);
    }
  };

  const handleChange = (e) => {
    setCustomAppName(e.target.value);
    setHasChanges(true);
  };

  if (!canCustomize || loading) return null;

  return (
    <form
      className="flex flex-col gap-y-1.5 mt-4"
      onSubmit={updateCustomAppName}
    >
      <div>
        <p className="text-sm leading-6 font-semibold text-theme-text-primary">
          {t("customization.items.app-name.title")}
        </p>
        <p className="text-xs text-theme-text-secondary">
          {t("customization.items.app-name.description")}
        </p>
      </div>
      <div className="flex items-center gap-x-3 mt-1">
        <Input
          name="customAppName"
          type="text"
          className="max-w-xs"
          placeholder="NexusAI"
          required={true}
          autoComplete="off"
          onChange={handleChange}
          value={customAppName}
        />
        {originalAppName !== "" && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={(e) => updateCustomAppName(e, "")}
          >
            Clear
          </Button>
        )}
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

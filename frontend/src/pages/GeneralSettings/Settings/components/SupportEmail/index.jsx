import useUser from "@/hooks/useUser";
import Admin from "@/models/admin";
import System from "@/models/system";
import showToast from "@/utils/toast";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function SupportEmail() {
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);
  const [supportEmail, setSupportEmail] = useState("");
  const [originalEmail, setOriginalEmail] = useState("");
  const { t } = useTranslation();

  useEffect(() => {
    const fetchSupportEmail = async () => {
      const supportEmail = await System.fetchSupportEmail();
      setSupportEmail(supportEmail.email || "");
      setOriginalEmail(supportEmail.email || "");
      setLoading(false);
    };
    fetchSupportEmail();
  }, []);

  const updateSupportEmail = async (e, newValue = null) => {
    e.preventDefault();
    let support_email = newValue;
    if (newValue === null) {
      const form = new FormData(e.target);
      support_email = form.get("supportEmail");
    }

    const { success, error } = await Admin.updateSystemPreferences({
      support_email,
    });

    if (!success) {
      showToast(`Failed to update support email: ${error}`, "error");
      return;
    } else {
      showToast("Successfully updated support email.", "success");
      window.localStorage.removeItem(System.cacheKeys.supportEmail);
      setSupportEmail(support_email);
      setOriginalEmail(support_email);
      setHasChanges(false);
    }
  };

  const handleChange = (e) => {
    setSupportEmail(e.target.value);
    setHasChanges(true);
  };

  if (loading || !user) return null;
  return (
    <form
      className="flex flex-col gap-y-1.5 mt-4"
      onSubmit={updateSupportEmail}
    >
      <div>
        <p className="text-sm leading-6 font-semibold text-theme-text-primary">
          {t("customization.items.support-email.title")}
        </p>
        <p className="text-xs text-theme-text-secondary">
          {t("customization.items.support-email.description")}
        </p>
      </div>
      <div className="flex items-center gap-x-3 mt-1">
        <Input
          name="supportEmail"
          type="email"
          className="max-w-xs"
          placeholder="support@mycompany.com"
          required={true}
          autoComplete="off"
          onChange={handleChange}
          value={supportEmail}
        />
        {originalEmail !== "" && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={(e) => updateSupportEmail(e, "")}
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

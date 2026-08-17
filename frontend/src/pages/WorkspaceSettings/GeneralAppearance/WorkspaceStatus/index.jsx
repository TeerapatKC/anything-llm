import { useState } from "react";
import Workspace from "@/models/workspace";
import showToast from "@/utils/toast";
import { useTranslation } from "react-i18next";
import ConfirmDialog from "@/components/ConfirmDialog";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

/**
 * Active/inactive switch for a single workspace. Deactivating keeps everything the
 * workspace owns and only closes it for chatting, so this is reversible and lives
 * alongside the other general settings rather than in a danger zone.
 */
export default function WorkspaceStatus({ workspace }) {
  const { t } = useTranslation();
  // Workspaces created before this column existed report no value at all; treat
  // anything that is not an explicit `false` as active.
  const [active, setActive] = useState(workspace?.active !== false);
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(null);

  const applyActive = async (nextActive) => {
    setSaving(true);
    setActive(nextActive);
    const { workspace: updated, message } = await Workspace.update(
      workspace.slug,
      { active: nextActive }
    );
    setSaving(false);

    if (!updated) {
      setActive(!nextActive);
      showToast(message || t("general.status.failed"), "error", {
        clear: true,
      });
      return;
    }
    showToast(
      nextActive
        ? t("general.status.activated")
        : t("general.status.deactivated"),
      "success",
      { clear: true }
    );
  };

  const handleChange = (nextActive) => {
    if (nextActive) return applyActive(true);
    setConfirm({
      title: t("general.status.confirm-title"),
      description: t("general.status.confirm-description"),
      confirmText: t("general.status.deactivate"),
      variant: "destructive",
      onConfirm: () => applyActive(false),
    });
  };

  if (!workspace) return null;
  return (
    <div className="flex flex-col gap-y-[8px]">
      <div className="flex items-center gap-x-2">
        <label className="block input-label">{t("general.status.title")}</label>
        <Badge variant={active ? "default" : "secondary"}>
          {active ? t("general.status.active") : t("general.status.inactive")}
        </Badge>
      </div>
      <p className="text-theme-text-secondary text-xs font-medium">
        {t("general.status.description")}
      </p>
      <div className="flex items-center gap-x-3 mt-1">
        <Switch
          checked={active}
          disabled={saving}
          onCheckedChange={handleChange}
          aria-label={t("general.status.title")}
        />
        <span className="text-theme-text-primary text-sm">
          {active ? t("general.status.active") : t("general.status.inactive")}
        </span>
      </div>
      <ConfirmDialog config={confirm} onClose={() => setConfirm(null)} />
    </div>
  );
}

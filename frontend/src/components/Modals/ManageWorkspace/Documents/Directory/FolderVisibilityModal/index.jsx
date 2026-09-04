import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Share2 } from "lucide-react";
import Document from "@/models/document";
import { folderDisplayName } from "@/utils/directories";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/** Same order and copy as the create modal, so the two read as one control. */
export const VISIBILITY_OPTIONS = [
  {
    value: "private",
    labelKey: "connectors.directory.visibility.private",
    descriptionKey: "connectors.directory.visibility.private-description",
  },
  {
    value: "workspace",
    labelKey: "connectors.directory.visibility.workspace",
    descriptionKey: "connectors.directory.visibility.workspace-description",
  },
  {
    value: "shared",
    labelKey: "connectors.directory.visibility.shared",
    descriptionKey: "connectors.directory.visibility.shared-description",
  },
];

/**
 * Changes who can see one folder.
 *
 * The server refuses this for anyone but the folder's owner, so a failure here
 * is shown as-is rather than translated - "only the owner can change this" is
 * the useful answer, and inventing a generic message would hide it.
 *
 * @param {object} props
 * @param {{name: string, visibility: string}} props.folder
 * @param {string|null} props.workspaceSlug - what "workspace" scopes to
 * @param {() => void} props.closeModal
 * @param {(name: string) => void} props.onChanged
 */
export default function FolderVisibilityModal({
  folder,
  workspaceSlug = null,
  closeModal,
  onChanged,
}) {
  const { t } = useTranslation();
  const [error, setError] = useState(null);
  const [visibility, setVisibility] = useState(folder.visibility ?? "shared");
  const [saving, setSaving] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    setError(null);
    if (saving) return;
    if (visibility === folder.visibility) return closeModal();

    setSaving(true);
    const { success, message } = await Document.setFolderVisibility(
      folder.name,
      visibility,
      workspaceSlug
    );
    setSaving(false);
    if (!success) return setError(message || "Failed to update visibility");
    onChanged(folder.name);
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && closeModal()}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-theme-text-primary" />
            <DialogTitle>
              {t("connectors.directory.change-visibility")}
            </DialogTitle>
          </div>
        </DialogHeader>
        <form onSubmit={handleSave}>
          <div className="space-y-4">
            <div>
              <Label className="block mb-2">
                {t("connectors.directory.visibility.label")} &mdash;{" "}
                <span className="font-normal text-theme-text-secondary">
                  {folderDisplayName(folder.name)}
                </span>
              </Label>
              <div className="flex flex-col gap-y-2">
                {VISIBILITY_OPTIONS.map((option) => (
                  <label
                    key={option.value}
                    className="flex cursor-pointer items-start gap-x-2 rounded-lg border border-theme-modal-border p-2.5 has-[:checked]:border-primary-button"
                  >
                    <input
                      type="radio"
                      name="visibility"
                      value={option.value}
                      checked={visibility === option.value}
                      onChange={() => setVisibility(option.value)}
                      className="mt-1 shrink-0"
                    />
                    <span className="min-w-0">
                      <span className="block text-sm text-theme-text-primary">
                        {t(option.labelKey)}
                      </span>
                      <span className="block text-xs text-theme-text-secondary">
                        {t(option.descriptionKey)}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
            {error && <p className="text-red-400 text-sm">Error: {error}</p>}
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="ghost" type="button" />}>
              Cancel
            </DialogClose>
            <Button type="submit" variant="default" disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

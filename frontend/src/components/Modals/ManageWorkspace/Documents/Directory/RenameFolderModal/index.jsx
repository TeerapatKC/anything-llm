import { useState } from "react";
import { useTranslation } from "react-i18next";
import { FolderPen } from "lucide-react";
import Document from "@/models/document";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * Renames one folder. The picker is refreshed by the caller rather than
 * patched in place: a rename changes the key every open page, expansion and
 * selection is stored under, so re-hydrating is the only way to be sure none
 * of them are left pointing at a folder that no longer exists.
 *
 * @param {object} props
 * @param {string} props.folderName the folder being renamed
 * @param {() => void} props.closeModal
 * @param {(from: string, to: string) => void} props.onRenamed
 */
export default function RenameFolderModal({
  folderName,
  closeModal,
  onRenamed,
}) {
  const { t } = useTranslation();
  const [error, setError] = useState(null);
  const [name, setName] = useState(folderName);
  const [renaming, setRenaming] = useState(false);

  const handleRename = async (e) => {
    e.preventDefault();
    setError(null);
    const next = name.trim();
    if (!next || renaming) return;
    if (next === folderName) return closeModal();

    setRenaming(true);
    const { success, message } = await Document.renameFolder(folderName, next);
    setRenaming(false);
    if (!success) return setError(message || "Failed to rename folder");
    onRenamed(folderName, next);
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && closeModal()}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-2">
            <FolderPen className="h-5 w-5 text-theme-text-primary" />
            <DialogTitle>{t("connectors.directory.rename-folder")}</DialogTitle>
          </div>
        </DialogHeader>
        <form onSubmit={handleRename}>
          <div className="space-y-4">
            <div>
              <Label htmlFor="folderName" className="block mb-2">
                Folder Name
              </Label>
              <Input
                name="folderName"
                type="text"
                placeholder={t("ui.enter-folder-name")}
                required={true}
                autoComplete="off"
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            {error && <p className="text-red-400 text-sm">Error: {error}</p>}
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="ghost" type="button" />}>
              Cancel
            </DialogClose>
            <Button type="submit" variant="default" disabled={renaming}>
              {renaming ? "Renaming..." : "Rename Folder"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

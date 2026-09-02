import { useTranslation } from "react-i18next";
import { useState } from "react";
import { Pencil } from "lucide-react";
import Workspace from "@/models/workspace";
import showToast from "@/utils/toast";
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
import { THREAD_RENAME_EVENT } from "../../constants";

export default function RenameThreadModal({ workspace, thread, onClose }) {
  const { t } = useTranslation();
  const [name, setName] = useState(thread.name ?? "");
  const [saving, setSaving] = useState(false);

  const handleRename = async (e) => {
    e.preventDefault();
    const newName = name.trim();
    if (!newName || saving) return;
    if (newName === thread.name) return onClose();

    setSaving(true);
    const { message } = await Workspace.threads.update(
      workspace.slug,
      thread.slug,
      { name: newName }
    );
    setSaving(false);

    if (!!message) {
      showToast(`Thread could not be updated! ${message}`, "error", {
        clear: true,
      });
      return;
    }

    // The list owns thread state, so tell it to re-render rather than mutating
    // the object it handed down.
    window.dispatchEvent(
      new CustomEvent(THREAD_RENAME_EVENT, {
        detail: { threadSlug: thread.slug, newName },
      })
    );
    onClose();
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent size="sm">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Pencil className="size-5 text-theme-text-primary" />
            <DialogTitle>Rename thread</DialogTitle>
          </div>
        </DialogHeader>
        <form onSubmit={handleRename}>
          <div>
            <Label htmlFor="threadName" className="block mb-2">
              Thread name
            </Label>
            <Input
              id="threadName"
              name="threadName"
              type="text"
              placeholder={t("ui.enter-thread-name")}
              required={true}
              autoComplete="off"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
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

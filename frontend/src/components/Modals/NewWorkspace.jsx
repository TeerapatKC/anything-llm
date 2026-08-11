import { useRef, useState } from "react";
import Workspace from "@/models/workspace";
import paths from "@/utils/paths";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

const noop = () => false;
export default function NewWorkspaceModal({ hideModal = noop }) {
  const formEl = useRef(null);
  const [error, setError] = useState(null);
  const { t } = useTranslation();
  const handleCreate = async (e) => {
    setError(null);
    e.preventDefault();
    const data = {};
    const form = new FormData(formEl.current);
    for (var [key, value] of form.entries()) data[key] = value;
    const { workspace, message } = await Workspace.new(data);
    if (!!workspace) {
      window.location.href = paths.workspace.chat(workspace.slug);
    }
    setError(message);
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && hideModal()}>
      <DialogContent className="max-w-2xl bg-theme-bg-secondary border-theme-modal-border">
        <DialogHeader className="p-0">
          <DialogTitle className="text-sm font-semibold">
            {t("new-workspace.title")}
          </DialogTitle>
        </DialogHeader>
        <form ref={formEl} onSubmit={handleCreate}>
          <div className="space-y-2 flex-col">
            <div className="w-full flex flex-col gap-y-4">
              <div>
                <Label variant="field" htmlFor="name" className="block mb-2">
                  {t("common.workspaces-name")}
                </Label>
                <Input
                  variant="settings"
                  name="name"
                  type="text"
                  id="name"
                  placeholder={t("new-workspace.placeholder")}
                  required={true}
                  autoComplete="off"
                  autoFocus={true}
                />
              </div>
              {error && <p className="text-red-400 text-sm">Error: {error}</p>}
            </div>
          </div>
          <DialogFooter className="mt-6 p-0">
            <Button variant="default" type="submit">
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function useNewWorkspaceModal() {
  const [showing, setShowing] = useState(false);
  const showModal = () => {
    setShowing(true);
  };
  const hideModal = () => {
    setShowing(false);
  };

  return { showing, showModal, hideModal };
}

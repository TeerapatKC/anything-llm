import React, { useState } from "react";
import Admin from "@/models/admin";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  DialogClose,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export default function NewWorkspaceModal() {
  const [error, setError] = useState(null);
  const { t } = useTranslation();
  const handleCreate = async (e) => {
    setError(null);
    e.preventDefault();
    const form = new FormData(e.target);
    const { workspace, error } = await Admin.newWorkspace(form.get("name"));
    if (!!workspace) window.location.reload();
    setError(error);
  };

  return (
    <>
      <DialogHeader className="p-0">
        <DialogTitle className="text-sm font-semibold">
          Create new workspace
        </DialogTitle>
      </DialogHeader>
      <form onSubmit={handleCreate}>
        <div className="space-y-4">
          <div>
            <Label variant="field" htmlFor="name" className="block mb-2">
              {t("common.workspaces-name")}
            </Label>
            <Input
              variant="settings"
              name="name"
              type="text"
              placeholder="My workspace"
              minLength={4}
              required={true}
              autoComplete="off"
            />
          </div>
          {error && <p className="text-red-400 text-sm">Error: {error}</p>}
          <p className="text-white text-opacity-60 text-xs md:text-sm">
            After creating this workspace only admins will be able to see it.
            You can add users after it has been created.
          </p>
        </div>
        <DialogFooter className="p-0 mt-4">
          <DialogClose asChild>
            <Button variant="outline" type="button">
              Cancel
            </Button>
          </DialogClose>
          <Button variant="default" type="submit">
            Create workspace
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}

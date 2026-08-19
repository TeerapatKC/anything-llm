import React, { useState } from "react";
import { FolderPlus } from "lucide-react";
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

export default function NewFolderModal({ closeModal, onCreated }) {
  const [error, setError] = useState(null);
  const [folderName, setFolderName] = useState("");
  const [creating, setCreating] = useState(false);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError(null);
    const name = folderName.trim();
    if (!name || creating) return;

    setCreating(true);
    const { success } = await Document.createFolder(name);
    setCreating(false);
    if (!success) return setError("Failed to create folder");
    onCreated(name);
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && closeModal()}>
      <DialogContent className="max-w-2xl bg-theme-bg-secondary border-theme-modal-border">
        <DialogHeader className="p-0">
          <div className="flex items-center gap-2">
            <FolderPlus className="h-5 w-5 text-theme-text-primary" />
            <DialogTitle>Create New Folder</DialogTitle>
          </div>
        </DialogHeader>
        <form onSubmit={handleCreate}>
          <div className="space-y-4">
            <div>
              <Label htmlFor="folderName" className="block mb-2">
                Folder Name
              </Label>
              <Input
                name="folderName"
                type="text"
                placeholder="Enter folder name"
                required={true}
                autoComplete="off"
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
              />
            </div>
            {error && <p className="text-red-400 text-sm">Error: {error}</p>}
          </div>
          <DialogFooter className="mt-4 p-0">
            <DialogClose render={<Button variant="ghost" type="button" />}>
              Cancel
            </DialogClose>
            <Button type="submit" variant="default" disabled={creating}>
              {creating ? "Creating..." : "Create Folder"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

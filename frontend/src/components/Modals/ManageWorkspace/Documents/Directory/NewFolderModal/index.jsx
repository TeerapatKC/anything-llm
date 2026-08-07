import React, { useState } from "react";
import { X } from "@phosphor-icons/react";
import Document from "@/models/document";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

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
    <div className="fixed inset-0 z-50 overflow-auto bg-black bg-opacity-50 flex items-center justify-center">
      <div className="relative w-full max-w-2xl bg-theme-bg-secondary rounded-lg shadow border-2 border-theme-modal-border">
        <div className="relative p-6 border-b rounded-t border-theme-modal-border">
          <div className="w-full flex gap-x-2 items-center">
            <h3 className="text-xl font-semibold text-white overflow-hidden overflow-ellipsis whitespace-nowrap">
              Create New Folder
            </h3>
          </div>
          <Button variant="modalClose" onClick={closeModal} type="button">
            <X size={24} weight="bold" className="text-white" />
          </Button>
        </div>
        <div className="p-6">
          <form onSubmit={handleCreate}>
            <div className="space-y-4">
              <div>
                <Label
                  variant="field"
                  htmlFor="folderName"
                  className="block mb-2"
                >
                  Folder Name
                </Label>
                <Input
                  variant="settings"
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
            <div className="flex justify-between items-center mt-6 pt-6 border-t border-theme-modal-border">
              <Button variant="muted" onClick={closeModal} type="button">
                Cancel
              </Button>
              <button
                type="submit"
                disabled={creating}
                className="transition-all duration-300 bg-white text-black hover:opacity-60 disabled:opacity-40 px-4 py-2 rounded-lg text-sm"
              >
                {creating ? "Creating..." : "Create Folder"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

import React, { useState } from "react";
import { X } from "@phosphor-icons/react";
import System from "@/models/system";
import showToast from "@/utils/toast";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export default function AddVariableModal({ closeModal, onRefresh }) {
  const [error, setError] = useState(null);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.target);
    const newVariable = {};
    for (const [key, value] of formData.entries())
      newVariable[key] = value.trim();

    if (!newVariable.key || !newVariable.value) {
      setError("Key and value are required");
      return;
    }

    try {
      await System.promptVariables.create(newVariable);
      showToast("Variable created successfully", "success", { clear: true });
      if (onRefresh) onRefresh();
      closeModal();
    } catch (error) {
      console.error("Error creating variable:", error);
      setError("Failed to create variable");
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-auto bg-black bg-opacity-50 flex items-center justify-center">
      <div className="relative w-full max-w-2xl bg-theme-bg-secondary rounded-lg shadow border-2 border-theme-modal-border">
        <div className="relative p-6 border-b rounded-t border-theme-modal-border">
          <div className="w-full flex gap-x-2 items-center">
            <h3 className="text-xl font-semibold text-white overflow-hidden overflow-ellipsis whitespace-nowrap">
              Add New Variable
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
                <Label variant="field" htmlFor="key" className="block mb-2">
                  Key
                </Label>
                <Input
                  variant="settings"
                  name="key"
                  type="text"
                  minLength={3}
                  maxLength={255}
                  placeholder="e.g., company_name"
                  required={true}
                  autoComplete="off"
                  pattern="^[a-zA-Z0-9_]+$"
                />
                <p className="mt-2 text-xs text-white/60">
                  Key must be unique and will be used in prompts as {"{key}"}.
                  Only letters, numbers and underscores are allowed.
                </p>
              </div>
              <div>
                <Label variant="field" htmlFor="value" className="block mb-2">
                  Value
                </Label>
                <Input
                  variant="settings"
                  name="value"
                  type="text"
                  placeholder="e.g., Acme Corp"
                  required={true}
                  autoComplete="off"
                />
              </div>
              <div>
                <Label
                  variant="field"
                  htmlFor="description"
                  className="block mb-2"
                >
                  Description
                </Label>
                <Input
                  variant="settings"
                  name="description"
                  type="text"
                  placeholder="Optional description"
                  autoComplete="off"
                />
              </div>
              {error && <p className="text-red-400 text-sm">Error: {error}</p>}
            </div>
            <div className="flex justify-between items-center mt-6 pt-6 border-t border-theme-modal-border">
              <Button variant="muted" onClick={closeModal} type="button">
                Cancel
              </Button>
              <Button variant="cta" type="submit">
                Create variable
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

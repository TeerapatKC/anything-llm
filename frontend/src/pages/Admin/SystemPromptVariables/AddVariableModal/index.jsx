import React, { useState } from "react";
import System from "@/models/system";
import showToast from "@/utils/toast";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  DialogClose,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

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
    <>
      <DialogHeader>
        <DialogTitle className="text-sm font-semibold">
          Add New Variable
        </DialogTitle>
      </DialogHeader>
      <form onSubmit={handleCreate}>
        <div className="space-y-4">
          <div>
            <Label htmlFor="key" className="block mb-2">
              Key
            </Label>
            <Input
              name="key"
              type="text"
              minLength={3}
              maxLength={255}
              placeholder="e.g., company_name"
              required={true}
              autoComplete="off"
              pattern="^[a-zA-Z0-9_]+$"
            />
            <p className="mt-2 text-xs text-theme-text-secondary">
              Key must be unique and will be used in prompts as {"{key}"}. Only
              letters, numbers and underscores are allowed.
            </p>
          </div>
          <div>
            <Label htmlFor="value" className="block mb-2">
              Value
            </Label>
            <Input
              name="value"
              type="text"
              placeholder="e.g., Acme Corp"
              required={true}
              autoComplete="off"
            />
          </div>
          <div>
            <Label htmlFor="description" className="block mb-2">
              Description
            </Label>
            <Input
              name="description"
              type="text"
              placeholder="Optional description"
              autoComplete="off"
            />
          </div>
          {error && <p className="text-red-400 text-sm">Error: {error}</p>}
        </div>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" type="button" />}>
            Cancel
          </DialogClose>
          <Button variant="default" type="submit">
            Create variable
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}

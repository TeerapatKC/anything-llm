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

export default function EditVariableModal({ variable, closeModal, onRefresh }) {
  const [error, setError] = useState(null);

  const handleUpdate = async (e) => {
    if (!variable.id) return;
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.target);
    const updatedVariable = {};
    for (const [key, value] of formData.entries())
      updatedVariable[key] = value.trim();

    if (!updatedVariable.key || !updatedVariable.value) {
      setError("Key and value are required");
      return;
    }

    try {
      await System.promptVariables.update(variable.id, updatedVariable);
      showToast("Variable updated successfully", "success", { clear: true });
      if (onRefresh) onRefresh();
      closeModal();
    } catch (error) {
      console.error("Error updating variable:", error);
      setError("Failed to update variable");
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-sm font-semibold">
          Edit {variable.key}
        </DialogTitle>
      </DialogHeader>
      <form onSubmit={handleUpdate}>
        <div className="space-y-4">
          <div>
            <Label htmlFor="key" className="block mb-2">
              Key
            </Label>
            <Input
              name="key"
              minLength={3}
              maxLength={255}
              type="text"
              placeholder="e.g., company_name"
              defaultValue={variable.key}
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
              defaultValue={variable.value}
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
              defaultValue={variable.description}
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
            Update variable
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}

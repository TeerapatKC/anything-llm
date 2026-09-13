import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ContextualSaveBar({
  showing = false,
  onSave,
  onCancel,
  saving = false,
}) {
  if (!showing) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 flex flex-wrap items-center justify-between gap-3 border-t bg-background px-4 py-3 shadow-lg sm:px-6">
      <div className="flex min-w-0 items-center gap-2">
        <TriangleAlert
          size={18}
          className="text-yellow-600 dark:text-yellow-400"
        />
        <p className="text-theme-text-primary font-medium text-sm">
          Unsaved Changes
        </p>
      </div>
      <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={saving}
        >
          Cancel
        </Button>
        <Button
          type="button"
          variant="default"
          onClick={onSave}
          disabled={saving}
        >
          {saving ? "Saving..." : "Save"}
        </Button>
      </div>
    </div>
  );
}

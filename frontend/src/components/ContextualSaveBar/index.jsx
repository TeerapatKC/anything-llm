import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ContextualSaveBar({
  showing = false,
  onSave,
  onCancel,
}) {
  if (!showing) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 h-16 bg-background border-t shadow-lg flex items-center justify-end px-6 z-40 transition-all">
      <div className="absolute ml-6 left-0 md:left-1/2 transform md:-translate-x-1/2 flex items-center gap-x-2">
        <TriangleAlert
          size={18}
          className="text-yellow-600 dark:text-yellow-400"
        />
        <p className="text-theme-text-primary font-medium text-sm">
          Unsaved Changes
        </p>
      </div>
      <div className="flex items-center gap-x-3">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="default" onClick={onSave}>
          Save
        </Button>
      </div>
    </div>
  );
}

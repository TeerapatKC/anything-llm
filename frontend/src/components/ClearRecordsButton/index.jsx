import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ClearRecordsButton({ children, disabled, onClick }) {
  return (
    <Button
      type="button"
      size="lg"
      variant="destructive"
      disabled={disabled}
      onClick={onClick}
    >
      <Trash2 className="size-4" />
      {children}
    </Button>
  );
}

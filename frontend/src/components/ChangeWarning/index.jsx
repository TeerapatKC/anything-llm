import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";

export default function ChangeWarningModal({
  warningText = "",
  onClose,
  onConfirm,
}) {
  return (
    <>
      <DialogHeader className="p-0">
        <div className="flex items-center gap-2">
          <TriangleAlert className="text-red-500 w-5 h-5 fill-current" />
          <DialogTitle className="text-sm font-semibold text-red-500">
            WARNING - This action is irreversible
          </DialogTitle>
        </div>
      </DialogHeader>
      <div className="space-y-2">
        <p className="text-theme-text-primary text-sm">
          {warningText.split("\\n").map((line, index) => (
            <span key={index}>
              {line}
              <br />
            </span>
          ))}
          <br />
          Are you sure you want to proceed?
        </p>
      </div>
      <DialogFooter className="p-0">
        <DialogClose asChild>
          <Button variant="outline" onClick={onClose} type="button">
            Cancel
          </Button>
        </DialogClose>
        <Button variant="destructive" onClick={onConfirm} type="button">
          Confirm
        </Button>
      </DialogFooter>
    </>
  );
}

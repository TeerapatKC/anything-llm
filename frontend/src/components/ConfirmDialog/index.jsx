import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

/**
 * A reusable confirm dialog built on top of the project's shadcn Dialog
 * primitives. It replaces browser-native window.confirm() calls with an
 * accessible, themed overlay.
 *
 * Usage — controlled pattern:
 *
 *   const [confirm, setConfirm] = useState(null); // null = closed
 *
 *   // open:
 *   setConfirm({
 *     title: "Delete role",
 *     description: "This action cannot be undone.",
 *     confirmText: "Delete",        // optional, default "Confirm"
 *     variant: "destructive",       // optional, default "destructive"
 *     onConfirm: () => doDelete(),
 *   });
 *
 *   // in JSX:
 *   <ConfirmDialog config={confirm} onClose={() => setConfirm(null)} />
 *
 * @param {{
 *   config: {
 *     title: string,
 *     description?: string,
 *     confirmText?: string,
 *     cancelText?: string,
 *     variant?: "destructive"|"default"|"outline",
 *     onConfirm: () => void,
 *   } | null,
 *   onClose: () => void,
 * }} props
 */
export default function ConfirmDialog({ config, onClose }) {
  const open = config !== null;

  function handleConfirm() {
    config?.onConfirm?.();
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="max-w-md bg-theme-bg-secondary border-theme-modal-border"
        scrollable={false}
      >
        <div className="p-6 flex flex-col gap-y-4">
          <DialogHeader sticky={false}>
            <DialogTitle>{config?.title ?? "Are you sure?"}</DialogTitle>
            {config?.description && (
              <DialogDescription className="text-theme-text-secondary mt-1">
                {config.description}
              </DialogDescription>
            )}
          </DialogHeader>

          <DialogFooter className="pt-2 flex flex-row justify-end gap-x-2">
            <Button variant="outline" onClick={onClose}>
              {config?.cancelText ?? "Cancel"}
            </Button>
            <Button
              variant={config?.variant ?? "destructive"}
              onClick={handleConfirm}
            >
              {config?.confirmText ?? "Confirm"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

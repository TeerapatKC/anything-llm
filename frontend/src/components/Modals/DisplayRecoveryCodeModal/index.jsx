import showToast from "@/utils/toast";
import { Download, Key } from "lucide-react";
import { saveAs } from "file-saver";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function RecoveryCodeModal({
  recoveryCodes,
  onDownloadComplete,
  onClose,
}) {
  const [downloadClicked, setDownloadClicked] = useState(false);

  const downloadRecoveryCodes = () => {
    const blob = new Blob([recoveryCodes.join("\n")], { type: "text/plain" });
    saveAs(blob, "recovery_codes.txt");
    setDownloadClicked(true);
  };

  const handleClose = () => {
    if (downloadClicked) {
      onDownloadComplete();
      onClose();
    }
  };

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(recoveryCodes.join(",\n")).then(() => {
      showToast("Recovery codes copied to clipboard", "success", {
        clear: true,
      });
    });
  };

  return (
    <Dialog open={true}>
      <DialogContent
        className="max-w-2xl bg-theme-bg-secondary border-theme-modal-border [&>button]:hidden"
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="p-0">
          <div className="w-full flex gap-x-2 items-center">
            <Key size={18} className="text-theme-text-primary" />
            <DialogTitle className="text-sm font-semibold">
              Recovery Codes
            </DialogTitle>
          </div>
        </DialogHeader>
        <div className="space-y-2 flex-col">
          <p className="text-sm text-theme-text-primary flex flex-col">
            In order to reset your password in the future, you will need these
            recovery codes. Download or copy your recovery codes to save them.{" "}
            <br />
            <b className="mt-4">These recovery codes are only shown once!</b>
          </p>
          <div
            className="border-none bg-theme-settings-input-bg text-theme-text-primary hover:text-primary-button
                 flex items-center justify-center rounded-md mt-6 cursor-pointer"
            onClick={handleCopyToClipboard}
          >
            <ul className="space-y-2 md:p-6 p-4">
              {recoveryCodes.map((code, index) => (
                <li key={index} className="md:text-sm text-xs">
                  {code}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <DialogFooter className="p-0">
          <Button
            variant="default"
            type="button"
            onClick={downloadClicked ? handleClose : downloadRecoveryCodes}
          >
            {downloadClicked ? (
              "Close"
            ) : (
              <>
                <Download size={18} />
                Download
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

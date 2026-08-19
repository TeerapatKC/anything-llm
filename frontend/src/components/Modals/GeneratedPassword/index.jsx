import { useState } from "react";
import { Check, Copy, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

/**
 * Shows a password the server generated for a user. The plaintext only ever exists in
 * this response - it is hashed on the way into the database - so this dialog is the one
 * chance an admin has to copy it and hand it over.
 * @param {{open: boolean, username?: string, password: string|null, title?: string, onClose: () => void}} props
 */
export default function GeneratedPasswordModal({
  open,
  username,
  password,
  title = "Initial password",
  onClose,
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(password).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  if (!password) return null;
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-theme-text-secondary">
            {username ? (
              <>
                Give this password to{" "}
                <b className="text-theme-text-primary">{username}</b>. They will
                be required to set a password of their own the first time they
                log in.
              </>
            ) : (
              "The user will be required to set a password of their own the next time they log in."
            )}
          </p>
          <div className="flex items-center gap-x-2">
            <code className="flex-1 select-all break-all rounded-lg bg-theme-bg-primary px-4 py-3 font-mono text-sm text-theme-text-primary">
              {password}
            </code>
            <Button
              type="button"
              variant="outline"
              onClick={handleCopy}
              aria-label="Copy password"
            >
              {copied ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
          <div className="flex items-start gap-x-2 rounded-lg border border-yellow-500/40 bg-yellow-500/10 p-3">
            <TriangleAlert className="h-4 w-4 shrink-0 mt-0.5 text-yellow-400" />
            <p className="text-xs text-yellow-200">
              Copy it now - this password cannot be shown again. If it is lost,
              reset the user's password to generate a new one.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="default" type="button" onClick={onClose}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

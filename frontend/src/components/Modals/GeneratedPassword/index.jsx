import { Alert, AlertDescription } from "@/components/ui/alert";
import { useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { Check, Copy, Mail, TriangleAlert } from "lucide-react";
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
 *
 * `emailSent` is left `undefined` by callers (like a password reset) that never attempt
 * to email it - the extra note below only makes sense right after user creation, where
 * the server actually tried.
 * @param {{open: boolean, username?: string, password: string|null, title?: string, emailSent?: boolean, recipientEmail?: string, onClose: () => void}} props
 */
export default function GeneratedPasswordModal({
  open,
  username,
  password,
  title,
  emailSent,
  recipientEmail,
  onClose,
}) {
  const { t } = useTranslation();
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
          <DialogTitle>{title ?? t("generated-password.title")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-theme-text-secondary">
            {username ? (
              <Trans
                i18nKey="generated-password.give-to"
                values={{ username }}
                components={{ b: <b className="text-theme-text-primary" /> }}
              />
            ) : (
              t("generated-password.generic")
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
              aria-label={t("generated-password.copy-aria")}
            >
              {copied ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
          <Alert variant="warning">
            <TriangleAlert />
            <AlertDescription className="text-xs">
              {t("generated-password.warning")}
            </AlertDescription>
          </Alert>
          {emailSent === true && (
            <Alert className="border-green-500/40 bg-green-500/10 text-green-700 dark:text-green-400">
              <Mail />
              <AlertDescription className="text-xs !text-green-700/90 dark:!text-green-400/90">
                <Trans
                  i18nKey="generated-password.emailed-to"
                  values={{
                    email: recipientEmail || t("generated-password.the-user"),
                  }}
                  components={{ b: <b className="text-theme-text-primary" /> }}
                />
              </AlertDescription>
            </Alert>
          )}
          {emailSent === false && (
            <Alert>
              <Mail />
              <AlertDescription className="text-xs">
                {t("generated-password.not-emailed")}
              </AlertDescription>
            </Alert>
          )}
        </div>
        <DialogFooter>
          <Button variant="default" type="button" onClick={onClose}>
            {t("generated-password.done")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

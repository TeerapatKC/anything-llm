import { useState } from "react";
import System from "@/models/system";
import showToast from "@/utils/toast";
import { safeJsonParse } from "@/utils/request";
import { AUTH_USER } from "@/utils/constants";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

/**
 * Clears the forced-password-change flag on the cached session user so the app stops
 * routing back to the change-password screen without needing a fresh login.
 */
function clearPasswordChangeFlag() {
  const storedUser = safeJsonParse(localStorage.getItem(AUTH_USER), null);
  if (!storedUser) return;
  storedUser.requiresPasswordChange = false;
  localStorage.setItem(AUTH_USER, JSON.stringify(storedUser));
}

/**
 * The password fields shared by the optional "change my password" dialog and the
 * mandatory post-reset screen. Changing your own password always requires the current
 * one, which is what stops a hijacked session from locking the real owner out.
 * one - except in the forced flow, where the user just authenticated with the password an
 * admin generated and asking for it again would be pure friction.
 * @param {{onSuccess?: () => void, submitLabel?: string, requireCurrentPassword?: boolean, actions?: (state: {loading: boolean}) => React.ReactNode}} props
 */
export function ChangePasswordForm({
  onSuccess,
  submitLabel,
  requireCurrentPassword = true,
  actions,
}) {
  const { t } = useTranslation();
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const form = new FormData(e.target);
    const currentPassword = form.get("currentPassword");
    const newPassword = form.get("newPassword");
    const confirmPassword = form.get("confirmPassword");

    if (newPassword !== confirmPassword) {
      setError(t("password_change.mismatch"));
      return;
    }

    setLoading(true);
    const { success, error } = await System.changePassword({
      currentPassword,
      newPassword,
      confirmPassword,
    });
    setLoading(false);

    if (!success) {
      setError(error);
      return;
    }

    clearPasswordChangeFlag();
    showToast(t("password_change.success"), "success", { clear: true });
    onSuccess?.();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {requireCurrentPassword && (
        <div>
          <Label
            variant="field"
            htmlFor="currentPassword"
            className="block mb-2"
          >
            {t("password_change.current_password")}
          </Label>
          <Input
            variant="settings"
            name="currentPassword"
            type="password"
            required={true}
            autoComplete="current-password"
          />
        </div>
      )}
      <div>
        <Label variant="field" htmlFor="newPassword" className="block mb-2">
          {t("password_change.new_password")}
        </Label>
        <Input
          variant="settings"
          name="newPassword"
          type="password"
          required={true}
          minLength={8}
          autoComplete="new-password"
        />
        <p className="mt-2 text-xs text-white/60">
          {t("password_change.password_requirements")}
        </p>
      </div>
      <div>
        <Label variant="field" htmlFor="confirmPassword" className="block mb-2">
          {t("password_change.confirm_password")}
        </Label>
        <Input
          variant="settings"
          name="confirmPassword"
          type="password"
          required={true}
          minLength={8}
          autoComplete="new-password"
        />
      </div>
      {error && <p className="text-red-400 text-sm">Error: {error}</p>}
      {actions?.({ loading }) ?? (
        <DialogFooter className="pt-2">
          <DialogClose asChild>
            <Button variant="outline" type="button">
              {t("password_change.cancel")}
            </Button>
          </DialogClose>
          <Button variant="default" type="submit" disabled={loading}>
            {loading
              ? t("password_change.updating")
              : (submitLabel ?? t("password_change.title"))}
          </Button>
        </DialogFooter>
      )}
    </form>
  );
}

/**
 * Dialog a signed-in user opens themselves to rotate their password.
 * @param {{open: boolean, onClose: () => void}} props
 */
export default function ChangePasswordModal({ open, onClose }) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-lg bg-theme-bg-secondary border-theme-modal-border">
        <DialogHeader>
          <DialogTitle>{t("password_change.title")}</DialogTitle>
        </DialogHeader>
        <ChangePasswordForm onSuccess={onClose} />
      </DialogContent>
    </Dialog>
  );
}

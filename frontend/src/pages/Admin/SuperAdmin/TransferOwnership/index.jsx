import { useTranslation } from "react-i18next";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ConfirmDialog from "@/components/ConfirmDialog";
import showToast from "@/utils/toast";
import SuperAdmin from "@/models/superAdmin";
import { AUTH_USER } from "@/utils/constants";
import { userFromStorage } from "@/utils/request";

/**
 * Hands the instance to somebody else.
 *
 * This is the only way the `super-admin` role ever moves. It is one atomic operation on
 * the server - the outgoing owner becomes an Admin in the same transaction - so the
 * instance is never left with two owners or none.
 */
export default function TransferOwnership({ candidates = [], onTransferred }) {
  const { t } = useTranslation();
  const [targetUserId, setTargetUserId] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(null);

  const target = candidates.find(
    (candidate) => String(candidate.id) === String(targetUserId)
  );

  function handleSubmit(e) {
    e.preventDefault();
    if (!target) return;

    setConfirm({
      title: `Make ${target.username} the owner?`,
      description:
        "They gain every super admin power, including the ability to reset this instance. You will be demoted to Admin immediately and will not be able to undo this yourself.",
      confirmText: "Transfer ownership",
      variant: "destructive",
      onConfirm: async () => {
        setSaving(true);
        const { success, error } = await SuperAdmin.transferOwnership(
          target.id,
          password
        );
        setSaving(false);
        if (!success) return showToast(error, "error", { clear: true });

        // The caller is an Admin from this point on, so the cached session user would
        // otherwise keep claiming ownership until the next full reload.
        const cached = userFromStorage();
        if (cached) {
          window.localStorage.setItem(
            AUTH_USER,
            JSON.stringify({ ...cached, role: "admin" })
          );
        }

        showToast(
          `${target.username} now owns this instance. You are an Admin.`,
          "success",
          { clear: true }
        );
        setPassword("");
        setTargetUserId("");
        onTransferred?.();
      },
    });
  }

  if (candidates.length === 0) {
    return (
      <p className="mt-6 rounded-lg bg-muted/20 ring-1 ring-foreground/10 p-5 text-sm text-theme-text-secondary">
        {t("help.transfer-ownership")}
      </p>
    );
  }

  return (
    <>
      <form
        onSubmit={handleSubmit}
        className="mt-6 flex max-w-xl flex-col gap-y-5 rounded-lg bg-muted/20 ring-1 ring-foreground/10 p-5"
      >
        <div>
          <Label htmlFor="targetUserId" className="block mb-2">
            New owner
          </Label>
          <Select
            name="targetUserId"
            value={targetUserId}
            onValueChange={setTargetUserId}
          >
            <SelectTrigger>
              <SelectValue placeholder={t("ui.choose-an-account")} />
            </SelectTrigger>
            <SelectContent>
              {candidates.map((candidate) => (
                <SelectItem key={candidate.id} value={String(candidate.id)}>
                  {candidate.username}
                  {candidate.email ? ` — ${candidate.email}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="mt-2 text-xs text-theme-text-secondary">
            {t("help.transfer-ownership-2")}
          </p>
        </div>

        <div>
          <Label htmlFor="password" className="block mb-2">
            Your password
          </Label>
          <Input
            id="password"
            name="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t("ui.confirm-it-is-you")}
            autoComplete="current-password"
            required={true}
          />
        </div>

        <div className="flex justify-end">
          <Button
            type="submit"
            variant="destructive"
            disabled={saving || !target || !password}
          >
            {saving ? "Transferring…" : "Transfer ownership"}
          </Button>
        </div>
      </form>

      <ConfirmDialog config={confirm} onClose={() => setConfirm(null)} />
    </>
  );
}

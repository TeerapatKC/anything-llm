import { useTranslation } from "react-i18next";
import { useState } from "react";
import { useParams } from "react-router-dom";
import Invite from "@/models/invite";
import System from "@/models/system";
import paths from "@/utils/paths";
import { AUTH_TOKEN, AUTH_USER } from "@/utils/constants";
import { storePermissions } from "@/utils/permissions";
import { userFromStorage } from "@/utils/request";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";

/**
 * Claiming an invite with an account that already exists.
 *
 * The invite's workspace grant is the only thing applied — the account keeps
 * whatever role it already has, so accepting an invite can never change
 * someone's permissions.
 */
export default function ExistingUserForm() {
  const { t } = useTranslation();
  const { code } = useParams();
  const signedInUser = userFromStorage();
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  /** Already signed in on this device — no need to ask for credentials. */
  const claimAsCurrentUser = async () => {
    setError(null);
    setBusy(true);
    const { success, error } = await Invite.claimInvite(code);
    setBusy(false);
    if (!success) return setError(error);
    window.location = paths.home();
  };

  /** Not signed in — authenticate first, then claim with that fresh token. */
  const signInAndClaim = async (e) => {
    e.preventDefault();
    setError(null);
    setBusy(true);

    const form = new FormData(e.target);
    const credentials = Object.fromEntries(form.entries());
    const { valid, user, token, message } =
      await System.requestToken(credentials);
    if (!valid || !token || !user) {
      setBusy(false);
      return setError(message || "Those credentials did not work.");
    }

    // Claim with the token we just received: localStorage is only written once
    // the invite is actually attached, so a failed claim leaves no half-session.
    const { success, error } = await Invite.claimInvite(code, token);
    setBusy(false);
    if (!success) return setError(error);

    window.localStorage.setItem(AUTH_USER, JSON.stringify(user));
    window.localStorage.setItem(AUTH_TOKEN, token);
    storePermissions(user.permissions);
    window.location = paths.home();
  };

  if (signedInUser?.username) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          You are signed in as{" "}
          <b className="text-foreground">{signedInUser.username}</b>. Accepting
          adds this account to the invite's workspaces — your role does not
          change.
        </p>
        {error && <p className="text-sm text-destructive">Error: {error}</p>}
        <DialogFooter>
          <Button
            type="button"
            variant="default"
            className="w-full"
            disabled={busy}
            onClick={claimAsCurrentUser}
          >
            {busy ? "Accepting..." : "Accept invitation"}
          </Button>
        </DialogFooter>
      </div>
    );
  }

  return (
    <form onSubmit={signInAndClaim}>
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {t("help.existing-user-form")}
        </p>
        <div>
          <Label htmlFor="username" className="block mb-2">
            Username
          </Label>
          <Input
            name="username"
            type="text"
            placeholder="My username"
            required={true}
            autoComplete="username"
          />
        </div>
        <div>
          <Label htmlFor="password" className="block mb-2">
            Password
          </Label>
          <Input
            name="password"
            type="password"
            placeholder={t("ui.your-password")}
            required={true}
            autoComplete="current-password"
          />
        </div>
        {error && <p className="text-sm text-destructive">Error: {error}</p>}
      </div>
      <DialogFooter>
        <Button
          type="submit"
          variant="default"
          className="w-full"
          disabled={busy}
        >
          {busy ? "Accepting..." : "Sign in and accept"}
        </Button>
      </DialogFooter>
    </form>
  );
}

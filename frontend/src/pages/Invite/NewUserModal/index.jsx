import { useState } from "react";
import Invite from "@/models/invite";
import paths from "@/utils/paths";
import { useParams } from "react-router-dom";
import { AUTH_TOKEN, AUTH_USER } from "@/utils/constants";
import { storePermissions } from "@/utils/permissions";
import System from "@/models/system";
import { useTranslation } from "react-i18next";
import {
  USERNAME_MIN_LENGTH,
  USERNAME_MAX_LENGTH,
  USERNAME_PATTERN,
} from "@/utils/username";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";

export default function NewUserModal() {
  const { code } = useParams();
  const [error, setError] = useState(null);
  const { t } = useTranslation();

  const handleCreate = async (e) => {
    setError(null);
    e.preventDefault();
    const data = {};
    const form = new FormData(e.target);
    for (var [key, value] of form.entries()) data[key] = value;
    const { success, error } = await Invite.acceptInvite(code, data);
    if (success) {
      const { valid, user, token, message } = await System.requestToken(data);
      if (valid && !!token && !!user) {
        window.localStorage.setItem(AUTH_USER, JSON.stringify(user));
        window.localStorage.setItem(AUTH_TOKEN, token);
        storePermissions(user.permissions);
        window.location = paths.home();
      } else {
        setError(message);
      }
      return;
    }
    setError(error);
  };

  return (
    <form onSubmit={handleCreate}>
      <div className="space-y-4">
        <div>
          <Label htmlFor="username" className="block mb-2">
            Username
          </Label>
          <Input
            name="username"
            type="text"
            placeholder="My username"
            minLength={USERNAME_MIN_LENGTH}
            maxLength={USERNAME_MAX_LENGTH}
            pattern={USERNAME_PATTERN}
            required={true}
            autoComplete="off"
          />
          <p className="mt-2 text-xs text-theme-text-secondary">
            {t("common.username_requirements")}
          </p>
        </div>
        <div>
          <Label htmlFor="email" className="block mb-2">
            Email
          </Label>
          <Input
            name="email"
            type="email"
            placeholder="you@example.com"
            maxLength={255}
            required={true}
            autoComplete="off"
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
            minLength={8}
            autoComplete="off"
          />
        </div>
        {error && <p className="text-red-400 text-sm">Error: {error}</p>}
        <p className="text-theme-text-secondary text-xs md:text-sm">
          {t("help.new-user-modal")}
        </p>
      </div>
      <DialogFooter>
        <Button type="submit" variant="default" className="w-full">
          Accept invitation
        </Button>
      </DialogFooter>
    </form>
  );
}

import { useState } from "react";
import Admin from "@/models/admin";
import { userFromStorage } from "@/utils/request";
import { MessageLimitInput, RoleHintDisplay } from "..";
import { useTranslation } from "react-i18next";
import {
  USERNAME_MIN_LENGTH,
  USERNAME_MAX_LENGTH,
  USERNAME_PATTERN,
} from "@/utils/username";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function NewUserModal({ closeModal }) {
  const [error, setError] = useState(null);
  const [role, setRole] = useState("default");
  const [messageLimit, setMessageLimit] = useState({
    enabled: false,
    limit: 10,
  });
  const { t } = useTranslation();

  const handleCreate = async (e) => {
    setError(null);
    e.preventDefault();
    const data = {};
    const form = new FormData(e.target);
    for (var [key, value] of form.entries()) data[key] = value;
    data.dailyMessageLimit = messageLimit.enabled ? messageLimit.limit : null;

    const { user, error } = await Admin.newUser(data);
    if (!!user) window.location.reload();
    setError(error);
  };

  const user = userFromStorage();

  return (
    <>
      <DialogHeader>
        <DialogTitle>Add user to instance</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleCreate}>
        <div className="space-y-4">
          <div>
            <Label variant="field" htmlFor="username" className="block mb-2">
              Username
            </Label>
            <Input
              variant="settings"
              name="username"
              type="text"
              placeholder="User's username"
              minLength={USERNAME_MIN_LENGTH}
              maxLength={USERNAME_MAX_LENGTH}
              pattern={USERNAME_PATTERN}
              required={true}
              autoComplete="off"
            />
            <p className="mt-2 text-xs text-white/60">
              {t("common.username_requirements")}
            </p>
          </div>
          <div>
            <Label variant="field" htmlFor="password" className="block mb-2">
              Password
            </Label>
            <Input
              variant="settings"
              name="password"
              type="text"
              placeholder="User's initial password"
              required={true}
              autoComplete="off"
              minLength={8}
            />
            <p className="mt-2 text-xs text-white/60">
              Password must be at least 8 characters long
            </p>
          </div>
          <div>
            <Label variant="field" htmlFor="bio" className="block mb-2">
              Bio
            </Label>
            <Textarea
              variant="settings"
              name="bio"
              placeholder="User's bio"
              autoComplete="off"
              rows={3}
            />
          </div>
          <div>
            <Label variant="field" htmlFor="role" className="block mb-2">
              Role
            </Label>
            <Select
              name="role"
              required={true}
              defaultValue={"default"}
              onValueChange={setRole}
            >
              <SelectTrigger variant="settings">
                <SelectValue placeholder="Select an option" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Default</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                {user?.role === "admin" && (
                  <SelectItem value="admin">Administrator</SelectItem>
                )}
              </SelectContent>
            </Select>
            <RoleHintDisplay role={role} />
          </div>
          <MessageLimitInput
            role={role}
            enabled={messageLimit.enabled}
            limit={messageLimit.limit}
            updateState={setMessageLimit}
          />
          {error && <p className="text-red-400 text-sm">Error: {error}</p>}
          <p className="text-white text-xs md:text-sm">
            After creating a user they will need to login with their initial
            login to get access.
          </p>
        </div>
        <DialogFooter className="mt-6 pt-6 border-t border-theme-modal-border">
          <Button variant="muted" onClick={closeModal} type="button">
            Cancel
          </Button>
          <Button variant="cta" type="submit">
            Add user
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}

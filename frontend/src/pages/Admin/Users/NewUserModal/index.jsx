import { useState } from "react";
import Admin from "@/models/admin";
import { userFromStorage } from "@/utils/request";
import useRoles from "@/hooks/useRoles";
import { canManageRole } from "@/utils/permissions";
import { MessageLimitInput, RoleHintDisplay, roleOptionLabel } from "..";
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
  DialogClose,
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

export default function NewUserModal({ closeModal, onSuccess }) {
  const { roles, permissionLabels } = useRoles();
  const [error, setError] = useState(null);
  const [role, setRole] = useState("default");
  const [loading, setLoading] = useState(false);
  const [messageLimit, setMessageLimit] = useState({
    enabled: false,
    limit: 10,
  });
  const { t } = useTranslation();

  const handleCreate = async (e) => {
    setError(null);
    e.preventDefault();
    setLoading(true);
    const data = {};
    const form = new FormData(e.target);
    for (var [key, value] of form.entries()) data[key] = value;
    data.dailyMessageLimit = messageLimit.enabled ? messageLimit.limit : null;

    const { user, initialPassword, error } = await Admin.newUser(data);
    setLoading(false);
    if (!!user) {
      onSuccess?.({ username: user.username, initialPassword });
    } else {
      setError(error);
    }
  };

  const user = userFromStorage();
  // You can only create a user with a role that grants no more than your own does.
  const assignableRoles = roles.filter((entry) =>
    canManageRole(user, entry.name, roles)
  );

  return (
    <>
      <DialogHeader>
        <DialogTitle>Add user to instance</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleCreate}>
        <div className="space-y-4">
          <div>
            <Label htmlFor="username" className="block mb-2">
              Username
            </Label>
            <Input
              name="username"
              type="text"
              placeholder="User's username"
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
              placeholder="user@example.com"
              maxLength={255}
              required={true}
              autoComplete="off"
            />
            <p className="mt-2 text-xs text-theme-text-secondary">
              Used to identify and contact the account holder.
            </p>
          </div>
          <div>
            <Label htmlFor="bio" className="block mb-2">
              Bio
            </Label>
            <Textarea
              name="bio"
              placeholder="User's bio"
              autoComplete="off"
              rows={3}
            />
          </div>
          <div>
            <Label htmlFor="role" className="block mb-2">
              Role
            </Label>
            <Select
              name="role"
              required={true}
              value={role}
              onValueChange={setRole}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a role">
                  {(value) =>
                    roleOptionLabel(
                      assignableRoles.find((entry) => entry.name === value)
                    ) || value
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {assignableRoles.map((entry) => (
                  <SelectItem
                    key={entry.id}
                    value={entry.name}
                    label={roleOptionLabel(entry)}
                  >
                    {roleOptionLabel(entry)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <RoleHintDisplay
              role={role}
              roles={roles}
              permissionLabels={permissionLabels}
            />
          </div>
          <MessageLimitInput
            role={role}
            roles={roles}
            enabled={messageLimit.enabled}
            limit={messageLimit.limit}
            updateState={setMessageLimit}
          />
          {error && <p className="text-red-400 text-sm">Error: {error}</p>}
          <p className="text-theme-text-primary text-xs md:text-sm">
            An initial password is generated for you and shown once after the
            user is created. The user must replace it before they can use the
            instance.
          </p>
        </div>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" type="button" />}>
            Cancel
          </DialogClose>
          <Button variant="default" type="submit" disabled={loading}>
            {loading ? "Adding..." : "Add user"}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}

import React, { useState } from "react";
import Admin from "@/models/admin";
import { MessageLimitInput, RoleHintDisplay, roleOptionLabel } from "../..";
import { AUTH_USER } from "@/utils/constants";
import { canManageRole } from "@/utils/permissions";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DialogClose,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export default function EditUserModal({
  currentUser,
  user,
  roles = [],
  permissionLabels = {},
}) {
  const [role, setRole] = useState(user.role);
  // You can only move a user onto a role that grants no more than your own does. The
  // role they already hold stays listed so the dropdown is never empty.
  const assignableRoles = roles.filter(
    (entry) =>
      entry.name === user.role || canManageRole(currentUser, entry.name, roles)
  );
  const [error, setError] = useState(null);
  const [messageLimit, setMessageLimit] = useState({
    enabled: user.dailyMessageLimit !== null,
    limit: user.dailyMessageLimit || 10,
  });
  const { t } = useTranslation();

  const handleUpdate = async (e) => {
    setError(null);
    e.preventDefault();
    const data = {};
    const form = new FormData(e.target);
    for (var [key, value] of form.entries()) {
      if (!value || value === null) continue;
      data[key] = value;
    }
    if (messageLimit.enabled) {
      data.dailyMessageLimit = messageLimit.limit;
    } else {
      data.dailyMessageLimit = null;
    }

    const { success, error } = await Admin.updateUser(user.id, data);
    if (success) {
      // Update local storage if we're editing our own user
      if (currentUser && currentUser.id === user.id) {
        currentUser.username = data.username;
        currentUser.email = data.email;
        currentUser.bio = data.bio;
        currentUser.role = data.role;
        localStorage.setItem(AUTH_USER, JSON.stringify(currentUser));
      }

      window.location.reload();
    }
    setError(error);
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-sm font-semibold">
          {t("admin-users.modal.edit-title", { username: user.username })}
        </DialogTitle>
      </DialogHeader>
      <form onSubmit={handleUpdate}>
        <div className="space-y-4">
          <div>
            <Label htmlFor="username" className="block mb-2">
              {t("admin-users.modal.username")}
            </Label>
            <Input
              name="username"
              type="text"
              placeholder={t("admin-users.modal.username-placeholder")}
              defaultValue={user.username}
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
              {t("admin-users.modal.email")}
            </Label>
            <Input
              name="email"
              type="email"
              placeholder={t("admin-users.modal.email-placeholder")}
              defaultValue={user.email ?? ""}
              maxLength={255}
              required={true}
              autoComplete="off"
            />
            <p className="mt-2 text-xs text-theme-text-secondary">
              {t("admin-users.modal.email-help-edit")}
            </p>
          </div>
          <div>
            <Label htmlFor="bio" className="block mb-2">
              {t("admin-users.modal.bio")}
            </Label>
            <Textarea
              name="bio"
              placeholder={t("admin-users.modal.bio-placeholder")}
              defaultValue={user.bio}
              autoComplete="off"
              rows={3}
            />
          </div>
          <div>
            <Label htmlFor="role" className="block mb-2">
              {t("admin-users.modal.role")}
            </Label>
            <Select
              name="role"
              required={true}
              value={role}
              onValueChange={setRole}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={t("admin-users.modal.role-placeholder")}
                >
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
          {error && (
            <p className="text-red-400 text-sm">
              {t("admin-users.modal.error", { error })}
            </p>
          )}
        </div>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" type="button" />}>
            {t("admin-users.modal.cancel")}
          </DialogClose>
          <Button variant="default" type="submit">
            {t("admin-users.modal.update")}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}

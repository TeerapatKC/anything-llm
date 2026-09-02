import { useTranslation } from "react-i18next";
import { useMemo, useState } from "react";
import { Search, Users } from "lucide-react";
import Admin from "@/models/admin";
import showToast from "@/utils/toast";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import useRoles from "@/hooks/useRoles";
import { PERMISSIONS, roleNamesWith } from "@/utils/permissions";

export default function AddMemberModal({ workspace, users = [] }) {
  const { t } = useTranslation();
  const { roles } = useRoles();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUsers, setSelectedUsers] = useState(workspace?.userIds || []);
  const [saving, setSaving] = useState(false);

  const allWorkspaceRoles = roleNamesWith(
    roles,
    PERMISSIONS.WORKSPACES_VIEW_ALL
  );
  const availableUsers = useMemo(
    () => users.filter((user) => !allWorkspaceRoles.includes(user.role)),
    [users, allWorkspaceRoles]
  );
  const filteredUsers = availableUsers.filter((user) =>
    user.username.toLowerCase().includes(searchTerm.trim().toLowerCase())
  );
  const filteredUserIds = filteredUsers.map((user) => user.id);
  const allFilteredSelected =
    filteredUserIds.length > 0 &&
    filteredUserIds.every((id) => selectedUsers.includes(id));

  const handleUpdate = async (event) => {
    event.preventDefault();
    setSaving(true);
    const { success, error } = await Admin.updateUsersInWorkspace(
      workspace.id,
      selectedUsers
    );
    setSaving(false);

    if (!success) {
      showToast(error || "Could not update workspace users.", "error");
      return;
    }

    showToast("Users updated successfully.", "success", { clear: true });
    setTimeout(() => window.location.reload(), 700);
  };

  const handleUserSelect = (userId) => {
    setSelectedUsers((current) =>
      current.includes(userId)
        ? current.filter((id) => id !== userId)
        : [...current, userId]
    );
  };

  const handleSelectAll = () => {
    setSelectedUsers((current) => {
      if (allFilteredSelected)
        return current.filter((id) => !filteredUserIds.includes(id));
      return [...new Set([...current, ...filteredUserIds])];
    });
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Manage workspace users</DialogTitle>
        <DialogDescription>
          Choose who can access {workspace?.name || "this workspace"}. Global
          administrators already have access and are not listed here.
        </DialogDescription>
      </DialogHeader>

      <form
        id="manage-workspace-users-form"
        onSubmit={handleUpdate}
        className="flex min-h-0 flex-col gap-4"
      >
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-theme-text-secondary" />
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="h-9 pl-9"
              placeholder={t("ui.search-users")}
              autoComplete="off"
            />
          </div>
          <div className="rounded-full bg-muted px-3 py-1.5 text-xs font-medium text-theme-text-secondary">
            {selectedUsers.length} selected
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border border-theme-sidebar-border">
          <div className="flex items-center justify-between border-b border-theme-sidebar-border bg-muted/50 px-3 py-2.5">
            <label className="flex cursor-pointer items-center gap-3 text-sm font-medium text-theme-text-primary">
              <Checkbox
                checked={allFilteredSelected}
                onCheckedChange={handleSelectAll}
                aria-label={t("ui.select-all-visible-users")}
              />
              <span>{searchTerm ? "Visible users" : "Available users"}</span>
            </label>
            <span className="text-xs text-theme-text-secondary">
              {filteredUsers.length} users
            </span>
          </div>

          <div className="thin-scrollbar max-h-[340px] min-h-[220px] overflow-y-auto p-2">
            {filteredUsers.length > 0 ? (
              <div className="flex flex-col gap-1">
                {filteredUsers.map((user) => {
                  const selected = selectedUsers.includes(user.id);
                  return (
                    <label
                      key={user.id}
                      className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 transition-colors hover:bg-muted/60"
                    >
                      <Checkbox
                        checked={selected}
                        onCheckedChange={() => handleUserSelect(user.id)}
                        aria-label={`Select ${user.username}`}
                      />
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-sidebar-accent text-[10px] font-semibold uppercase text-sidebar-foreground">
                        {user.username.slice(0, 2)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-theme-text-primary">
                          {user.username}
                        </span>
                        <span className="block truncate text-xs capitalize text-theme-text-secondary">
                          {user.role || "Member"}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            ) : (
              <div className="flex min-h-[220px] flex-col items-center justify-center gap-2 text-center">
                <span className="flex size-10 items-center justify-center rounded-full bg-muted text-theme-text-secondary">
                  <Users className="size-5" />
                </span>
                <p className="text-sm font-medium text-theme-text-primary">
                  No users found
                </p>
                <p className="text-xs text-theme-text-secondary">
                  Try a different search term.
                </p>
              </div>
            )}
          </div>
        </div>
      </form>

      <DialogFooter className="sm:justify-between">
        <Button
          type="button"
          variant="ghost"
          onClick={() => setSelectedUsers([])}
          disabled={selectedUsers.length === 0 || saving}
        >
          Clear selection
        </Button>
        <div className="flex items-center gap-2">
          <DialogClose render={<Button type="button" variant="outline" />}>
            Cancel
          </DialogClose>
          <Button
            type="submit"
            form="manage-workspace-users-form"
            disabled={saving}
          >
            {saving ? "Saving..." : "Save changes"}
          </Button>
        </div>
      </DialogFooter>
    </>
  );
}

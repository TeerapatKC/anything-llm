import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import SettingsLayout from "@/components/layout/SettingsLayout";
import PageHeader from "@/components/layout/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { UserPlus } from "lucide-react";
import Admin from "@/models/admin";
import UserRow from "./UserRow";
import useUser from "@/hooks/useUser";
import useRoles from "@/hooks/useRoles";
import { PERMISSIONS } from "@/utils/permissions";
import i18next from "@/i18n";
import NewUserModal from "./NewUserModal";
import { useModal } from "@/hooks/useModal";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import Toggle from "@/components/lib/Toggle";
import { Input } from "@/components/ui/input";
import GeneratedPasswordModal from "@/components/Modals/GeneratedPassword";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function AdminUsers() {
  const { t } = useTranslation();
  const { isOpen, openModal, closeModal } = useModal();
  const [createdUser, setCreatedUser] = useState(null);
  const { user: currUser } = useUser();
  const { roles, permissionLabels, loading: loadingRoles } = useRoles();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);

  const fetchUsers = async () => {
    const _users = await Admin.users();
    setUsers(_users || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleUserCreated = ({
    username,
    initialPassword,
    emailSent,
    email,
  }) => {
    closeModal();
    setCreatedUser({ username, initialPassword, emailSent, email });
  };

  const handlePasswordModalClose = () => {
    setCreatedUser(null);
    fetchUsers();
  };

  return (
    <SettingsLayout>
      <PageHeader
        title={t("admin-users.title")}
        description={t("admin-users.description")}
      />
      <Dialog
        open={isOpen}
        onOpenChange={(open) => (open ? openModal() : closeModal())}
      >
        <div className="w-full justify-end flex">
          <DialogTrigger render={<Button size="lg" className="mt-3 mb-4" />}>
            <UserPlus className="h-4 w-4" /> {t("admin-users.add-user")}
          </DialogTrigger>
        </div>
        <DialogContent>
          <NewUserModal closeModal={closeModal} onSuccess={handleUserCreated} />
        </DialogContent>
      </Dialog>
      <div className="overflow-x-auto">
        {loading || loadingRoles ? (
          <Skeleton
            height="80vh"
            width="100%"
            highlightColor="var(--theme-bg-primary)"
            baseColor="var(--theme-bg-secondary)"
            count={1}
            className="w-full p-4 rounded-b-2xl rounded-tr-2xl rounded-tl-sm mt-8"
            containerClassName="flex w-full"
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead scope="col">
                  {t("admin-users.table.username")}
                </TableHead>
                <TableHead scope="col">
                  {t("admin-users.table.email")}
                </TableHead>
                <TableHead scope="col">{t("admin-users.table.role")}</TableHead>
                <TableHead scope="col">
                  {t("admin-users.table.status")}
                </TableHead>
                <TableHead scope="col">
                  {t("admin-users.table.date-added")}
                </TableHead>
                <TableHead scope="col"> </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <UserRow
                  key={user.id}
                  currUser={currUser}
                  user={user}
                  roles={roles}
                  permissionLabels={permissionLabels}
                  fetchUsers={fetchUsers}
                />
              ))}
            </TableBody>
          </Table>
        )}
      </div>
      <GeneratedPasswordModal
        open={!!createdUser}
        username={createdUser?.username}
        password={createdUser?.initialPassword}
        emailSent={createdUser?.emailSent}
        recipientEmail={createdUser?.email}
        onClose={handlePasswordModalClose}
      />
    </SettingsLayout>
  );
}

export function roleOptionLabel(role) {
  const label = role?.displayName ?? role?.name ?? "";
  return role?.name === "default"
    ? `${label} ${i18next.t("admin-users.role-default-suffix")}`
    : label;
}

/**
 * Summarises what a role unlocks by listing the permissions it was ticked for, so the
 * person assigning it can see the consequences without leaving the modal.
 */
export function RoleHintDisplay({ role, roles = [], permissionLabels = {} }) {
  const { t } = useTranslation();
  const selected = roles.find((entry) => entry.name === role);
  const granted = selected?.permissions ?? [];
  const isSuperAdmin = granted.includes("system.admin");

  return (
    <div className="flex flex-col gap-y-1 py-1 pb-4">
      <p className="text-sm font-medium text-theme-text-primary">
        {t("admin-users.permissions.title")}
      </p>
      {selected?.description && (
        <p className="text-xs text-theme-text-secondary">
          {selected.description}
        </p>
      )}
      {isSuperAdmin ? (
        <p className="text-xs text-theme-text-secondary">
          {t("admin-users.permissions.all")}
        </p>
      ) : granted.length === 0 ? (
        <p className="text-xs text-theme-text-secondary">
          {t("admin-users.permissions.none")}
        </p>
      ) : (
        <ul className="flex flex-col gap-y-1 list-disc px-4 max-h-40 overflow-y-auto">
          {granted.map((permission) => (
            <li key={permission} className="text-xs text-theme-text-secondary">
              {permissionLabels[permission] ?? permission}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function MessageLimitInput({
  enabled,
  limit,
  updateState,
  role,
  roles = [],
}) {
  const { t } = useTranslation();
  // A role that bypasses the daily limit has nothing to configure here.
  const selected = roles.find((entry) => entry.name === role);
  if (selected?.permissions?.includes(PERMISSIONS.CHATS_UNLIMITED)) return null;
  return (
    <div className="mt-4 mb-8">
      <Toggle
        size="md"
        variant="horizontal"
        label={t("admin-users.message-limit.label")}
        description={t("admin-users.message-limit.description")}
        enabled={enabled}
        onChange={(checked) => {
          updateState((prev) => ({
            ...prev,
            enabled: checked,
          }));
        }}
      />
      {enabled && (
        <div className="mt-4">
          <label className="text-theme-text-primary text-sm font-semibold block mb-4">
            {t("admin-users.message-limit.limit-label")}
          </label>
          <div className="relative mt-2">
            <Input
              type="number"
              onScroll={(e) => e.target.blur()}
              onChange={(e) => {
                updateState({
                  enabled: true,
                  limit: Number(e?.target?.value || 0),
                });
              }}
              value={limit}
              min={1}
            />
          </div>
        </div>
      )}
    </div>
  );
}

import { useEffect, useState } from "react";
import SettingsLayout from "@/components/layout/SettingsLayout";
import PageHeader from "@/components/layout/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { UserPlus } from "lucide-react";
import Admin from "@/models/admin";
import UserRow from "./UserRow";
import useUser from "@/hooks/useUser";
import useRoles from "@/hooks/useRoles";
import { PERMISSIONS } from "@/utils/permissions";
import NewUserModal from "./NewUserModal";
import { useModal } from "@/hooks/useModal";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import Toggle from "@/components/lib/Toggle";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function AdminUsers() {
  const { isOpen, openModal, closeModal } = useModal();

  return (
    <SettingsLayout>
      <PageHeader
        title={"Users"}
        description={
          "These are all the accounts which have an account on this instance. Removing an account will instantly remove their access to this instance."
        }
      />
      <Dialog
        open={isOpen}
        onOpenChange={(open) => (open ? openModal() : closeModal())}
      >
        <div className="w-full justify-end flex">
          <DialogTrigger
            render={
              <Button size="lg" className="mt-3 mr-0 mb-4 md:-mb-6 z-10" />
            }
          >
            <UserPlus className="h-4 w-4" /> Add user
          </DialogTrigger>
        </div>
        <DialogContent>
          <NewUserModal />
        </DialogContent>
      </Dialog>
      <div className="overflow-x-auto">
        <UsersContainer />
      </div>
    </SettingsLayout>
  );
}

function UsersContainer() {
  const { user: currUser } = useUser();
  const { roles, permissionLabels, loading: loadingRoles } = useRoles();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    async function fetchUsers() {
      const _users = await Admin.users();
      setUsers(_users);
      setLoading(false);
    }
    fetchUsers();
  }, []);

  if (loading || loadingRoles) {
    return (
      <Skeleton
        height="80vh"
        width="100%"
        highlightColor="var(--theme-bg-primary)"
        baseColor="var(--theme-bg-secondary)"
        count={1}
        className="w-full p-4 rounded-b-2xl rounded-tr-2xl rounded-tl-sm mt-8"
        containerClassName="flex w-full"
      />
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead scope="col">Username</TableHead>
          <TableHead scope="col">Email</TableHead>
          <TableHead scope="col">Role</TableHead>
          <TableHead scope="col">Date Added</TableHead>
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
          />
        ))}
      </TableBody>
    </Table>
  );
}

/**
 * Summarises what a role unlocks by listing the permissions it was ticked for, so the
 * person assigning it can see the consequences without leaving the modal.
 */
export function RoleHintDisplay({ role, roles = [], permissionLabels = {} }) {
  const selected = roles.find((entry) => entry.name === role);
  const granted = selected?.permissions ?? [];
  const isSuperAdmin = granted.includes("system.admin");

  return (
    <div className="flex flex-col gap-y-1 py-1 pb-4">
      <p className="text-sm font-medium text-theme-text-primary">Permissions</p>
      {selected?.description && (
        <p className="text-xs text-theme-text-secondary">
          {selected.description}
        </p>
      )}
      {isSuperAdmin ? (
        <p className="text-xs text-theme-text-secondary">
          Holds every permission on the instance.
        </p>
      ) : granted.length === 0 ? (
        <p className="text-xs text-theme-text-secondary">
          No elevated permissions - can only chat in the workspaces they are
          added to.
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
  // A role that bypasses the daily limit has nothing to configure here.
  const selected = roles.find((entry) => entry.name === role);
  if (selected?.permissions?.includes(PERMISSIONS.CHATS_UNLIMITED)) return null;
  return (
    <div className="mt-4 mb-8">
      <Toggle
        size="md"
        variant="horizontal"
        label="Limit messages per day"
        description="Restrict this user to a number of successful queries or chats within a 24 hour window."
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
            Message limit per day
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

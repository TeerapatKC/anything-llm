import { useEffect, useState } from "react";
import SettingsLayout from "@/components/layout/SettingsLayout";
import PageHeader from "@/components/layout/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { Lock, Pencil, Plus, Star, Trash2 } from "lucide-react";
import Role, { WorkspaceRole } from "@/models/role";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import RoleModal from "./RoleModal";
import ConfirmDialog from "@/components/ConfirmDialog";
import showToast from "@/utils/toast";
import TableRowActions from "@/components/lib/TableRowActions";
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

/**
 * Roles live in two scopes that never overlap. System roles decide what an account can
 * do to the instance; workspace roles decide what it can do inside one workspace, and
 * are assigned per membership so the same person can differ between workspaces.
 */
export default function AdminRoles() {
  return (
    <SettingsLayout>
      <PageHeader
        title={"Roles & Permissions"}
        description={
          "A role is a named set of permissions. System roles control the instance itself; workspace roles control what a member can do inside a single workspace, so one account can be a manager of one workspace and read-only in another."
        }
      />

      <Tabs defaultValue="system" className="mt-6">
        <TabsList>
          <TabsTrigger value="system">System roles</TabsTrigger>
          <TabsTrigger value="workspace">Workspace roles</TabsTrigger>
        </TabsList>
        <TabsContent value="system">
          <RolesPanel scope="system" />
        </TabsContent>
        <TabsContent value="workspace">
          <RolesPanel scope="workspace" />
        </TabsContent>
      </Tabs>
    </SettingsLayout>
  );
}

/**
 * One scope's role table plus its editor. Both scopes behave the same way, they just
 * talk to a different API and a different half of the permission catalog.
 * @param {{scope: "system"|"workspace"}} props
 */
function RolesPanel({ scope }) {
  const isWorkspace = scope === "workspace";
  const api = isWorkspace ? WorkspaceRole : Role;

  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState([]);
  const [categories, setCategories] = useState([]);
  // null = closed, {} = creating, {...role} = editing
  const [editing, setEditing] = useState(null);
  // null = closed, {...config} = open
  const [confirm, setConfirm] = useState(null);

  async function reload() {
    const [{ roles: _roles }, { categories: _categories }] = await Promise.all([
      api.all(),
      Role.permissionCatalog(scope),
    ]);
    setRoles(_roles || []);
    setCategories(_categories || []);
    setLoading(false);
  }

  useEffect(() => {
    reload();
  }, [scope]);

  const holderLabel = isWorkspace ? "members" : "users";
  const holderCount = (role) =>
    isWorkspace ? (role.memberCount ?? 0) : (role.userCount ?? 0);

  async function handleDelete(role) {
    const count = holderCount(role);
    setConfirm({
      title: `Delete "${role.displayName}"?`,
      description:
        count > 0
          ? `${count} ${holderLabel} holding it will be moved to the default role.`
          : `No ${holderLabel} currently hold this role.`,
      confirmText: "Delete",
      variant: "destructive",
      onConfirm: async () => {
        const { success, error, reassigned } = await api.delete(role.id);
        if (!success) return showToast(error, "error", { clear: true });
        showToast(
          reassigned > 0
            ? `Role deleted. ${reassigned} ${holderLabel} moved to the default role.`
            : "Role deleted.",
          "success",
          { clear: true }
        );
        reload();
      },
    });
  }

  async function handleMakeDefault(role) {
    setConfirm({
      title: `Set "${role.displayName}" as default?`,
      description: "New members will automatically be assigned this role.",
      confirmText: "Set as default",
      variant: "default",
      onConfirm: async () => {
        const { error } = await WorkspaceRole.update(role.id, {
          isDefault: true,
        });
        if (error) return showToast(error, "error", { clear: true });
        showToast(
          `New members will now get the "${role.displayName}" role.`,
          "success",
          { clear: true }
        );
        reload();
      },
    });
  }

  return (
    <>
      <div className="w-full justify-end flex">
        <Button size="lg" className="mt-3 mb-4" onClick={() => setEditing({})}>
          <Plus className="h-4 w-4" /> New{" "}
          {isWorkspace ? "workspace role" : "role"}
        </Button>
      </div>

      <div className="overflow-x-auto">
        {loading ? (
          <Skeleton
            height="50vh"
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
                <TableHead scope="col">Role</TableHead>
                <TableHead scope="col">Permissions</TableHead>
                <TableHead scope="col">
                  {isWorkspace ? "Members" : "Users"}
                </TableHead>
                <TableHead scope="col"> </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roles.map((role) => (
                <TableRow key={role.id}>
                  <TableCell>
                    <div className="flex items-center gap-x-2">
                      <span className="text-theme-text-primary font-medium">
                        {role.displayName}
                      </span>
                      {role.isSystem && (
                        <Badge
                          variant="outline"
                          className="gap-x-1 text-[10px]"
                        >
                          <Lock className="h-3 w-3" /> Built-in
                        </Badge>
                      )}
                      {isWorkspace && !role.isSystem && (
                        <Badge
                          variant="outline"
                          className="gap-x-1 text-[10px]"
                        >
                          {role.workspace_id === null
                            ? "Shared"
                            : (`Workspace: ${role.workspace?.name}` ??
                              `Workspace #${role.workspace_id}`)}
                        </Badge>
                      )}
                      {role.isDefault && (
                        <Badge
                          variant="secondary"
                          className="gap-x-1 text-[10px]"
                        >
                          <Star className="h-3 w-3 fill-current" /> Default
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-theme-text-secondary mt-0.5">
                      {role.description || role.name}
                    </p>
                  </TableCell>
                  <TableCell className="text-theme-text-secondary">
                    {role.permissions.length}
                  </TableCell>
                  <TableCell className="text-theme-text-secondary">
                    {holderCount(role)}
                  </TableCell>
                  <TableCell className="text-right">
                    <TableRowActions>
                      {isWorkspace && !role.isDefault && (
                        <DropdownMenuItem
                          onClick={() => handleMakeDefault(role)}
                        >
                          Make default
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => setEditing(role)}>
                        <Pencil />
                        Edit
                      </DropdownMenuItem>
                      {!role.isSystem && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => handleDelete(role)}
                          >
                            <Trash2 />
                            Delete
                          </DropdownMenuItem>
                        </>
                      )}
                    </TableRowActions>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
      >
        <DialogContent size="xl">
          {editing !== null && (
            <RoleModal
              role={editing}
              scope={scope}
              categories={categories}
              onClose={() => setEditing(null)}
              onSaved={() => {
                setEditing(null);
                reload();
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog config={confirm} onClose={() => setConfirm(null)} />
    </>
  );
}

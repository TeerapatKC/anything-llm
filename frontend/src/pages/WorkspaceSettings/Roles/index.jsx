import { useEffect, useState } from "react";
import { Copy, Lock, Pencil, Plus, Trash2 } from "lucide-react";
import ConfirmDialog from "@/components/ConfirmDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Role, { WorkspaceRole } from "@/models/role";
import RoleModal from "@/pages/Admin/Roles/RoleModal";
import showToast from "@/utils/toast";
import TableRowActions from "@/components/lib/TableRowActions";
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

/**
 * Roles defined inside one workspace.
 *
 * The shared roles (Viewer, Contributor, ...) are defined instance-wide and are shown
 * here read-only - editing them from a workspace would silently change what every other
 * workspace means by that role. Roles created here belong to this workspace alone.
 */
export default function WorkspaceRoles({ workspace }) {
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [canDefine, setCanDefine] = useState(false);
  // null = closed, {} = creating, {...role} = editing
  const [editing, setEditing] = useState(null);
  // null = closed, {...config} = open
  const [confirm, setConfirm] = useState(null);

  async function reload() {
    const [{ roles: _roles, canDefineRoles }, { categories: _categories }] =
      await Promise.all([
        WorkspaceRole.forWorkspace(workspace.slug),
        Role.permissionCatalog("workspace"),
      ]);
    setRoles(_roles || []);
    setCanDefine(!!canDefineRoles);
    setCategories(_categories || []);
    setLoading(false);
  }

  useEffect(() => {
    reload();
  }, [workspace.slug]);

  async function handleDelete(role) {
    setConfirm({
      title: `Delete "${role.displayName}"?`,
      description:
        role.memberCount > 0
          ? `${role.memberCount} member(s) holding it will be moved to the default role.`
          : "No members currently hold this role.",
      confirmText: "Delete",
      variant: "destructive",
      onConfirm: async () => {
        const { success, error, reassigned } =
          await WorkspaceRole.deleteInWorkspace(workspace.slug, role.id);
        if (!success) return showToast(error, "error", { clear: true });
        showToast(
          reassigned > 0
            ? `Role deleted. ${reassigned} member(s) moved to the default role.`
            : "Role deleted.",
          "success",
          { clear: true }
        );
        reload();
      },
    });
  }

  /**
   * Shared roles cannot be edited here, so the way to get a tweaked version is to take
   * a copy that belongs to this workspace. Opens the editor in "create" mode with the
   * shared role's permissions already ticked.
   */
  function handleDuplicate(role) {
    setEditing({
      ...role,
      id: undefined,
      isSystem: false,
      isDefault: false,
      // Identifiers are capped at 32 characters server-side.
      name: `${role.name}-${workspace.slug}`.slice(0, 32).replace(/-+$/, ""),
      displayName: `${role.displayName} (${workspace.name})`.slice(0, 64),
      description: role.description,
    });
  }

  if (loading) {
    return (
      <Skeleton
        height="60vh"
        width="100%"
        highlightColor="var(--theme-bg-primary)"
        baseColor="var(--theme-bg-secondary)"
        count={1}
        className="w-full p-4 rounded-b-2xl rounded-tr-2xl rounded-tl-sm mt-6"
        containerClassName="flex w-full"
      />
    );
  }

  const shared = roles.filter((role) => !role.editableHere);
  const own = roles.filter((role) => role.editableHere);

  return (
    <div className="flex flex-col w-full">
      <div className="flex items-start justify-between gap-x-4">
        <p className="text-xs text-theme-text-secondary max-w-[640px]">
          Roles decide what each member may do in <b>{workspace.name}</b>. The
          shared roles below come from the instance settings and are the same
          everywhere; roles you create here exist only in this workspace.
        </p>
        {canDefine && (
          <Button size="lg" className="shrink-0" onClick={() => setEditing({})}>
            <Plus className="h-4 w-4" /> New role
          </Button>
        )}
      </div>

      <Table className="max-w-[760px] mt-6">
        <TableHeader className="leading-[18px] font-bold uppercase border-theme-sidebar-border/60">
          <TableRow>
            <TableHead scope="col">Role</TableHead>
            <TableHead scope="col">Permissions</TableHead>
            <TableHead scope="col">Members</TableHead>
            <TableHead scope="col"> </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {own.length === 0 && (
            <TableRow>
              <TableCell colSpan="4" className="text-theme-text-secondary">
                {workspace.name} has no roles of its own yet — every role below
                is shared with the rest of the instance.
                {canDefine &&
                  " Use “New role”, or duplicate a shared role, to add one that only applies here."}
              </TableCell>
            </TableRow>
          )}
          {[...own, ...shared].map((role) => (
            <TableRow key={role.id}>
              <TableCell>
                <div className="flex items-center gap-x-2">
                  <span className="font-medium">{role.displayName}</span>
                  {!role.editableHere && (
                    <Badge variant="outline" className="gap-x-1 text-[10px]">
                      <Lock className="h-3 w-3" /> Shared
                    </Badge>
                  )}
                  {role.isDefault && (
                    <Badge variant="secondary" className="text-[10px]">
                      Default
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-theme-text-secondary mt-0.5">
                  {role.description || role.name}
                </p>
                {!role.editableHere && (
                  <p className="text-xs text-theme-text-secondary/70 mt-1 italic">
                    Defined in instance settings and used by every workspace, so
                    it cannot be changed from here.
                    {canDefine &&
                      " Duplicate it to make a version you can edit."}
                  </p>
                )}
              </TableCell>
              <TableCell className="text-theme-text-secondary">
                {role.permissions.length}
              </TableCell>
              <TableCell className="text-theme-text-secondary">
                {role.memberCount}
              </TableCell>
              <TableCell className="text-right">
                <TableRowActions>
                  {canDefine && role.editableHere && (
                    <>
                      <DropdownMenuItem onClick={() => setEditing(role)}>
                        <Pencil />
                        Edit
                      </DropdownMenuItem>
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
                  {canDefine && !role.editableHere && (
                    <DropdownMenuItem onClick={() => handleDuplicate(role)}>
                      <Copy />
                      Duplicate
                    </DropdownMenuItem>
                  )}
                </TableRowActions>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
      >
        <DialogContent size="xl">
          {editing !== null && (
            <RoleModal
              role={editing}
              scope="workspace"
              workspaceSlug={workspace.slug}
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
    </div>
  );
}

import { useEffect, useState } from "react";
import Sidebar from "@/components/SettingsSidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, PencilSimple, Trash, Lock } from "@phosphor-icons/react";
import Role from "@/models/role";
import CTAButton from "@/components/lib/CTAButton";
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
import RoleModal from "./RoleModal";
import showToast from "@/utils/toast";

export default function AdminRoles() {
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState([]);
  const [categories, setCategories] = useState([]);
  // null = closed, {} = creating, {...role} = editing
  const [editing, setEditing] = useState(null);

  async function reload() {
    const [{ roles: _roles }, { categories: _categories }] = await Promise.all([
      Role.all(),
      Role.permissionCatalog(),
    ]);
    setRoles(_roles || []);
    setCategories(_categories || []);
    setLoading(false);
  }

  useEffect(() => {
    reload();
  }, []);

  async function handleDelete(role) {
    if (
      !window.confirm(
        `Delete the "${role.displayName}" role?\n\n${
          role.userCount > 0
            ? `${role.userCount} user(s) holding it will be moved to the Member role.`
            : "No users currently hold this role."
        }`
      )
    )
      return;

    const { success, error, reassigned } = await Role.delete(role.id);
    if (!success) return showToast(error, "error", { clear: true });
    showToast(
      reassigned > 0
        ? `Role deleted. ${reassigned} user(s) moved to the Member role.`
        : "Role deleted.",
      "success",
      { clear: true }
    );
    reload();
  }

  return (
    <div className="w-screen h-screen overflow-hidden bg-theme-bg-container flex">
      <Sidebar />
      <div
        style={{ height: "100%" }}
        className="relative bg-theme-bg-secondary w-full h-full overflow-y-scroll p-4 md:p-0"
      >
        <div className="flex flex-col w-full px-1 md:pl-6 md:pr-[50px] md:py-6 py-16">
          <div className="w-full flex flex-col gap-y-1 pb-6 border-white/10 border-b-2">
            <div className="items-center flex gap-x-4">
              <p className="text-lg leading-6 font-bold text-theme-text-primary">
                Roles &amp; Permissions
              </p>
            </div>
            <p className="text-xs leading-[18px] font-base text-theme-text-secondary">
              A role is a named set of permissions. Create your own roles and
              tick exactly what they unlock — every user gets their abilities
              from the role they hold.
            </p>
          </div>

          <div className="w-full justify-end flex">
            <CTAButton
              className="mt-3 mr-0 mb-4 md:-mb-6 z-10"
              onClick={() => setEditing({})}
            >
              <Plus className="h-4 w-4" weight="bold" /> New role
            </CTAButton>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <Skeleton
                height="60vh"
                width="100%"
                highlightColor="var(--theme-bg-primary)"
                baseColor="var(--theme-bg-secondary)"
                count={1}
                className="w-full p-4 rounded-b-2xl rounded-tr-2xl rounded-tl-sm mt-8"
                containerClassName="flex w-full"
              />
            ) : (
              <Table variant="settings">
                <TableHeader variant="settings">
                  <TableRow variant="none">
                    <TableHead
                      variant="none"
                      scope="col"
                      className="px-6 py-3 rounded-tl-lg"
                    >
                      Role
                    </TableHead>
                    <TableHead variant="none" scope="col" className="px-6 py-3">
                      Permissions
                    </TableHead>
                    <TableHead variant="none" scope="col" className="px-6 py-3">
                      Users
                    </TableHead>
                    <TableHead
                      variant="none"
                      scope="col"
                      className="px-6 py-3 rounded-tr-lg"
                    >
                      {" "}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody variant="none">
                  {roles.map((role) => (
                    <TableRow key={role.id} variant="settings">
                      <TableCell className="px-6 py-4">
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
                        </div>
                        <p className="text-xs text-theme-text-secondary mt-0.5">
                          {role.description || role.name}
                        </p>
                      </TableCell>
                      <TableCell className="px-6 py-4 text-theme-text-secondary">
                        {role.permissions.length}
                      </TableCell>
                      <TableCell className="px-6 py-4 text-theme-text-secondary">
                        {role.userCount}
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <div className="flex items-center gap-x-2 justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditing(role)}
                          >
                            <PencilSimple className="h-4 w-4" /> Edit
                          </Button>
                          {!role.isSystem && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-400 hover:text-red-300"
                              onClick={() => handleDelete(role)}
                            >
                              <Trash className="h-4 w-4" /> Delete
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>
      </div>

      <Dialog
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
      >
        <DialogContent className="max-w-3xl bg-theme-bg-secondary border-theme-modal-border">
          {editing !== null && (
            <RoleModal
              role={editing}
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
    </div>
  );
}

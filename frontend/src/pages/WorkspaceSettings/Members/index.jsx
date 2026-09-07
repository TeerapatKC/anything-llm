import { useModal } from "@/hooks/useModal";
import { useTranslation } from "react-i18next";
import Admin from "@/models/admin";
import { useCallback, useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import AddMemberModal from "./AddMemberModal";
import WorkspaceMemberRow from "./WorkspaceMemberRow";
import { Button } from "@/components/ui/button";
import Role, { WorkspaceRole } from "@/models/role";
import { WORKSPACE_PERMISSIONS as WS, workspaceCan } from "@/utils/permissions";
import useUser from "@/hooks/useUser";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableEmptyRow,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UserPlus } from "lucide-react";
import WorkspaceSettingsSectionHeader from "@/components/layout/WorkspaceSettingsSectionHeader";

export default function Members({ workspace }) {
  const { t } = useTranslation();
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [members, setMembers] = useState([]);
  const [workspaceRoles, setWorkspaceRoles] = useState([]);
  const [systemRoles, setSystemRoles] = useState([]);
  const [adminWorkspace, setAdminWorkspace] = useState(null);

  const canManageMembers = workspaceCan(
    WS.MEMBERS_MANAGE,
    workspace?.slug,
    user
  );
  const { isOpen, openModal, closeModal } = useModal();

  const fetchData = useCallback(async () => {
    const [
      _users,
      { members: _members },
      { roles },
      adminWorkspaces,
      { roles: _systemRoles },
    ] = await Promise.all([
      Admin.users(),
      WorkspaceRole.members(workspace.slug),
      WorkspaceRole.all(),
      Admin.workspaces(),
      // Only to put a display name on each member's instance-wide role; the raw
      // role identifier stands in if this is not readable by the viewer.
      Role.all(),
    ]);
    setAdminWorkspace(
      adminWorkspaces.find(
        (adminWorkspace) => adminWorkspace.id === workspace.id
      )
    );
    setMembers(_members || []);
    setWorkspaceRoles(roles || []);
    setSystemRoles(_systemRoles || []);
    setUsers(_users);
    setLoading(false);
  }, [workspace]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Refetching beats the page reload this used to do: the table is the only thing
  // the save changed, and reloading threw away the rest of the settings screen.
  async function handleMembersSaved() {
    closeModal();
    await fetchData();
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => (open ? openModal() : closeModal())}
    >
      <div className="flex w-full flex-col gap-y-4 px-1">
        <WorkspaceSettingsSectionHeader
          title={t("workspace-members.title")}
          description={t("workspace-members.description", {
            workspace: workspace.name,
          })}
          actions={
            <DialogTrigger
              render={
                <Button size="lg" disabled={loading || !adminWorkspace} />
              }
            >
              <UserPlus className="mr-1.5 size-4" />
              {t("workspace-members.manage-users")}
            </DialogTrigger>
          }
        />
        {loading ? (
          <Skeleton
            height="80vh"
            width="100%"
            highlightColor="var(--theme-bg-primary)"
            baseColor="var(--theme-bg-secondary)"
            count={1}
            className="w-full rounded-lg p-4"
            containerClassName="flex w-full"
          />
        ) : (
          <Table className="text-left">
            <TableHeader className="leading-[18px] font-bold uppercase border-theme-sidebar-border/60">
              <TableRow>
                <TableHead scope="col">
                  {t("workspace-members.table.username")}
                </TableHead>
                <TableHead scope="col">
                  {t("workspace-members.table.role")}
                </TableHead>
                <TableHead scope="col">
                  {t("workspace-members.table.system-role")}
                </TableHead>
                <TableHead scope="col">
                  {t("workspace-members.table.date-added")}
                </TableHead>
                <TableHead scope="col"> </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.length > 0 ? (
                members.map((member) => (
                  <WorkspaceMemberRow
                    key={member.user_id}
                    member={member}
                    workspaceSlug={workspace.slug}
                    workspaceRoles={workspaceRoles}
                    systemRoles={systemRoles}
                    canManage={canManageMembers}
                  />
                ))
              ) : (
                <TableEmptyRow colSpan="5">
                  {t("workspace-members.empty")}
                </TableEmptyRow>
              )}
            </TableBody>
          </Table>
        )}
      </div>
      <DialogContent size="lg">
        <AddMemberModal
          users={users}
          workspace={adminWorkspace}
          onSaved={handleMembersSaved}
        />
      </DialogContent>
    </Dialog>
  );
}

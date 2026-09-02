import { useModal } from "@/hooks/useModal";
import { useTranslation } from "react-i18next";
import Admin from "@/models/admin";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import AddMemberModal from "./AddMemberModal";
import WorkspaceMemberRow from "./WorkspaceMemberRow";
import { Button } from "@/components/ui/button";
import { WorkspaceRole } from "@/models/role";
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
  const [adminWorkspace, setAdminWorkspace] = useState(null);

  const canManageMembers = workspaceCan(
    WS.MEMBERS_MANAGE,
    workspace?.slug,
    user
  );
  const { isOpen, openModal, closeModal } = useModal();

  useEffect(() => {
    async function fetchData() {
      const [_users, { members: _members }, { roles }, adminWorkspaces] =
        await Promise.all([
          Admin.users(),
          WorkspaceRole.members(workspace.slug),
          WorkspaceRole.all(),
          Admin.workspaces(),
        ]);
      setAdminWorkspace(
        adminWorkspaces.find(
          (adminWorkspace) => adminWorkspace.id === workspace.id
        )
      );
      setMembers(_members || []);
      setWorkspaceRoles(roles || []);
      setUsers(_users);
      setLoading(false);
    }
    fetchData();
  }, [workspace]);

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
                    canManage={canManageMembers}
                  />
                ))
              ) : (
                <TableEmptyRow colSpan="4">
                  {t("workspace-members.empty")}
                </TableEmptyRow>
              )}
            </TableBody>
          </Table>
        )}
      </div>
      <DialogContent size="lg">
        <AddMemberModal users={users} workspace={adminWorkspace} />
      </DialogContent>
    </Dialog>
  );
}

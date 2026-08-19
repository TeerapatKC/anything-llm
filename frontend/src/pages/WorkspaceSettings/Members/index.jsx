import { useModal } from "@/hooks/useModal";
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

export default function Members({ workspace }) {
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

  if (loading) {
    return (
      <Skeleton
        height="80vh"
        width="100%"
        highlightColor="var(--theme-bg-primary)"
        baseColor="var(--theme-bg-secondary)"
        count={1}
        className="w-full p-4 rounded-b-2xl rounded-tr-2xl rounded-tl-sm mt-6"
        containerClassName="flex w-full"
      />
    );
  }

  return (
    <div className="flex justify-between -mt-3">
      <Table className="w-full max-w-[700px] text-sm text-left rounded-lg">
        <TableHeader className="text-theme-text-primary text-opacity-80 text-xs leading-[18px] font-bold uppercase border-theme-sidebar-border border-b border-opacity-60">
          <TableRow>
            <TableHead scope="col" className="px-6 py-3 rounded-tl-lg">
              Username
            </TableHead>
            <TableHead scope="col" className="px-6 py-3">
              Workspace role
            </TableHead>
            <TableHead scope="col" className="px-6 py-3">
              Date Added
            </TableHead>
            <TableHead scope="col" className="px-6 py-3 rounded-tr-lg">
              {" "}
            </TableHead>
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
            <TableEmptyRow colSpan="4">No workspace members</TableEmptyRow>
          )}
        </TableBody>
      </Table>
      <Dialog
        open={isOpen}
        onOpenChange={(open) => (open ? openModal() : closeModal())}
      >
        <DialogTrigger render={<Button className="-mr-8" size="lg" />}>
          Manage Users
        </DialogTrigger>
        <DialogContent className="max-w-[550px] bg-theme-bg-secondary border-theme-modal-border p-0 overflow-hidden">
          <AddMemberModal users={users} workspace={adminWorkspace} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

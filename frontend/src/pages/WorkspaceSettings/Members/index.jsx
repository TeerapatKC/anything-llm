import ModalWrapper from "@/components/ModalWrapper";
import { useModal } from "@/hooks/useModal";
import Admin from "@/models/admin";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import AddMemberModal from "./AddMemberModal";
import WorkspaceMemberRow from "./WorkspaceMemberRow";
import CTAButton from "@/components/lib/CTAButton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function Members({ workspace }) {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [workspaceUsers, setWorkspaceUsers] = useState([]);
  const [adminWorkspace, setAdminWorkspace] = useState(null);

  const { isOpen, openModal, closeModal } = useModal();
  useEffect(() => {
    async function fetchData() {
      const _users = await Admin.users();
      const workspaceUsers = await Admin.workspaceUsers(workspace.id);
      const adminWorkspaces = await Admin.workspaces();
      setAdminWorkspace(
        adminWorkspaces.find(
          (adminWorkspace) => adminWorkspace.id === workspace.id
        )
      );
      setWorkspaceUsers(workspaceUsers);
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
      <Table
        variant="none"
        className="w-full max-w-[700px] text-sm text-left rounded-lg"
      >
        <TableHeader
          variant="none"
          className="text-white text-opacity-80 text-xs leading-[18px] font-bold uppercase border-white/10 border-b border-opacity-60"
        >
          <TableRow variant="none">
            <TableHead
              variant="none"
              scope="col"
              className="px-6 py-3 rounded-tl-lg"
            >
              Username
            </TableHead>
            <TableHead variant="none" scope="col" className="px-6 py-3">
              Role
            </TableHead>
            <TableHead variant="none" scope="col" className="px-6 py-3">
              Date Added
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
          {workspaceUsers.length > 0 ? (
            workspaceUsers.map((user, index) => (
              <WorkspaceMemberRow key={index} user={user} />
            ))
          ) : (
            <TableRow variant="none">
              <TableCell
                variant="none"
                className="text-center py-4 text-white/80"
                colSpan="4"
              >
                No workspace members
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      <CTAButton onClick={openModal}>Manage Users</CTAButton>
      <ModalWrapper isOpen={isOpen}>
        <AddMemberModal
          closeModal={closeModal}
          users={users}
          workspace={adminWorkspace}
        />
      </ModalWrapper>
    </div>
  );
}

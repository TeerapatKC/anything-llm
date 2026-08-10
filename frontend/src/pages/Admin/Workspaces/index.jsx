import { useEffect, useState } from "react";
import Sidebar from "@/components/SettingsSidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen } from "@phosphor-icons/react";
import Admin from "@/models/admin";
import System from "@/models/system";
import WorkspaceRow from "./WorkspaceRow";
import NewWorkspaceModal from "./NewWorkspaceModal";
import { useModal } from "@/hooks/useModal";
import ModalWrapper from "@/components/ModalWrapper";
import CTAButton from "@/components/lib/CTAButton";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function AdminWorkspaces() {
  const { isOpen, openModal, closeModal } = useModal();

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
                Instance Workspaces
              </p>
            </div>
            <p className="text-xs leading-[18px] font-base text-theme-text-secondary">
              These are all the workspaces that exist on this instance. Removing
              a workspace will delete all of its associated chats and settings.
            </p>
          </div>
          <div className="w-full justify-end flex">
            <CTAButton
              onClick={openModal}
              className="mt-3 mr-0 mb-4 md:-mb-14 z-10"
            >
              <BookOpen className="h-4 w-4" weight="bold" /> New Workspace
            </CTAButton>
          </div>
          <div className="overflow-x-auto">
            <WorkspacesContainer />
          </div>
        </div>
        <ModalWrapper isOpen={isOpen}>
          <NewWorkspaceModal closeModal={closeModal} />
        </ModalWrapper>
      </div>
    </div>
  );
}

function WorkspacesContainer() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [workspaces, setWorkspaces] = useState([]);
  const [deletionProtected, setDeletionProtected] = useState(false);

  useEffect(() => {
    async function fetchData() {
      const [_users, _workspaces, _settings] = await Promise.all([
        Admin.users(),
        Admin.workspaces(),
        System.keys(),
      ]);
      setUsers(_users);
      setWorkspaces(_workspaces);
      setDeletionProtected(_settings?.WorkspaceDeletionProtection === true);
      setLoading(false);
    }
    fetchData();
  }, []);

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
    <Table
      variant="none"
      className="w-full text-xs text-left rounded-lg mt-6 min-w-[640px] border-spacing-0"
    >
      <TableHeader variant="settings">
        <TableRow variant="none">
          <TableHead
            variant="none"
            scope="col"
            className="px-6 py-3 rounded-tl-lg"
          >
            Name
          </TableHead>
          <TableHead variant="none" scope="col" className="px-6 py-3">
            Link
          </TableHead>
          <TableHead variant="none" scope="col" className="px-6 py-3">
            Users
          </TableHead>
          <TableHead variant="none" scope="col" className="px-6 py-3">
            Created On
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
        {workspaces.map((workspace) => (
          <WorkspaceRow
            key={workspace.id}
            workspace={workspace}
            users={users}
            deletionProtected={deletionProtected}
          />
        ))}
      </TableBody>
    </Table>
  );
}

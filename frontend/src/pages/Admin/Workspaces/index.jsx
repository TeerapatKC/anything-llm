import { useEffect, useState } from "react";
import SettingsLayout from "@/components/layout/SettingsLayout";
import PageHeader from "@/components/layout/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen } from "lucide-react";
import Admin from "@/models/admin";
import System from "@/models/system";
import WorkspaceRow from "./WorkspaceRow";
import NewWorkspaceModal from "./NewWorkspaceModal";
import { useModal } from "@/hooks/useModal";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
    <SettingsLayout>
      <PageHeader
        title={"Instance Workspaces"}
        description={
          "These are all the workspaces that exist on this instance. Removing a workspace will delete all of its associated chats and settings."
        }
      />
      <div className="w-full justify-end flex">
        <Dialog
          open={isOpen}
          onOpenChange={(open) => (open ? openModal() : closeModal())}
        >
          <DialogTrigger
            render={
              <Button size="lg" className="mt-3 mr-0 mb-4 md:-mb-14 z-10" />
            }
          >
            <BookOpen className="h-4 w-4" /> New Workspace
          </DialogTrigger>
          <DialogContent className="max-w-2xl bg-theme-bg-secondary border-theme-modal-border">
            <NewWorkspaceModal />
          </DialogContent>
        </Dialog>
      </div>
      <div className="overflow-x-auto">
        <WorkspacesContainer />
      </div>
    </SettingsLayout>
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
    <Table className="w-full text-xs text-left rounded-lg mt-6 min-w-[640px] border-spacing-0">
      <TableHeader>
        <TableRow>
          <TableHead scope="col" className="px-6 py-3 rounded-tl-lg">
            Name
          </TableHead>
          <TableHead scope="col" className="px-6 py-3">
            Link
          </TableHead>
          <TableHead scope="col" className="px-6 py-3">
            Users
          </TableHead>
          <TableHead scope="col" className="px-6 py-3">
            Status
          </TableHead>
          <TableHead scope="col" className="px-6 py-3">
            Created On
          </TableHead>
          <TableHead scope="col" className="px-6 py-3 rounded-tr-lg">
            {" "}
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
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

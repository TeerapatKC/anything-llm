import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import SettingsLayout from "@/components/layout/SettingsLayout";
import PageHeader from "@/components/layout/PageHeader";
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
  TableEmptyRow,
  TableHead,
  TableHeader,
  TableLoadingRow,
  TableRow,
} from "@/components/ui/table";

export default function AdminWorkspaces() {
  const { t } = useTranslation();
  const { isOpen, openModal, closeModal } = useModal();
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

  return (
    <SettingsLayout>
      <PageHeader
        title={t("settings-page.workspaces.title")}
        description={t("settings-page.workspaces.description")}
      />
      <div className="w-full justify-end flex">
        <Dialog
          open={isOpen}
          onOpenChange={(open) => (open ? openModal() : closeModal())}
        >
          <DialogTrigger
            render={
              <Button size="lg" className="mt-3 mb-4" disabled={loading} />
            }
          >
            <BookOpen className="h-4 w-4" /> New Workspace
          </DialogTrigger>
          <DialogContent>
            <NewWorkspaceModal />
          </DialogContent>
        </Dialog>
      </div>
      <div className="overflow-x-auto">
        <Table containerClassName="mt-6" className="text-left min-w-[640px]">
          <TableHeader>
            <TableRow>
              <TableHead scope="col">
                {t("admin-workspaces.table.name")}
              </TableHead>
              <TableHead scope="col">
                {t("admin-workspaces.table.link")}
              </TableHead>
              <TableHead scope="col">
                {t("admin-workspaces.table.users")}
              </TableHead>
              <TableHead scope="col">
                {t("admin-workspaces.table.status")}
              </TableHead>
              <TableHead scope="col">
                {t("admin-workspaces.table.created-on")}
              </TableHead>
              <TableHead scope="col"> </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableLoadingRow colSpan={6} />
            ) : workspaces.length === 0 ? (
              <TableEmptyRow colSpan={6}>
                {t("admin-workspaces.empty", "No workspaces found")}
              </TableEmptyRow>
            ) : (
              workspaces.map((workspace) => (
                <WorkspaceRow
                  key={workspace.id}
                  workspace={workspace}
                  users={users}
                  deletionProtected={deletionProtected}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </SettingsLayout>
  );
}

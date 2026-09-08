import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import SettingsLayout from "@/components/layout/SettingsLayout";
import PageHeader from "@/components/layout/PageHeader";
import { Mail } from "lucide-react";
import Admin from "@/models/admin";
import InviteRow from "./InviteRow";
import NewInviteModal from "./NewInviteModal";
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

export default function AdminInvites() {
  const { t } = useTranslation();
  const { isOpen, openModal, closeModal } = useModal();
  const [loading, setLoading] = useState(true);
  const [invites, setInvites] = useState([]);

  const fetchInvites = async () => {
    const _invites = await Admin.invites();
    setInvites(_invites);
    setLoading(false);
  };

  useEffect(() => {
    fetchInvites();
  }, []);

  return (
    <SettingsLayout>
      <PageHeader
        title={t("admin-invites.title")}
        description={t("admin-invites.description")}
      />
      <Dialog
        open={isOpen}
        onOpenChange={(open) => (open ? openModal() : closeModal())}
      >
        <div className="w-full justify-end flex">
          <DialogTrigger
            render={
              <Button size="lg" className="mt-3 mb-4" disabled={loading} />
            }
          >
            <Mail className="h-4 w-4" /> {t("admin-invites.create-link")}
          </DialogTrigger>
        </div>
        <DialogContent>
          <NewInviteModal onSuccess={fetchInvites} />
        </DialogContent>
      </Dialog>
      <div className="overflow-x-auto mt-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">
                {t("admin-invites.table.status")}
              </TableHead>
              <TableHead scope="col">
                {t("admin-invites.table.email")}
              </TableHead>
              <TableHead scope="col">
                {t("admin-invites.table.accepted-by")}
              </TableHead>
              <TableHead scope="col">
                {t("admin-invites.table.created-by")}
              </TableHead>
              <TableHead scope="col">
                {t("admin-invites.table.created")}
              </TableHead>
              <TableHead scope="col"> </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableLoadingRow colSpan={6} />
            ) : invites.length === 0 ? (
              <TableEmptyRow
                colSpan="6"
                description={t("admin-invites.empty-description")}
              >
                {t("admin-invites.empty")}
              </TableEmptyRow>
            ) : (
              invites.map((invite) => (
                <InviteRow key={invite.id} invite={invite} />
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </SettingsLayout>
  );
}

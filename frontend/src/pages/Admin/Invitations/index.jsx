import { useEffect, useState } from "react";
import SettingsLayout from "@/components/layout/SettingsLayout";
import PageHeader from "@/components/layout/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
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
  TableRow,
} from "@/components/ui/table";

export default function AdminInvites() {
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
        title={"Invitations"}
        description={
          "Create invitation links for people in your organization to accept and sign up with. Invitations can only be used by a single user."
        }
      />
      <Dialog
        open={isOpen}
        onOpenChange={(open) => (open ? openModal() : closeModal())}
      >
        <div className="w-full justify-end flex">
          <DialogTrigger
            render={
              <Button size="lg" className="mt-3 mr-0 mb-4 md:-mb-12 z-10" />
            }
          >
            <Mail className="h-4 w-4" /> Create Invite Link
          </DialogTrigger>
        </div>
        <DialogContent className="max-w-2xl bg-theme-bg-secondary border-theme-modal-border">
          <NewInviteModal onSuccess={fetchInvites} />
        </DialogContent>
      </Dialog>
      <div className="overflow-x-auto mt-6">
        {loading ? (
          <Skeleton
            height="80vh"
            width="100%"
            highlightColor="var(--theme-bg-primary)"
            baseColor="var(--theme-bg-secondary)"
            count={1}
            className="w-full p-4 rounded-b-2xl rounded-tr-2xl rounded-tl-sm"
            containerClassName="flex w-full"
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead scope="col" className="px-6 py-3 rounded-tl-lg">
                  Status
                </TableHead>
                <TableHead scope="col" className="px-6 py-3">
                  Accepted By
                </TableHead>
                <TableHead scope="col" className="px-6 py-3">
                  Created By
                </TableHead>
                <TableHead scope="col" className="px-6 py-3">
                  Created
                </TableHead>
                <TableHead scope="col" className="px-6 py-3 rounded-tr-lg">
                  {" "}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invites.length === 0 ? (
                <TableEmptyRow
                  colSpan="5"
                  description="Create a link to invite someone to this instance."
                >
                  No invitations yet
                </TableEmptyRow>
              ) : (
                invites.map((invite) => (
                  <InviteRow key={invite.id} invite={invite} />
                ))
              )}
            </TableBody>
          </Table>
        )}
      </div>
    </SettingsLayout>
  );
}

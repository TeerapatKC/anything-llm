import { useEffect, useState } from "react";
import Sidebar from "@/components/SettingsSidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { EnvelopeSimple } from "@phosphor-icons/react";
import Admin from "@/models/admin";
import InviteRow from "./InviteRow";
import NewInviteModal from "./NewInviteModal";
import { useModal } from "@/hooks/useModal";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import CTAButton from "@/components/lib/CTAButton";
import {
  Table,
  TableBody,
  TableCell,
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
                Invitations
              </p>
            </div>
            <p className="text-xs leading-[18px] font-base text-theme-text-secondary mt-2">
              Create invitation links for people in your organization to accept
              and sign up with. Invitations can only be used by a single user.
            </p>
          </div>
          <Dialog
            open={isOpen}
            onOpenChange={(open) => (open ? openModal() : closeModal())}
          >
            <div className="w-full justify-end flex">
              <DialogTrigger asChild>
                <CTAButton className="mt-3 mr-0 mb-4 md:-mb-12 z-10">
                  <EnvelopeSimple className="h-4 w-4" weight="bold" /> Create
                  Invite Link
                </CTAButton>
              </DialogTrigger>
            </div>
            <DialogContent className="max-w-2xl bg-theme-bg-secondary border-theme-modal-border">
              <NewInviteModal
                closeModal={closeModal}
                onSuccess={fetchInvites}
              />
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
              <Table variant="settings">
                <TableHeader variant="settings">
                  <TableRow variant="none">
                    <TableHead
                      variant="none"
                      scope="col"
                      className="px-6 py-3 rounded-tl-lg"
                    >
                      Status
                    </TableHead>
                    <TableHead variant="none" scope="col" className="px-6 py-3">
                      Accepted By
                    </TableHead>
                    <TableHead variant="none" scope="col" className="px-6 py-3">
                      Created By
                    </TableHead>
                    <TableHead variant="none" scope="col" className="px-6 py-3">
                      Created
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
                  {invites.length === 0 ? (
                    <TableRow variant="settings">
                      <TableCell
                        variant="none"
                        colSpan="5"
                        className="px-6 py-4 text-center"
                      >
                        No invitations found
                      </TableCell>
                    </TableRow>
                  ) : (
                    invites.map((invite) => (
                      <InviteRow key={invite.id} invite={invite} />
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

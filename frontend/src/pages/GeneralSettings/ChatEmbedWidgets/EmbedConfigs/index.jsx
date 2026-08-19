import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Skeleton } from "@/components/ui/skeleton";
import { Code } from "lucide-react";
import EmbedRow from "./EmbedRow";
import NewEmbedModal from "./NewEmbedModal";
import { useModal } from "@/hooks/useModal";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import Embed from "@/models/embed";
import CTAButton from "@/components/lib/CTAButton";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function EmbedConfigsView() {
  const { isOpen, openModal, closeModal } = useModal();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [embeds, setEmbeds] = useState([]);

  useEffect(() => {
    async function fetchUsers() {
      const _embeds = await Embed.embeds();
      setEmbeds(_embeds);
      setLoading(false);
    }
    fetchUsers();
  }, []);

  if (loading) {
    return (
      <Skeleton
        height="80vh"
        width="100%"
        highlightColor="var(--theme-bg-primary)"
        baseColor="var(--theme-bg-secondary)"
        count={1}
        className="w-full p-4 rounded-b-2xl rounded-tr-2xl rounded-tl-sm"
        containerClassName="flex w-full"
      />
    );
  }

  return (
    <div className="flex flex-col w-full p-4">
      <div className="w-full flex flex-col gap-y-1 pb-6">
        <div className="items-center flex gap-x-4">
          <p className="text-lg leading-6 font-bold text-theme-text-primary">
            {t("embeddable.title")}
          </p>
        </div>

        <div className="flex gap-x-10 mr-8">
          <p className="text-xs leading-[18px] font-base text-theme-text-secondary mt-2">
            {t("embeddable.description")}
          </p>

          <Dialog
            open={isOpen}
            onOpenChange={(open) => (open ? openModal() : closeModal())}
          >
            <DialogTrigger asChild>
              <CTAButton className="text-theme-bg-chat">
                <Code className="h-4 w-4" /> {t("embeddable.create")}
              </CTAButton>
            </DialogTrigger>
            <DialogContent className="max-w-2xl bg-theme-bg-secondary border-theme-modal-border">
              <NewEmbedModal />
            </DialogContent>
          </Dialog>
        </div>
      </div>
      <div className="overflow-x-auto">
        <Table variant="settings">
          <TableHeader
            variant="none"
            className="text-theme-text-secondary text-xs leading-[18px] uppercase border-theme-sidebar-border border-b"
          >
            <TableRow variant="none">
              <TableHead variant="none" scope="col" className="px-6 py-3">
                {t("embeddable.table.workspace")}
              </TableHead>
              <TableHead variant="none" scope="col" className="px-6 py-3">
                {t("embeddable.table.chats")}
              </TableHead>
              <TableHead variant="none" scope="col" className="px-6 py-3">
                {t("embeddable.table.active")}
              </TableHead>
              <TableHead variant="none" scope="col" className="px-6 py-3">
                {t("embeddable.table.created")}
              </TableHead>
              <TableHead variant="none" scope="col" className="px-6 py-3">
                {" "}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody variant="none">
            {embeds.map((embed) => (
              <EmbedRow key={embed.id} embed={embed} />
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Code } from "lucide-react";
import EmbedRow from "./EmbedRow";
import NewEmbedModal from "./NewEmbedModal";
import { useModal } from "@/hooks/useModal";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import Embed from "@/models/embed";
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

  return (
    <div className="flex flex-col w-full p-4">
      <div className="w-full flex flex-col gap-y-1 pb-6">
        <div className="items-center flex gap-x-4">
          <p className="text-lg leading-6 font-bold text-theme-text-primary">
            {t("embeddable.title")}
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <p className="mt-2 max-w-2xl text-xs leading-[18px] font-base text-theme-text-secondary">
            {t("embeddable.description")}
          </p>

          <Dialog
            open={isOpen}
            onOpenChange={(open) => (open ? openModal() : closeModal())}
          >
            <DialogTrigger
              render={
                <Button
                  size="lg"
                  className="text-theme-bg-chat"
                  disabled={loading}
                />
              }
            >
              <Code className="h-4 w-4" /> {t("embeddable.create")}
            </DialogTrigger>
            <DialogContent size="xl">
              <NewEmbedModal />
            </DialogContent>
          </Dialog>
        </div>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="text-theme-text-secondary leading-[18px] uppercase">
            <TableRow>
              <TableHead scope="col">
                {t("embeddable.table.workspace")}
              </TableHead>
              <TableHead scope="col">{t("embeddable.table.chats")}</TableHead>
              <TableHead scope="col">{t("embeddable.table.active")}</TableHead>
              <TableHead scope="col">{t("embeddable.table.created")}</TableHead>
              <TableHead scope="col"> </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableLoadingRow colSpan={5} />
            ) : embeds.length === 0 ? (
              <TableEmptyRow colSpan={5}>
                {t("embeddable.empty", "No embeddable widgets created yet")}
              </TableEmptyRow>
            ) : (
              embeds.map((embed) => <EmbedRow key={embed.id} embed={embed} />)
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

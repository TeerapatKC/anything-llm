import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import showToast from "@/utils/toast";
import { useModal } from "@/hooks/useModal";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import Embed from "@/models/embed";
import paths from "@/utils/paths";
import { nFormatter } from "@/utils/numbers";
import EditEmbedModal from "./EditEmbedModal";
import CodeSnippetModal from "./CodeSnippetModal";
import moment from "moment";
import { safeJsonParse } from "@/utils/request";
import { TableCell, TableHead, TableRow } from "@/components/ui/table";
import ConfirmDialog from "@/components/ConfirmDialog";
import TableRowActions from "@/components/lib/TableRowActions";
import { Code, Settings, Trash2 } from "lucide-react";
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

export default function EmbedRow({ embed }) {
  const { t } = useTranslation();
  const rowRef = useRef(null);
  const [enabled, setEnabled] = useState(Number(embed.enabled) === 1);
  const {
    isOpen: isSettingsOpen,
    openModal: openSettingsModal,
    closeModal: closeSettingsModal,
  } = useModal();
  const {
    isOpen: isSnippetOpen,
    openModal: openSnippetModal,
    closeModal: closeSnippetModal,
  } = useModal();
  const [confirm, setConfirm] = useState(null);

  const handleSuspend = async () => {
    setConfirm({
      title: enabled
        ? t("embeddable.confirm.disable-title")
        : t("embeddable.confirm.enable-title"),
      description: enabled
        ? t("embeddable.confirm.disable-description")
        : t("embeddable.confirm.enable-description"),
      confirmText: enabled
        ? t("embeddable.actions.disable")
        : t("embeddable.actions.enable"),
      variant: enabled ? "destructive" : "default",
      onConfirm: async () => {
        const { success, error } = await Embed.updateEmbed(embed.id, {
          enabled: !enabled,
        });
        if (!success) showToast(error, "error", { clear: true });
        if (success) {
          showToast(
            enabled
              ? t("embeddable.toast.disabled")
              : t("embeddable.toast.enabled"),
            "success",
            { clear: true }
          );
          setEnabled(!enabled);
        }
      },
    });
  };

  const handleDelete = async () => {
    setConfirm({
      title: t("embeddable.confirm.delete-title"),
      description: t("embeddable.confirm.delete-description"),
      confirmText: t("embeddable.actions.delete"),
      variant: "destructive",
      onConfirm: async () => {
        const { success, error } = await Embed.deleteEmbed(embed.id);
        if (!success) showToast(error, "error", { clear: true });
        if (success) {
          rowRef?.current?.remove();
          showToast(t("embeddable.toast.deleted"), "success", {
            clear: true,
          });
        }
      },
    });
  };

  return (
    <>
      <TableRow ref={rowRef}>
        <TableHead scope="row" className="flex item-center gap-x-1">
          <a
            href={paths.workspace.chat(embed.workspace.slug)}
            target="_blank"
            rel="noreferrer"
            className="text-theme-text-primary flex items-center hover:underline"
          >
            {embed.workspace.name}
          </a>
        </TableHead>
        <TableHead scope="row">
          {nFormatter(embed._count.embed_chats)}
        </TableHead>
        <TableHead scope="row">
          <ActiveDomains domainList={embed.allowlist_domains} />
        </TableHead>
        <TableHead
          scope="row"
          className="text-theme-text-secondary font-normal!"
        >
          {
            // If the embed was created more than a day ago, show the date, otherwise show the time ago
            moment(embed.createdAt).diff(moment(), "days") > 0
              ? moment(embed.createdAt).format("MMM D, YYYY")
              : moment(embed.createdAt).fromNow()
          }
        </TableHead>
        <TableCell className="text-right">
          <TableRowActions>
            <DropdownMenuItem onClick={openSettingsModal}>
              <Settings />
              {t("embeddable.actions.settings")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={openSnippetModal}>
              <Code />
              {t("embeddable.actions.code-snippet")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleSuspend}>
              {enabled
                ? t("embeddable.actions.disable")
                : t("embeddable.actions.enable")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={handleDelete}>
              <Trash2 />
              {t("embeddable.actions.delete")}
            </DropdownMenuItem>
          </TableRowActions>
        </TableCell>
      </TableRow>
      <Dialog
        open={isSettingsOpen}
        onOpenChange={(open) =>
          open ? openSettingsModal() : closeSettingsModal()
        }
      >
        <DialogContent>
          <EditEmbedModal embed={embed} />
        </DialogContent>
      </Dialog>
      <Dialog
        open={isSnippetOpen}
        onOpenChange={(open) =>
          open ? openSnippetModal() : closeSnippetModal()
        }
      >
        <DialogContent>
          <CodeSnippetModal embed={embed} />
        </DialogContent>
      </Dialog>
      <ConfirmDialog config={confirm} onClose={() => setConfirm(null)} />
    </>
  );
}

function ActiveDomains({ domainList }) {
  const domains = safeJsonParse(domainList, []);
  const { t } = useTranslation();
  if (domains.length === 0) return <p>{t("embeddable.actions.all")}</p>;
  return (
    <div className="flex flex-col gap-y-2">
      {domains.map((domain, index) => {
        return (
          <p key={index} className="font-mono font-normal!">
            {domain}
          </p>
        );
      })}
    </div>
  );
}

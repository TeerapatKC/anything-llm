import { useRef, useState } from "react";
import { DotsThreeOutline } from "@phosphor-icons/react";
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

export default function EmbedRow({ embed }) {
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
      title: enabled ? "Disable this embed?" : "Enable this embed?",
      description: enabled
        ? "Once disabled the embed will no longer respond to any chat requests."
        : "The embed will resume responding to chat requests.",
      confirmText: enabled ? "Disable" : "Enable",
      variant: enabled ? "destructive" : "default",
      onConfirm: async () => {
        const { success, error } = await Embed.updateEmbed(embed.id, {
          enabled: !enabled,
        });
        if (!success) showToast(error, "error", { clear: true });
        if (success) {
          showToast(
            `Embed ${enabled ? "has been disabled" : "is active"}.`,
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
      title: "Delete this embed?",
      description:
        "Once deleted this embed will no longer respond to chats or be active. This action is irreversible.",
      confirmText: "Delete",
      variant: "destructive",
      onConfirm: async () => {
        const { success, error } = await Embed.deleteEmbed(embed.id);
        if (!success) showToast(error, "error", { clear: true });
        if (success) {
          rowRef?.current?.remove();
          showToast("Embed deleted from system.", "success", { clear: true });
        }
      },
    });
  };

  return (
    <>
      <TableRow
        variant="none"
        ref={rowRef}
        className="bg-transparent text-white text-opacity-80 text-xs font-medium border-b border-white/10 h-10"
      >
        <TableHead
          variant="none"
          scope="row"
          className="px-6 whitespace-nowrap flex item-center gap-x-1"
        >
          <a
            href={paths.workspace.chat(embed.workspace.slug)}
            target="_blank"
            rel="noreferrer"
            className="text-white flex items-center hover:underline"
          >
            {embed.workspace.name}
          </a>
        </TableHead>
        <TableHead
          variant="none"
          scope="row"
          className="px-6 whitespace-nowrap"
        >
          {nFormatter(embed._count.embed_chats)}
        </TableHead>
        <TableHead
          variant="none"
          scope="row"
          className="px-6 whitespace-nowrap"
        >
          <ActiveDomains domainList={embed.allowlist_domains} />
        </TableHead>
        <TableHead
          variant="none"
          scope="row"
          className="px-6 whitespace-nowrap text-theme-text-secondary !font-normal"
        >
          {
            // If the embed was created more than a day ago, show the date, otherwise show the time ago
            moment(embed.createdAt).diff(moment(), "days") > 0
              ? moment(embed.createdAt).format("MMM D, YYYY")
              : moment(embed.createdAt).fromNow()
          }
        </TableHead>
        <TableCell
          variant="none"
          className="px-6 flex items-center gap-x-6 h-full mt-1"
        >
          <button
            onClick={openSnippetModal}
            className="group text-xs font-medium text-theme-text-secondary px-2 py-1 rounded-lg hover:bg-theme-button-code-hover-bg"
          >
            <span className="group-hover:text-theme-button-code-hover-text">
              Code
            </span>
          </button>
          <button
            onClick={handleSuspend}
            className="group text-xs font-medium text-theme-text-secondary px-2 py-1 rounded-lg hover:bg-theme-button-disable-hover-bg"
          >
            <span className="group-hover:text-theme-button-disable-hover-text">
              {enabled ? "Disable" : "Enable"}
            </span>
          </button>
          <button
            onClick={handleDelete}
            className="group text-xs font-medium text-theme-text-secondary px-2 py-1 rounded-lg hover:bg-theme-button-delete-hover-bg"
          >
            <span className="group-hover:text-theme-button-delete-hover-text">
              Delete
            </span>
          </button>
          <button
            onClick={openSettingsModal}
            className="text-xs font-medium text-theme-button-text hover:text-theme-text-secondary hover:bg-theme-hover px-2 py-1 rounded-lg"
          >
            <DotsThreeOutline weight="fill" className="h-5 w-5" />
          </button>
        </TableCell>
      </TableRow>
      <Dialog
        open={isSettingsOpen}
        onOpenChange={(open) =>
          open ? openSettingsModal() : closeSettingsModal()
        }
      >
        <DialogContent className="max-w-2xl bg-theme-bg-secondary border-theme-modal-border">
          <EditEmbedModal embed={embed} />
        </DialogContent>
      </Dialog>
      <Dialog
        open={isSnippetOpen}
        onOpenChange={(open) =>
          open ? openSnippetModal() : closeSnippetModal()
        }
      >
        <DialogContent className="max-w-2xl bg-theme-bg-secondary border-theme-modal-border">
          <CodeSnippetModal embed={embed} />
        </DialogContent>
      </Dialog>
      <ConfirmDialog config={confirm} onClose={() => setConfirm(null)} />
    </>
  );
}

function ActiveDomains({ domainList }) {
  const domains = safeJsonParse(domainList, []);
  if (domains.length === 0) return <p>all</p>;
  return (
    <div className="flex flex-col gap-y-2">
      {domains.map((domain, index) => {
        return (
          <p key={index} className="font-mono !font-normal">
            {domain}
          </p>
        );
      })}
    </div>
  );
}

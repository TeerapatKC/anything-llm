import { useRef, useState } from "react";
import { Ellipsis } from "lucide-react";
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
        <TableCell className="flex items-center gap-x-6 h-full mt-1">
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
            <Ellipsis className="h-5 w-5 fill-current" />
          </button>
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
  if (domains.length === 0) return <p>all</p>;
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

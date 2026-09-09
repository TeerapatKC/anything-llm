import truncate from "truncate";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useState } from "react";
import { useModal } from "@/hooks/useModal";
import paths from "@/utils/paths";
import Embed from "@/models/embed";
import MarkdownRenderer from "../MarkdownRenderer";
import { safeJsonParse } from "@/utils/request";
import { TableCell, TableRow } from "@/components/ui/table";
import ConfirmDialog from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

export default function ChatRow({ chat, onDelete }) {
  const { t } = useTranslation();
  const {
    isOpen: isPromptOpen,
    openModal: openPromptModal,
    closeModal: closePromptModal,
  } = useModal();
  const {
    isOpen: isResponseOpen,
    openModal: openResponseModal,
    closeModal: closeResponseModal,
  } = useModal();
  const {
    isOpen: isConnectionDetailsModalOpen,
    openModal: openConnectionDetailsModal,
    closeModal: closeConnectionDetailsModal,
  } = useModal();
  const [confirm, setConfirm] = useState(null);

  const handleDelete = async () => {
    setConfirm({
      title: t("embed-chats.confirm.delete-title"),
      description: t("embed-chats.confirm.delete-description"),
      confirmText: t("embeddable.actions.delete"),
      variant: "destructive",
      onConfirm: async () => {
        await Embed.deleteChat(chat.id);
        onDelete(chat.id);
      },
    });
  };

  return (
    <>
      <TableRow>
        <TableCell className="font-medium">
          <a
            href={paths.settings.embedChatWidgets()}
            target="_blank"
            rel="noreferrer"
            className="text-theme-text-primary flex items-center hover:underline"
          >
            {chat.embed_config.workspace.name}
          </a>
        </TableCell>
        <TableCell
          onClick={openConnectionDetailsModal}
          className="cursor-pointer hover:underline"
        >
          <div className="flex flex-col">
            <p>{truncate(chat.session_id, 20)}</p>
          </div>
        </TableCell>
        <TableCell
          onClick={openPromptModal}
          className="border-transparent cursor-pointer hover:underline"
        >
          {truncate(chat.prompt, 40)}
        </TableCell>
        <TableCell
          onClick={openResponseModal}
          className="cursor-pointer hover:underline"
        >
          {truncate(safeJsonParse(chat.response, {})?.text, 40)}
        </TableCell>
        <TableCell>{chat.createdAt}</TableCell>
        <TableCell className="text-right">
          <Button variant="destructive" size="sm" onClick={handleDelete}>
            {t("embeddable.actions.delete")}
          </Button>
        </TableCell>
      </TableRow>
      <Dialog
        open={isPromptOpen}
        onOpenChange={(open) => (open ? openPromptModal() : closePromptModal())}
      >
        <TextPreview text={chat.prompt} title={t("embed-chats.viewing-text")} />
      </Dialog>
      <Dialog
        open={isResponseOpen}
        onOpenChange={(open) =>
          open ? openResponseModal() : closeResponseModal()
        }
      >
        <TextPreview
          text={
            <MarkdownRenderer
              content={safeJsonParse(chat.response, {})?.text}
            />
          }
          title={t("embed-chats.viewing-text")}
        />
      </Dialog>
      <Dialog
        open={isConnectionDetailsModalOpen}
        onOpenChange={(open) =>
          open ? openConnectionDetailsModal() : closeConnectionDetailsModal()
        }
      >
        <TextPreview
          text={
            <ConnectionDetails
              sessionId={chat.session_id}
              verbose={true}
              connection_information={chat.connection_information}
            />
          }
          title={t("embed-chats.connection-details")}
        />
      </Dialog>
      <ConfirmDialog config={confirm} onClose={() => setConfirm(null)} />
    </>
  );
}

const TextPreview = ({ text, title }) => {
  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
      </DialogHeader>
      <div className="w-full h-[60vh] py-2 px-4 whitespace-pre-line overflow-auto rounded-lg bg-zinc-900 light:bg-theme-bg-secondary border border-gray-500 text-theme-text-primary text-sm">
        {text}
      </div>
    </DialogContent>
  );
};

const ConnectionDetails = ({
  sessionId,
  verbose = false,
  connection_information,
}) => {
  const { t } = useTranslation();
  const details = safeJsonParse(connection_information, {});
  if (Object.keys(details).length === 0) return null;

  if (verbose) {
    return (
      <>
        <p className="text-xs text-theme-text-secondary">
          {t("embed-chats.session-id")}: {sessionId}
        </p>
        {details.username && (
          <p className="text-xs text-theme-text-secondary">
            {t("embed-chats.username")}: {details.username}
          </p>
        )}
        {details.ip && (
          <p className="text-xs text-theme-text-secondary">
            {t("embed-chats.client-ip")}: {details.ip}
          </p>
        )}
        {details.host && (
          <p className="text-xs text-theme-text-secondary">
            {t("embed-chats.client-host")}: {details.host}
          </p>
        )}
      </>
    );
  }

  return (
    <>
      {details.username && (
        <p className="text-xs text-theme-text-secondary">{details.username}</p>
      )}
      {details.ip && (
        <p className="text-xs text-theme-text-secondary">{details.ip}</p>
      )}
      {details.host && (
        <p className="text-xs text-theme-text-secondary">{details.host}</p>
      )}
    </>
  );
};

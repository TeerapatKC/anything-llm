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

export default function ChatRow({ chat, onDelete }) {
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
      title: "Delete this chat?",
      description: "This action is irreversible.",
      confirmText: "Delete",
      variant: "destructive",
      onConfirm: async () => {
        await Embed.deleteChat(chat.id);
        onDelete(chat.id);
      },
    });
  };

  return (
    <>
      <TableRow
        variant="none"
        className="bg-transparent text-white text-opacity-80 text-xs font-medium border-b border-white/10 h-10"
      >
        <TableCell
          variant="none"
          className="px-6 font-medium whitespace-nowrap text-white"
        >
          <a
            href={paths.settings.embedChatWidgets()}
            target="_blank"
            rel="noreferrer"
            className="text-white flex items-center hover:underline"
          >
            {chat.embed_config.workspace.name}
          </a>
        </TableCell>
        <TableCell
          variant="none"
          onClick={openConnectionDetailsModal}
          className="px-6 cursor-pointer hover:shadow-lg"
        >
          <div className="flex flex-col">
            <p>{truncate(chat.session_id, 20)}</p>
          </div>
        </TableCell>
        <TableCell
          variant="none"
          onClick={openPromptModal}
          className="px-6 border-transparent cursor-pointer hover:shadow-lg"
        >
          {truncate(chat.prompt, 40)}
        </TableCell>
        <TableCell
          variant="none"
          onClick={openResponseModal}
          className="px-6 cursor-pointer hover:shadow-lg"
        >
          {truncate(safeJsonParse(chat.response, {})?.text, 40)}
        </TableCell>
        <TableCell variant="none" className="px-6">
          {chat.createdAt}
        </TableCell>
        <TableCell
          variant="none"
          className="px-6 flex items-center gap-x-6 h-full mt-1"
        >
          <button
            onClick={handleDelete}
            className="group text-xs font-medium text-theme-text-secondary px-2 py-1 rounded-lg hover:bg-theme-button-delete-hover-bg"
          >
            <span className="group-hover:text-theme-button-delete-hover-text">
              Delete
            </span>
          </button>
        </TableCell>
      </TableRow>
      <Dialog
        open={isPromptOpen}
        onOpenChange={(open) => (open ? openPromptModal() : closePromptModal())}
      >
        <TextPreview text={chat.prompt} />
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
        />
      </Dialog>
      <ConfirmDialog config={confirm} onClose={() => setConfirm(null)} />
    </>
  );
}

const TextPreview = ({ text }) => {
  return (
    <DialogContent className="max-w-2xl bg-theme-bg-secondary border-theme-modal-border">
      <DialogHeader className="p-0">
        <DialogTitle className="text-sm font-semibold">
          Viewing Text
        </DialogTitle>
      </DialogHeader>
      <div className="w-full h-[60vh] py-2 px-4 whitespace-pre-line overflow-auto rounded-lg bg-zinc-900 light:bg-theme-bg-secondary border border-gray-500 text-white text-sm">
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
  const details = safeJsonParse(connection_information, {});
  if (Object.keys(details).length === 0) return null;

  if (verbose) {
    return (
      <>
        <p className="text-xs text-theme-text-secondary">
          sessionID: {sessionId}
        </p>
        {details.username && (
          <p className="text-xs text-theme-text-secondary">
            username: {details.username}
          </p>
        )}
        {details.ip && (
          <p className="text-xs text-theme-text-secondary">
            client ip address: {details.ip}
          </p>
        )}
        {details.host && (
          <p className="text-xs text-theme-text-secondary">
            client host URL: {details.host}
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

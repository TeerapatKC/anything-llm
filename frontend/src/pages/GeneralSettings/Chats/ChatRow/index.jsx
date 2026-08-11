import truncate from "truncate";
import { Trash } from "@phosphor-icons/react";
import System from "@/models/system";
import { useModal } from "@/hooks/useModal";
import MarkdownRenderer from "../MarkdownRenderer";
import { safeJsonParse } from "@/utils/request";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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

  const handleDelete = async () => {
    if (
      !window.confirm(
        `Are you sure you want to delete this chat?\n\nThis action is irreversible.`
      )
    )
      return false;
    await System.deleteChat(chat.id);
    onDelete(chat.id);
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
          {chat.id}
        </TableCell>
        <TableCell
          variant="none"
          className="px-6 font-medium whitespace-nowrap text-white"
        >
          {chat.user?.username}
        </TableCell>
        <TableCell variant="none" className="px-6">
          {chat.workspace?.name}
        </TableCell>
        <TableCell
          variant="none"
          onClick={openPromptModal}
          className="px-6 border-transparent cursor-pointer transform transition-transform duration-200 hover:scale-105 hover:shadow-lg"
        >
          {truncate(chat.prompt, 40)}
        </TableCell>
        <TableCell
          variant="none"
          onClick={openResponseModal}
          className="px-6 cursor-pointer transform transition-transform duration-200 hover:scale-105 hover:shadow-lg"
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
          <Button variant="danger" onClick={handleDelete}>
            <Trash className="h-5 w-5" />
          </Button>
        </TableCell>
      </TableRow>
      <Dialog
        open={isPromptOpen}
        onOpenChange={(open) => !open && closePromptModal()}
      >
        <DialogContent className="max-w-2xl bg-theme-bg-secondary border-theme-modal-border">
          <TextPreview text={chat.prompt} />
        </DialogContent>
      </Dialog>
      <Dialog
        open={isResponseOpen}
        onOpenChange={(open) => !open && closeResponseModal()}
      >
        <DialogContent className="max-w-2xl bg-theme-bg-secondary border-theme-modal-border">
          <TextPreview
            text={
              <MarkdownRenderer
                content={safeJsonParse(chat.response, {})?.text}
              />
            }
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
const TextPreview = ({ text }) => {
  return (
    <>
      <DialogHeader className="p-0">
        <DialogTitle className="text-sm font-semibold">
          Viewing Text
        </DialogTitle>
      </DialogHeader>
      <div className="w-full">
        <pre className="w-full h-[200px] py-2 px-4 whitespace-pre-line overflow-auto rounded-lg bg-zinc-900 light:bg-theme-bg-secondary border border-gray-500 text-white text-sm">
          {text}
        </pre>
      </div>
    </>
  );
};

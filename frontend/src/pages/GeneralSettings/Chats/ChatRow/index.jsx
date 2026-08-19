import truncate from "truncate";
import { Trash2 } from "lucide-react";
import System from "@/models/system";
import { useState } from "react";
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
  const [confirm, setConfirm] = useState(null);

  const handleDelete = async () => {
    setConfirm({
      title: "Delete this chat?",
      description: "This action is irreversible.",
      confirmText: "Delete",
      variant: "destructive",
      onConfirm: async () => {
        await System.deleteChat(chat.id);
        onDelete(chat.id);
      },
    });
  };

  return (
    <>
      <TableRow>
        <TableCell className="font-medium">{chat.id}</TableCell>
        <TableCell className="font-medium">{chat.user?.username}</TableCell>
        <TableCell>{chat.workspace?.name}</TableCell>
        <TableCell
          onClick={openPromptModal}
          className="border-transparent cursor-pointer transform transition-transform duration-200 hover:scale-105 hover:shadow-lg"
        >
          {truncate(chat.prompt, 40)}
        </TableCell>
        <TableCell
          onClick={openResponseModal}
          className="cursor-pointer transform transition-transform duration-200 hover:scale-105 hover:shadow-lg"
        >
          {truncate(safeJsonParse(chat.response, {})?.text, 40)}
        </TableCell>
        <TableCell>{chat.createdAt}</TableCell>
        <TableCell className="flex items-center gap-x-6 h-full mt-1">
          <Button variant="destructive" onClick={handleDelete}>
            <Trash2 className="h-5 w-5" />
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
      <ConfirmDialog config={confirm} onClose={() => setConfirm(null)} />
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
        <pre className="w-full h-[200px] py-2 px-4 whitespace-pre-line overflow-auto rounded-lg bg-zinc-900 light:bg-theme-bg-secondary border border-gray-500 text-theme-text-primary text-sm">
          {text}
        </pre>
      </div>
    </>
  );
};

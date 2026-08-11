import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { useModal } from "@/hooks/useModal";
import { useState } from "react";
import { useParams } from "react-router-dom";

const SEEN_COPY_LINK_CHAT_ALERT = "anythingllm_seen_copy_link_chat_alert";

export default function CopyLinkToChatRow() {
  const { slug, threadSlug } = useParams();
  const [copied, setCopied] = useState(false);
  const { isOpen, openModal, closeModal } = useModal();

  if (!slug) return null;

  function getChatUrl() {
    let path = `/workspace/${slug}`;
    if (threadSlug) path += `/t/${threadSlug}`;
    return `${window.location.origin}${path}`;
  }

  function handleClick() {
    navigator.clipboard.writeText(getChatUrl()).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });

    if (!window.localStorage.getItem(SEEN_COPY_LINK_CHAT_ALERT)) openModal();
  }

  function handleCloseModal() {
    closeModal();
    window.localStorage.setItem(SEEN_COPY_LINK_CHAT_ALERT, "1");
  }

  return (
    <>
      <DropdownMenuItem onSelect={handleClick}>
        {copied ? "Link copied!" : "Copy chat link"}
      </DropdownMenuItem>
      <CopyLinkModal
        isOpen={isOpen}
        closeModal={handleCloseModal}
        url={getChatUrl()}
      />
    </>
  );
}

function CopyLinkModal({ isOpen, closeModal, url }) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && closeModal()}>
      <DialogContent className="max-w-[500px] bg-theme-bg-sidebar border-white/10">
        <DialogTitle className="text-white text-left font-medium text-sm">
          Chat link copied!
        </DialogTitle>
        <div className="flex flex-col w-full">
          <p className="text-sm text-zinc-400 light:text-slate-500">
            The link to this chat has been copied to your clipboard.
          </p>
          <p className="text-sm text-zinc-400 light:text-slate-500 pt-1">
            This <strong>does not</strong> change permissions on the chat and is
            simply a way for you to quick link to you own chats.
          </p>
          <div className="mt-3 px-3 py-2 rounded-md bg-theme-bg-primary border border-white/10 text-sm text-white break-all select-all">
            {url}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

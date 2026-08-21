import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import showToast from "@/utils/toast";
import { useState } from "react";
import { useParams } from "react-router-dom";

export default function CopyLinkToChatRow() {
  const { slug, threadSlug } = useParams();
  const [copied, setCopied] = useState(false);

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
      showToast("Chat link copied to clipboard!", "success", { clear: true });
    });
  }

  return (
    <DropdownMenuItem onClick={handleClick}>
      {copied ? "Link copied!" : "Copy chat link"}
    </DropdownMenuItem>
  );
}

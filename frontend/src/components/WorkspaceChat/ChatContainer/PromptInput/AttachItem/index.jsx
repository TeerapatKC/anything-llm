import { Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useCallback, useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import Workspace from "@/models/workspace";
import {
  ATTACHMENTS_PROCESSED_EVENT,
  REMOVE_ATTACHMENT_EVENT,
} from "../../DnDWrapper";
import ParsedFilesMenu from "./ParsedFilesMenu";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * This is a simple proxy component that clicks on the DnD file uploader for the user.
 *
 * With no attachments the button carries a plain tooltip. Once there are files
 * it grows a hover card holding the ParsedFilesMenu — the panel is interactive,
 * so it is a HoverCard rather than a Tooltip, which is not focusable or
 * clickable by design.
 * @returns
 */
export default function AttachItem({
  workspaceSlug = null,
  workspaceThreadSlug = null,
}) {
  const { t } = useTranslation();
  const params = useParams();
  const slug = workspaceSlug || params.slug;
  const threadSlug = workspaceThreadSlug ?? params.threadSlug ?? null;
  const [isEmbedding, setIsEmbedding] = useState(false);
  const [files, setFiles] = useState([]);
  const [currentTokens, setCurrentTokens] = useState(0);
  const [contextWindow, setContextWindow] = useState(Infinity);
  const [showMenu, setShowMenu] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchFiles = () => {
    if (!slug) return;
    if (isEmbedding) return;
    setIsLoading(true);
    Workspace.getParsedFiles(slug, threadSlug)
      .then(({ files, contextWindow, currentContextTokenCount }) => {
        setFiles(files);
        setShowMenu(files.length > 0);
        setContextWindow(contextWindow);
        setCurrentTokens(currentContextTokenCount);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  /**
   * Handles the removal of an attachment from the parsed files
   * and triggers a re-fetch of the parsed files.
   * This function handles when the user clicks the X on an Attachment via the AttachmentManager
   * so we need to sync the state in the ParsedFilesMenu picker here.
   */
  async function handleRemoveAttachment(e) {
    const { document } = e.detail;
    await Workspace.deleteParsedFiles(slug, [document.id]);
    fetchFiles();
  }

  /**
   * Handles the click event for the attach item button.
   * @param {MouseEvent} e - The click event.
   * @returns {void}
   */
  function handleClick(e) {
    e?.target?.blur();
    document?.getElementById("dnd-chat-file-uploader")?.click();
    return;
  }

  // ParsedFilesMenu closes the panel once embedding finishes; it used to reach
  // for react-tooltip's imperative close through a ref.
  const closeMenu = useCallback(() => setMenuOpen(false), []);

  useEffect(() => {
    fetchFiles();
    window.addEventListener(ATTACHMENTS_PROCESSED_EVENT, fetchFiles);
    window.addEventListener(REMOVE_ATTACHMENT_EVENT, handleRemoveAttachment);
    return () => {
      window.removeEventListener(ATTACHMENTS_PROCESSED_EVENT, fetchFiles);
      window.removeEventListener(
        REMOVE_ATTACHMENT_EVENT,
        handleRemoveAttachment
      );
    };
  }, [slug, threadSlug]);

  const button = (
    <button
      id="attach-item-btn"
      aria-label={t("chat_window.attach_file")}
      type="button"
      onClick={handleClick}
      onPointerEnter={fetchFiles}
      className="group border-none relative flex justify-center items-center cursor-pointer w-6 h-6 rounded-full hover:bg-zinc-700 light:hover:bg-slate-200"
    >
      <div className="relative">
        <Plus
          size={18}
          className="pointer-events-none text-zinc-300 light:text-slate-600 group-hover:text-white light:group-hover:text-slate-600 shrink-0"
        />
        {files.length > 0 && (
          <div className="absolute -top-2.5 -right-2 bg-white text-black light:invert text-[8px] rounded-full px-1 flex items-center justify-center">
            {files.length}
          </div>
        )}
      </div>
    </button>
  );

  if (!showMenu)
    return (
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          {t("chat_window.attach_file")}
        </TooltipContent>
      </Tooltip>
    );

  return (
    <HoverCard
      open={menuOpen}
      // Embedding used to be held open with delayHide={999999}; refusing the
      // close outright says the same thing without the magic number.
      onOpenChange={(open) => {
        if (!open && isEmbedding) return;
        setMenuOpen(open);
      }}
      openDelay={300}
      closeDelay={800}
    >
      <HoverCardTrigger asChild>{button}</HoverCardTrigger>
      <HoverCardContent
        side="top"
        className="z-99 w-[400px] bg-theme-bg-primary px-[5px] py-2 rounded-lg light:border-2 light:border-theme-modal-border"
      >
        <ParsedFilesMenu
          onEmbeddingChange={setIsEmbedding}
          onClose={closeMenu}
          isLoading={isLoading}
          files={files}
          setFiles={setFiles}
          currentTokens={currentTokens}
          setCurrentTokens={setCurrentTokens}
          contextWindow={contextWindow}
          workspaceSlug={slug}
          threadSlug={threadSlug}
        />
      </HoverCardContent>
    </HoverCard>
  );
}

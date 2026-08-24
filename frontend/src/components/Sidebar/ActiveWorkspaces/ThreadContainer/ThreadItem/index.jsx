import useScrollActiveItemIntoView from "@/hooks/useScrollActiveItemIntoView";
import Workspace from "@/models/workspace";
import paths from "@/utils/paths";
import showToast from "@/utils/toast";
import { MoreHorizontal, Pencil, RotateCcw, Trash2, X } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import ConfirmDialog from "@/components/ConfirmDialog";
import RenameThreadModal from "./RenameThreadModal";

export default function ThreadItem({
  isActive,
  workspace,
  thread,
  onRemove,
  toggleMarkForDeletion,
  ctrlPressed = false,
}) {
  const { slug: urlSlug, threadSlug = null } = useParams();
  const workspaceSlug = workspace?.slug ?? urlSlug;
  const [confirm, setConfirm] = useState(null);
  const [renaming, setRenaming] = useState(false);
  const linkTo = thread.virtual
    ? "/"
    : !thread.slug
      ? paths.workspace.chat(workspaceSlug)
      : paths.workspace.thread(workspaceSlug, thread.slug);

  const { ref } = useScrollActiveItemIntoView({
    isActive,
    behavior: "instant",
    block: "center",
  });

  const canManage = !!thread.slug && !thread.deleted && !thread.virtual;

  if (thread.deleted) {
    return (
      <SidebarMenuSubItem className="flex items-center justify-between gap-1 pr-1">
        <span className="truncate px-2 py-1 text-sm italic text-sidebar-foreground/40">
          deleted thread
        </span>
        {ctrlPressed && (
          <button
            type="button"
            onClick={() => toggleMarkForDeletion(thread.id)}
            aria-label="Restore thread"
            className="shrink-0 rounded-sm p-1 text-sidebar-foreground/60 hover:text-sidebar-foreground"
          >
            <RotateCcw className="size-3.5" />
          </button>
        )}
      </SidebarMenuSubItem>
    );
  }

  return (
    <SidebarMenuSubItem className="group/thread relative">
      <Tooltip>
        <TooltipTrigger
          render={
            <SidebarMenuSubButton
              isActive={isActive}
              className={cn("pr-7", thread.virtual && "italic")}
              render={
                <Link
                  ref={ref}
                  to={linkTo}
                  aria-current={isActive ? "page" : ""}
                />
              }
            />
          }
        >
          {/* Leading marker. Kept before the label so the name stays the
              button's last child, which is what carries the truncation. */}
          <span
            aria-hidden="true"
            className={cn(
              "size-1.5 shrink-0 rounded-full transition-colors",
              isActive
                ? "bg-sidebar-primary"
                : "bg-sidebar-foreground/30 group-hover/thread:bg-sidebar-foreground/60"
            )}
          />
          <span
            className={cn("min-w-0 flex-1 truncate", isActive && "font-medium")}
          >
            {thread.name}
          </span>
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-sm break-words text-xs">
          {thread.name}
        </TooltipContent>
      </Tooltip>

      {canManage &&
        (ctrlPressed ? (
          <button
            type="button"
            onClick={() => toggleMarkForDeletion(thread.id)}
            aria-label="Mark thread for deletion"
            className="absolute right-1 top-1/2 flex size-5 -translate-y-1/2 items-center justify-center rounded-sm text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <X className="size-3.5" />
          </button>
        ) : (
          <ThreadOptions
            workspace={workspace}
            thread={thread}
            onRemove={onRemove}
            currentThreadSlug={threadSlug}
            onConfirm={setConfirm}
            onRename={() => setRenaming(true)}
          />
        ))}

      <ConfirmDialog config={confirm} onClose={() => setConfirm(null)} />
      {renaming && (
        <RenameThreadModal
          workspace={workspace}
          thread={thread}
          onClose={() => setRenaming(false)}
        />
      )}
    </SidebarMenuSubItem>
  );
}

function ThreadOptions({
  workspace,
  thread,
  onRemove,
  currentThreadSlug,
  onConfirm,
  onRename,
}) {
  const deleteThread = async () => {
    const success = await Workspace.threads.delete(workspace.slug, thread.slug);
    if (!success) {
      showToast("Thread could not be deleted!", "error", { clear: true });
      return;
    }
    showToast("Thread deleted successfully!", "success", { clear: true });
    onRemove(thread.id);
    // Redirect if deleting the active thread
    if (currentThreadSlug === thread.slug)
      window.location.href = paths.workspace.chat(workspace.slug);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            aria-label="Thread options"
            className="absolute right-1 top-1/2 flex size-5 -translate-y-1/2 items-center justify-center rounded-sm text-sidebar-foreground/60 opacity-0 transition-opacity hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:opacity-100 group-hover/thread:opacity-100 data-[state=open]:opacity-100"
          />
        }
      >
        <MoreHorizontal className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent side="right" align="start" className="w-44">
        <DropdownMenuItem onClick={onRename}>
          <Pencil className="mr-2 size-4" />
          Rename
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onClick={() =>
            onConfirm({
              title: "Delete this thread?",
              description:
                "All of its chats will be deleted. You cannot undo this.",
              confirmText: "Delete thread",
              variant: "destructive",
              onConfirm: deleteThread,
            })
          }
        >
          <Trash2 className="mr-2 size-4" />
          Delete thread
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

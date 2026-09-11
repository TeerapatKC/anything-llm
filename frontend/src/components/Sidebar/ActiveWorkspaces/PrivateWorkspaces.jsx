import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { ChevronDown, Lock, Pencil, Plus, Upload } from "lucide-react";
import Workspace from "@/models/workspace";
import paths from "@/utils/paths";
import showToast from "@/utils/toast";
import useUser from "@/hooks/useUser";
import { WORKSPACE_PERMISSIONS as WS, workspaceCan } from "@/utils/permissions";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import WorkspaceMonogram from "@/components/Sidebar/WorkspaceMonogram";
import ManageWorkspace from "@/components/Modals/ManageWorkspace";
import ThreadContainer from "./ThreadContainer";

/**
 * The private workspaces the signed-in user owns.
 *
 * These deliberately do not behave like the shared list above them. A private
 * workspace has no settings screen, so where a shared row carries a gear this one
 * carries the two things its owner can actually do: rename it, and - when the
 * instance's private workspace role allows uploads - put documents in it. Both are
 * reachable straight from the sidebar, since there is no settings page to reach them
 * through.
 */
export default function PrivateWorkspaces({
  workspaces = [],
  activeSlug = null,
  virtualActiveSlug = null,
  policy = null,
  onCreated = null,
  expanded = true,
  onExpandedChange = null,
}) {
  const { t } = useTranslation();
  const { user } = useUser();
  const [renaming, setRenaming] = useState(null);
  const [uploadingTo, setUploadingTo] = useState(null);
  const [creating, setCreating] = useState(false);

  // Nothing to show and nothing to offer: stay out of the sidebar entirely rather
  // than leaving an empty heading behind.
  if (!policy?.enabled && workspaces.length === 0) return null;

  async function createWorkspace() {
    if (creating) return;
    setCreating(true);
    const { workspace, message } = await Workspace.newPersonal();
    setCreating(false);
    if (!workspace) return showToast(message ?? "Could not create", "error");
    showToast(`"${workspace.name}" created`, "success");
    onCreated?.(workspace);
  }

  return (
    <SidebarGroup className="shrink-0 border-t border-sidebar-border bg-sidebar/80 pt-2">
      <button
        type="button"
        onClick={() => onExpandedChange?.(!expanded)}
        aria-expanded={expanded}
        className="flex h-8 w-full items-center gap-1.5 rounded-md px-2 text-left text-sm font-medium text-sidebar-foreground/70 outline-hidden transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring"
      >
        <ChevronDown
          className={cn(
            "size-4 shrink-0 transition-transform duration-200",
            !expanded && "-rotate-90"
          )}
        />
        <Lock className="size-3.5" />
        {t("sidebar.private")}
      </button>
      <div
        aria-hidden={!expanded}
        inert={expanded ? undefined : ""}
        className={cn(
          "grid overflow-hidden transition-[grid-template-rows] duration-200 ease-out",
          expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
      >
        <div
          className={cn(
            "min-h-0 overflow-hidden transition-opacity duration-150 ease-out",
            expanded ? "opacity-100" : "pointer-events-none opacity-0"
          )}
        >
          <SidebarGroupContent className="thin-scrollbar max-h-48 overflow-x-hidden overflow-y-auto">
            {workspaces.length === 0 && (
              <p className="px-2 pb-2 text-xs text-sidebar-foreground/60">
                {t("sidebar.no-private-workspaces")}
              </p>
            )}
            <SidebarMenu aria-label={t("sidebar.private")} className="gap-0">
              {workspaces.map((workspace) => (
                <PrivateWorkspaceRow
                  key={workspace.id}
                  workspace={workspace}
                  isActive={
                    workspace.slug === activeSlug ||
                    workspace.slug === virtualActiveSlug
                  }
                  isVirtualThread={workspace.slug === virtualActiveSlug}
                  canUpload={workspaceCan(
                    WS.DOCUMENTS_UPLOAD,
                    workspace.slug,
                    user
                  )}
                  canRename={workspaceCan(WS.RENAME, workspace.slug, user)}
                  onRename={() => setRenaming(workspace)}
                  onUpload={() => setUploadingTo(workspace)}
                />
              ))}
            </SidebarMenu>
            {policy?.canCreate && (
              <Button
                variant="ghost"
                size="sm"
                onClick={createWorkspace}
                disabled={creating}
                className="mt-1 w-full justify-start gap-2 text-sidebar-foreground/70 group-data-[collapsible=icon]:hidden hover:text-sidebar-foreground"
              >
                <Plus className="size-4" />
                {t("sidebar.new-private-workspace")}
              </Button>
            )}
          </SidebarGroupContent>
        </div>
      </div>

      {renaming && (
        <RenameWorkspaceDialog
          workspace={renaming}
          onClose={() => setRenaming(null)}
          onRenamed={onCreated}
        />
      )}
      {uploadingTo && (
        <ManageWorkspace
          providedSlug={uploadingTo.slug}
          hideModal={() => setUploadingTo(null)}
        />
      )}
    </SidebarGroup>
  );
}

function PrivateWorkspaceRow({
  workspace,
  isActive,
  isVirtualThread,
  canUpload,
  canRename,
  onRename,
  onUpload,
}) {
  const { t } = useTranslation();
  const isInactive = workspace.active === false;

  return (
    <SidebarMenuItem className="group/workspace mb-1">
      <SidebarMenuButton
        isActive={isActive}
        className="h-10 pr-16 text-[15px]"
        render={
          <Link
            to={paths.workspace.chat(workspace.slug)}
            aria-current={isActive ? "page" : ""}
            draggable={false}
          />
        }
      >
        <WorkspaceMonogram
          name={workspace.name}
          isActive={isActive}
          className={cn("size-[22px]", isInactive && "opacity-50")}
        />
        <span className={cn("truncate", isInactive && "opacity-50")}>
          {workspace.name}
        </span>
      </SidebarMenuButton>

      {canUpload && (
        <RowAction
          label={t("sidebar.upload-documents")}
          onClick={onUpload}
          isActive={isActive}
          className="right-8"
        >
          <Upload className="size-4" />
        </RowAction>
      )}
      {canRename && (
        <RowAction
          label={t("sidebar.rename-workspace")}
          onClick={onRename}
          isActive={isActive}
        >
          <Pencil className="size-4" />
        </RowAction>
      )}

      {isActive && (
        <ThreadContainer
          workspace={workspace}
          isActive={isActive}
          isVirtualThread={isVirtualThread}
        />
      )}
    </SidebarMenuItem>
  );
}

function RowAction({ label, onClick, isActive, className, children }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <SidebarMenuAction
            showOnHover={!isActive}
            className={cn(
              "top-2.5! text-sidebar-foreground/60 peer-hover/menu-button:text-sidebar-foreground/60",
              className
            )}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClick();
            }}
            aria-label={label}
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[250px] text-xs">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * Renaming is the whole of what this dialog does, and the whole of what the rename
 * route accepts - it is the private workspace's stand-in for a settings screen, not a
 * cut-down version of one.
 */
function RenameWorkspaceDialog({ workspace, onClose, onRenamed }) {
  const { t } = useTranslation();
  const [name, setName] = useState(workspace.name);
  const [saving, setSaving] = useState(false);

  async function save(e) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || trimmed === workspace.name) return onClose();

    setSaving(true);
    const { workspace: updated, message } = await Workspace.rename(
      workspace.slug,
      trimmed
    );
    setSaving(false);
    if (!updated) return showToast(message ?? "Rename failed", "error");
    showToast("Workspace renamed", "success");
    onRenamed?.(updated);
    onClose();
  }

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={save}>
          <DialogHeader>
            <DialogTitle>{t("sidebar.rename-workspace")}</DialogTitle>
            <DialogDescription>
              {t("sidebar.private-description")}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              autoFocus
              value={name}
              maxLength={255}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Escape" && onClose()}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !name.trim()}>
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

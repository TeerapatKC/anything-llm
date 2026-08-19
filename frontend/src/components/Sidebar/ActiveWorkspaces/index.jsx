import React, { useState, useEffect } from "react";
import { Empty, EmptyDescription, EmptyHeader } from "@/components/ui/empty";
import Workspace from "@/models/workspace";
import { WORKSPACE_PERMISSIONS as WS, workspaceCan } from "@/utils/permissions";
import paths from "@/utils/paths";
import { Link, useParams, useNavigate, useMatch } from "react-router-dom";
import { GripVertical, Settings } from "lucide-react";
import useUser from "@/hooks/useUser";
import ThreadContainer from "./ThreadContainer";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import showToast from "@/utils/toast";
import { LAST_VISITED_WORKSPACE } from "@/utils/constants";
import { safeJsonParse } from "@/utils/request";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

/**
 * Two-letter monogram standing in for a workspace icon, so every row leads with
 * a square glyph the way the shadcn sidebar blocks do.
 * @param {{name: string, isActive: boolean, className?: string}} props
 */
function WorkspaceMonogram({ name, isActive, className }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex shrink-0 items-center justify-center rounded-md border text-[10px] font-semibold uppercase leading-none transition-colors",
        isActive
          ? "border-transparent bg-sidebar-primary text-sidebar-primary-foreground"
          : "border-sidebar-border bg-sidebar-accent/40 text-sidebar-foreground/70",
        className
      )}
    >
      {name?.slice(0, 2)}
    </span>
  );
}

export default function ActiveWorkspaces() {
  const navigate = useNavigate();
  const { slug } = useParams();
  const [loading, setLoading] = useState(true);
  const [workspaces, setWorkspaces] = useState([]);
  const { user } = useUser();
  const { state: sidebarState } = useSidebar();
  const isCollapsed = sidebarState === "collapsed";
  const isInWorkspaceSettings = !!useMatch("/workspace/:slug/settings/:tab");
  const isHomePage = !!useMatch("/");

  useEffect(() => {
    async function getWorkspaces() {
      const workspaces = await Workspace.all();
      setLoading(false);
      setWorkspaces(Workspace.orderWorkspaces(workspaces));
    }
    getWorkspaces();
  }, []);

  if (loading) {
    return (
      <SidebarMenu
        aria-label="Workspaces"
        className={cn(isCollapsed && "items-center gap-1.5")}
      >
        {Array.from({ length: 5 }).map((_, index) => (
          <SidebarMenuItem key={index}>
            {isCollapsed ? (
              <div className="size-8 animate-pulse rounded-lg bg-sidebar-accent/50" />
            ) : (
              <SidebarMenuSkeleton showIcon />
            )}
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    );
  }

  /**
   * Reorders workspaces in the UI via localstorage on client side.
   * @param {number} startIndex - the index of the workspace to move
   * @param {number} endIndex - the index to move the workspace to
   */
  function reorderWorkspaces(startIndex, endIndex) {
    const reorderedWorkspaces = Array.from(workspaces);
    const [removed] = reorderedWorkspaces.splice(startIndex, 1);
    reorderedWorkspaces.splice(endIndex, 0, removed);
    setWorkspaces(reorderedWorkspaces);
    const success = Workspace.storeWorkspaceOrder(
      reorderedWorkspaces.map((w) => w.id)
    );
    if (!success) {
      showToast("Failed to reorder workspaces", "error");
      Workspace.all().then((workspaces) => setWorkspaces(workspaces));
    }
  }

  const onDragEnd = (result) => {
    if (!result.destination) return;
    reorderWorkspaces(result.source.index, result.destination.index);
  };

  // When on the home page, resolve which workspace should be virtually active
  const virtualActiveSlug = (() => {
    if (!isHomePage || workspaces.length === 0) return null;
    const lastVisited = safeJsonParse(
      localStorage.getItem(LAST_VISITED_WORKSPACE)
    );
    if (
      lastVisited?.slug &&
      workspaces.some((ws) => ws.slug === lastVisited.slug)
    )
      return lastVisited.slug;
    return workspaces[0]?.slug ?? null;
  })();

  if (isCollapsed) {
    return (
      <SidebarMenu aria-label="Workspaces" className="items-center gap-1.5">
        {workspaces.map((workspace) => {
          const isActive =
            workspace.slug === slug || workspace.slug === virtualActiveSlug;
          return (
            <SidebarMenuItem key={workspace.id}>
              <SidebarMenuButton
                isActive={isActive}
                tooltip={
                  workspace.active === false
                    ? `${workspace.name} — inactive`
                    : workspace.name
                }
                className="size-8! justify-center p-0!"
                render={
                  <Link
                    to={paths.workspace.chat(workspace.slug)}
                    aria-current={isActive ? "page" : ""}
                    aria-label={workspace.name}
                  />
                }
              >
                <WorkspaceMonogram
                  name={workspace.name}
                  isActive={isActive}
                  className={cn(
                    "size-8 rounded-lg text-xs",
                    workspace.active === false && "opacity-50"
                  )}
                />
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    );
  }

  if (workspaces.length === 0) {
    return (
      <SidebarGroup className="p-0">
        <SidebarGroupLabel>Workspaces</SidebarGroupLabel>
        <SidebarGroupContent>
          <Empty className="border border-dashed border-sidebar-border px-3 py-4">
            <EmptyHeader>
              <EmptyDescription className="text-sidebar-foreground/60">
                No workspaces yet.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  }

  return (
    <SidebarGroup className="p-0">
      <SidebarGroupLabel>Workspaces</SidebarGroupLabel>
      <SidebarGroupContent>
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="workspaces">
            {(provided) => (
              <SidebarMenu
                aria-label="Workspaces"
                ref={provided.innerRef}
                {...provided.droppableProps}
                // react-beautiful-dnd measures rows by their margin box and
                // knows nothing about flexbox `gap`, so a gapped list displaces
                // rows by the wrong amount mid-drag. Space them with margins.
                className="gap-0"
              >
                {workspaces.map((workspace, index) => {
                  const isVirtuallyActive =
                    workspace.slug === virtualActiveSlug;
                  const isActive = workspace.slug === slug || isVirtuallyActive;
                  const isInactive = workspace.active === false;
                  const canManage = workspaceCan(
                    WS.SETTINGS_MANAGE,
                    workspace.slug,
                    user
                  );
                  return (
                    <Draggable
                      key={workspace.id}
                      draggableId={workspace.id.toString()}
                      index={index}
                      // The row is a link, and dnd refuses to start a drag on an
                      // interactive element unless this is set. Without it only
                      // the grip could start a drag, and a press anywhere else
                      // did nothing — which read as the row snapping back.
                      disableInteractiveElementBlocking
                    >
                      {(provided, snapshot) => (
                        <SidebarMenuItem
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          aria-label={`${workspace.name} — drag to reorder`}
                          className={cn(
                            "group/workspace mb-1 outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
                            snapshot.isDragging &&
                              "rounded-md bg-sidebar shadow-lg ring-1 ring-sidebar-border"
                          )}
                        >
                          {/* Affordance only — the whole row is the drag handle.
                              Sits over the monogram, which fades out on hover, so
                              the row never shifts as you reach for it. */}
                          <span
                            aria-hidden="true"
                            className="pointer-events-none absolute left-1 top-1 z-10 flex size-6 items-center justify-center text-sidebar-foreground/50 opacity-0 transition-opacity group-hover/workspace:opacity-100"
                          >
                            <GripVertical className="size-4" />
                          </span>
                          <SidebarMenuButton
                            isActive={isActive}
                            render={
                              <Link
                                to={paths.workspace.chat(workspace.slug)}
                                aria-current={isActive ? "page" : ""}
                                // An anchor is natively draggable, and the browser
                                // firing `dragstart` aborts an in-flight dnd drag,
                                // which is what made rows snap back to their old
                                // position mid-reorder.
                                draggable={false}
                              />
                            }
                          >
                            <WorkspaceMonogram
                              name={workspace.name}
                              isActive={isActive}
                              className={cn(
                                "size-[18px] transition-opacity group-hover/workspace:opacity-0",
                                isInactive && "opacity-50"
                              )}
                            />
                            <Tooltip>
                              <TooltipTrigger
                                render={
                                  <span
                                    className={cn(
                                      "truncate",
                                      isInactive && "text-sidebar-foreground/50"
                                    )}
                                  />
                                }
                              >
                                {workspace.name}
                              </TooltipTrigger>
                              <TooltipContent
                                side="right"
                                className="max-w-[250px] text-xs"
                              >
                                {isInactive
                                  ? `${workspace.name} — inactive`
                                  : workspace.name}
                              </TooltipContent>
                            </Tooltip>
                            {isInactive && (
                              <Badge
                                variant="outline"
                                className={cn(
                                  "ml-auto h-[18px] shrink-0 rounded-sm border-sidebar-border px-1 text-[10px] font-medium text-sidebar-foreground/60",
                                  canManage &&
                                    "transition-opacity group-hover/workspace:opacity-0"
                                )}
                              >
                                Inactive
                              </Badge>
                            )}
                          </SidebarMenuButton>
                          {canManage && (
                            <Tooltip>
                              <TooltipTrigger
                                render={
                                  <SidebarMenuAction
                                    showOnHover={!isActive}
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      navigate(
                                        isInWorkspaceSettings
                                          ? paths.workspace.chat(workspace.slug)
                                          : paths.workspace.settings.generalAppearance(
                                              workspace.slug
                                            )
                                      );
                                    }}
                                    aria-label="General appearance settings"
                                  />
                                }
                              >
                                <Settings
                                  className={cn(
                                    "size-4",
                                    isInWorkspaceSettings &&
                                      workspace.slug === slug &&
                                      "text-sidebar-primary"
                                  )}
                                />
                              </TooltipTrigger>
                              <TooltipContent
                                side="top"
                                className="max-w-[250px] text-xs"
                              >
                                General appearance settings
                              </TooltipContent>
                            </Tooltip>
                          )}
                          {isActive && (
                            <ThreadContainer
                              workspace={workspace}
                              isActive={isActive}
                              isVirtualThread={isVirtuallyActive}
                            />
                          )}
                        </SidebarMenuItem>
                      )}
                    </Draggable>
                  );
                })}
                {provided.placeholder}
              </SidebarMenu>
            )}
          </Droppable>
        </DragDropContext>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

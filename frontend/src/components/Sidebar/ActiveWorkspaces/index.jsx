import React, { useState, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
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
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export default function ActiveWorkspaces() {
  const navigate = useNavigate();
  const { slug } = useParams();
  const [loading, setLoading] = useState(true);
  const [workspaces, setWorkspaces] = useState([]);
  const { user } = useUser();
  const { state: sidebarState } = useSidebar();
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
      <Skeleton
        height={40}
        width="100%"
        count={5}
        baseColor="var(--theme-sidebar-item-default)"
        highlightColor="var(--theme-sidebar-item-hover)"
        enableAnimation={true}
        className="my-1"
      />
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

  if (sidebarState === "collapsed") {
    return (
      <SidebarMenu aria-label="Workspaces" className="items-center gap-2">
        {workspaces.map((workspace) => {
          const isActive =
            workspace.slug === slug || workspace.slug === virtualActiveSlug;
          return (
            <SidebarMenuItem key={workspace.id}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive}
                    className="!size-8 !p-0 justify-center rounded-full text-xs font-semibold uppercase data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground"
                  >
                    <Link
                      to={paths.workspace.chat(workspace.slug)}
                      aria-current={isActive ? "page" : ""}
                      aria-label={workspace.name}
                    >
                      {workspace.name?.slice(0, 2)}
                    </Link>
                  </SidebarMenuButton>
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-[250px] text-xs">
                  {workspace.name}
                </TooltipContent>
              </Tooltip>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    );
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <Droppable droppableId="workspaces">
        {(provided) => (
          <SidebarMenu
            aria-label="Workspaces"
            ref={provided.innerRef}
            {...provided.droppableProps}
          >
            {workspaces.map((workspace, index) => {
              const isVirtuallyActive = workspace.slug === virtualActiveSlug;
              const isActive = workspace.slug === slug || isVirtuallyActive;
              return (
                <Draggable
                  key={workspace.id}
                  draggableId={workspace.id.toString()}
                  index={index}
                >
                  {(provided, snapshot) => (
                    <SidebarMenuItem
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className={cn(snapshot.isDragging && "opacity-50")}
                    >
                      <SidebarMenuButton asChild isActive={isActive}>
                        <Link
                          to={paths.workspace.chat(workspace.slug)}
                          aria-current={isActive ? "page" : ""}
                        >
                          <span
                            {...provided.dragHandleProps}
                            className="cursor-grab text-sidebar-foreground/40 hover:text-sidebar-foreground"
                          >
                            <GripVertical className="h-4 w-4 shrink-0" />
                          </span>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span
                                className={cn(
                                  "truncate",
                                  workspace.active === false && "opacity-50"
                                )}
                              >
                                {workspace.name}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent
                              side="right"
                              className="max-w-[250px] text-xs"
                            >
                              {workspace.active === false
                                ? `${workspace.name} — inactive`
                                : workspace.name}
                            </TooltipContent>
                          </Tooltip>
                          {workspace.active === false && (
                            <Badge
                              variant="secondary"
                              className="ml-auto shrink-0 px-1.5 py-0 text-[10px] font-medium"
                            >
                              Inactive
                            </Badge>
                          )}
                        </Link>
                      </SidebarMenuButton>
                      {workspaceCan(
                        WS.SETTINGS_MANAGE,
                        workspace.slug,
                        user
                      ) && (
                        <Tooltip>
                          <TooltipTrigger asChild>
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
                            >
                              <Settings
                                className={cn(
                                  "h-4 w-4",
                                  isInWorkspaceSettings &&
                                    workspace.slug === slug &&
                                    "text-sky-400"
                                )}
                              />
                            </SidebarMenuAction>
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
  );
}

import React from "react";
import { Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import NewWorkspaceModal, {
  useNewWorkspaceModal,
} from "../Modals/NewWorkspace";
import ActiveWorkspaces from "./ActiveWorkspaces";
import useLogo from "@/hooks/useLogo";
import useUser from "@/hooks/useUser";
import Footer from "../Footer";
import paths from "@/utils/paths";
import { cn } from "@/lib/utils";
import SearchBox from "./SearchBox";
import {
  Sidebar as SidebarPrimitive,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PERMISSIONS, userCan } from "@/utils/permissions";
import MobileSidebarTopbar from "./MobileTopbar";

/**
 * Wraps a page's sidebar + main content in shadcn's SidebarProvider, which is
 * what actually tracks open/collapsed state (and persists it — see
 * SIDEBAR_COOKIE_NAME in ui/sidebar.jsx). `--sidebar-width` is set to this
 * app's previous fixed sidebar width rather than shadcn's 16rem default;
 * `--sidebar-width-icon` is left at the primitive's 3rem default.
 */
export function SidebarPageLayout({ className, children }) {
  return (
    <SidebarProvider
      style={{ "--sidebar-width": "292px" }}
      className={cn(
        "h-screen overflow-hidden bg-zinc-950 light:bg-slate-50",
        className
      )}
    >
      <MobileTopbar />
      {children}
    </SidebarProvider>
  );
}

/**
 * The mobile-only entry point for opening the sidebar. On mobile, `Sidebar`
 * below renders as a closed Sheet (see ui/sidebar.jsx) with no trigger of its
 * own — its `SidebarTrigger` lives inside the sheet's own header, so it isn't
 * visible until the sheet is already open. This bar is the visible affordance
 * that opens it, rendered once for every page via `SidebarPageLayout` rather
 * than per-page, so it's always in sync with the shared sidebar state.
 */
function MobileTopbar() {
  const { setOpenMobile } = useSidebar();

  // This control is only rendered for the mobile layout. Open the mobile
  // sheet explicitly instead of routing through toggleSidebar(), whose
  // desktop/mobile branch can briefly lag behind a CSS breakpoint resize.
  return <MobileSidebarTopbar onToggle={() => setOpenMobile(true)} />;
}

export default function Sidebar() {
  const { t } = useTranslation();
  const { user } = useUser();
  const { logo } = useLogo();
  const {
    showing: showingNewWsModal,
    showModal: showNewWsModal,
    hideModal: hideNewWsModal,
  } = useNewWorkspaceModal();
  const canCreateWorkspace = userCan(PERMISSIONS.WORKSPACES_CREATE, user);

  return (
    <SidebarPrimitive collapsible="icon" className="p-0">
      <SidebarHeader className="gap-3 pt-4">
        <div className="flex items-center justify-between gap-2 group-data-[collapsible=icon]:justify-center">
          <Link
            to={paths.home()}
            aria-label="Home"
            className="min-w-0 group-data-[collapsible=icon]:hidden"
          >
            <img
              src={logo}
              alt="Logo"
              className="rounded max-h-[24px] object-contain"
            />
          </Link>
          <SidebarTrigger className="shrink-0 text-theme-text-secondary hover:bg-sidebar-accent hover:text-sidebar-accent-foreground" />
        </div>
        <div className="group-data-[collapsible=icon]:hidden">
          <SearchBox />
        </div>
        {canCreateWorkspace && (
          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  type="button"
                  onClick={showNewWsModal}
                  aria-label={t("new-workspace.title")}
                  className="hidden group-data-[collapsible=icon]:flex mx-auto items-center justify-center h-8 w-8 rounded-lg bg-white hover:bg-white/80 light:hover:bg-slate-300 transition-all duration-300"
                />
              }
            >
              <Plus
                size={16}
                strokeWidth={2.5}
                className="text-black light:text-slate-500"
              />
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-[250px] text-xs">
              {t("new-workspace.title")}
            </TooltipContent>
          </Tooltip>
        )}
      </SidebarHeader>
      <SidebarContent className="px-2 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:items-center">
        <ActiveWorkspaces
          canCreateWorkspace={canCreateWorkspace}
          showNewWsModal={showNewWsModal}
        />
      </SidebarContent>
      <SidebarFooter className="border-t border-theme-sidebar-border pt-2">
        <Footer />
      </SidebarFooter>
      {/* No SidebarRail — the icon button in the header is the only way to
          toggle, deliberately, rather than also having a click/drag strip on
          the sidebar's edge. */}
      {showingNewWsModal && <NewWorkspaceModal hideModal={hideNewWsModal} />}
    </SidebarPrimitive>
  );
}

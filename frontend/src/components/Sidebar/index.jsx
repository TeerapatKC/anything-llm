import React, { useEffect, useRef, useState } from "react";
import { List, Plus } from "@phosphor-icons/react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import NewWorkspaceModal, {
  useNewWorkspaceModal,
} from "../Modals/NewWorkspace";
import ActiveWorkspaces from "./ActiveWorkspaces";
import useLogo from "@/hooks/useLogo";
import useUser from "@/hooks/useUser";
import Footer from "../Footer";
import SettingsButton from "../SettingsButton";
import paths from "@/utils/paths";
import { cn } from "@/lib/utils";
import SearchBox from "./SearchBox";
import {
  Sidebar as SidebarPrimitive,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
      {children}
    </SidebarProvider>
  );
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
  const canCreateWorkspace = !user || user?.role !== "default";

  return (
    <SidebarPrimitive collapsible="icon" variant="floating" className="p-0">
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
          <SearchBox user={user} showNewWsModal={showNewWsModal} />
        </div>
        {canCreateWorkspace && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={showNewWsModal}
                aria-label={t("new-workspace.title")}
                className="hidden group-data-[collapsible=icon]:flex mx-auto items-center justify-center h-8 w-8 rounded-lg bg-white hover:bg-white/80 light:hover:bg-slate-300 transition-all duration-300"
              >
                <Plus
                  size={16}
                  weight="bold"
                  className="text-black light:text-slate-500"
                />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-[250px] text-xs">
              {t("new-workspace.title")}
            </TooltipContent>
          </Tooltip>
        )}
      </SidebarHeader>
      <SidebarContent className="px-2 group-data-[collapsible=icon]:hidden">
        <ActiveWorkspaces />
      </SidebarContent>
      <SidebarFooter className="border-t border-theme-sidebar-border pt-2">
        <Footer />
      </SidebarFooter>
      <SidebarRail />
      {showingNewWsModal && <NewWorkspaceModal hideModal={hideNewWsModal} />}
    </SidebarPrimitive>
  );
}

export function SidebarMobileHeader() {
  const { logo } = useLogo();
  const sidebarRef = useRef(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showBgOverlay, setShowBgOverlay] = useState(false);
  const {
    showing: showingNewWsModal,
    showModal: showNewWsModal,
    hideModal: hideNewWsModal,
  } = useNewWorkspaceModal();
  const { user } = useUser();

  useEffect(() => {
    // Darkens the rest of the screen
    // when sidebar is open.
    function handleBg() {
      if (showSidebar) {
        setTimeout(() => {
          setShowBgOverlay(true);
        }, 300);
      } else {
        setShowBgOverlay(false);
      }
    }
    handleBg();
  }, [showSidebar]);

  return (
    <>
      <div
        aria-label="Show sidebar"
        className="fixed top-0 left-0 right-0 z-10 flex justify-between items-center px-4 py-2 bg-theme-bg-sidebar light:bg-white text-slate-200 shadow-lg h-16"
      >
        <button
          onClick={() => setShowSidebar(true)}
          className="rounded-md p-2 flex items-center justify-center text-theme-text-secondary"
        >
          <List className="h-6 w-6" />
        </button>
        <div className="flex items-center justify-center flex-grow">
          <img
            src={logo}
            alt="Logo"
            className="block mx-auto h-6 w-auto"
            style={{ maxHeight: "40px", objectFit: "contain" }}
          />
        </div>
        <div className="w-12"></div>
      </div>
      <div
        style={{
          transform: showSidebar ? `translateX(0vw)` : `translateX(-100vw)`,
        }}
        className={`z-99 fixed top-0 left-0 transition-all duration-500 w-[100vw] h-[100vh]`}
      >
        <div
          className={`${
            showBgOverlay
              ? "transition-all opacity-1"
              : "transition-none opacity-0"
          }  duration-500 fixed top-0 left-0 bg-theme-bg-secondary bg-opacity-75 w-screen h-screen`}
          onClick={() => setShowSidebar(false)}
        />
        <div
          ref={sidebarRef}
          className="relative h-[100vh] fixed top-0 left-0  rounded-r-[26px] bg-theme-bg-sidebar w-[80%] p-[18px] "
        >
          <div className="w-full h-full flex flex-col overflow-x-hidden items-between">
            {/* Header Information */}
            <div className="flex w-full items-center justify-between gap-x-4">
              <div className="flex shrink-1 w-fit items-center justify-start">
                <img
                  src={logo}
                  alt="Logo"
                  className="rounded w-full max-h-[40px]"
                  style={{ objectFit: "contain" }}
                />
              </div>
              {(!user || user?.role !== "default") && (
                <div className="flex gap-x-2 items-center text-slate-500 shink-0">
                  <SettingsButton />
                </div>
              )}
            </div>

            {/* Primary Body */}
            <div className="h-full flex flex-col w-full justify-between pt-4 ">
              <div className="h-auto md:sidebar-items">
                <div className=" flex flex-col gap-y-4 overflow-y-scroll no-scroll pb-[60px]">
                  <NewWorkspaceButton
                    user={user}
                    showNewWsModal={showNewWsModal}
                  />
                  <ActiveWorkspaces />
                </div>
              </div>
              <div className="z-99 absolute bottom-0 left-0 right-0 pt-2 pb-6 rounded-br-[26px] bg-theme-bg-sidebar bg-opacity-80 backdrop-filter backdrop-blur-md">
                <Footer />
              </div>
            </div>
          </div>
        </div>
        {showingNewWsModal && <NewWorkspaceModal hideModal={hideNewWsModal} />}
      </div>
    </>
  );
}

function NewWorkspaceButton({ user, showNewWsModal }) {
  const { t } = useTranslation();
  if (!!user && user?.role === "default") return null;

  return (
    <div className="flex gap-x-2 items-center justify-between">
      <button
        onClick={showNewWsModal}
        className="flex flex-grow w-[75%] h-[44px] gap-x-2 py-[5px] px-4 bg-white rounded-lg text-[#25272C] justify-center items-center hover:bg-opacity-80 transition-all duration-300"
      >
        <Plus className="h-5 w-5" />
        <p className="text-[#25272C] text-sm font-semibold">
          {t("new-workspace.title")}
        </p>
      </button>
    </div>
  );
}

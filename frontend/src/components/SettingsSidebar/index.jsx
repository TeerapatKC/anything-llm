import React, { useEffect, useRef, useState } from "react";
import paths from "@/utils/paths";
import { PERMISSIONS, userCan } from "@/utils/permissions";
import useLogo from "@/hooks/useLogo";
import {
  House,
  List,
  Flask,
  Gear,
  UserCircleGear,
  PencilSimpleLine,
  Toolbox,
  Plugs,
} from "@phosphor-icons/react";
import AgentIcon from "@/media/animations/agent-static.png";
import CommunityHubIcon from "@/media/illustrations/community-hub.png";
import useUser from "@/hooks/useUser";
import { isMobile } from "react-device-detect";
import Footer from "../Footer";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import showToast from "@/utils/toast";
import System from "@/models/system";
import Option from "./MenuOption";
import { CanViewChatHistoryProvider } from "../CanViewChatHistory";
import useAppVersion from "@/hooks/useAppVersion";
import {
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar";

export default function SettingsSidebar() {
  const { t } = useTranslation();
  const { logo } = useLogo();
  const { user } = useUser();
  const sidebarRef = useRef(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showBgOverlay, setShowBgOverlay] = useState(false);

  useEffect(() => {
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

  if (isMobile) {
    return (
      <>
        <div className="fixed top-0 left-0 right-0 z-10 flex justify-between items-center px-4 py-2 bg-theme-bg-sidebar light:bg-white text-theme-text-secondary shadow-lg h-16">
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
            className="h-[100vh] fixed top-0 left-0 rounded-r-[26px] bg-theme-bg-sidebar w-[80%] p-[18px]"
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
                <div className="flex gap-x-2 items-center text-slate-500 shrink-0">
                  <a
                    href={paths.home()}
                    className="transition-all duration-300 p-2 rounded-full text-white bg-theme-action-menu-bg hover:bg-theme-action-menu-item-hover hover:border-slate-100 hover:border-opacity-50 border-transparent border"
                  >
                    <House className="h-4 w-4" />
                  </a>
                </div>
              </div>

              {/* Primary Body */}
              <div className="h-full flex flex-col w-full justify-between pt-4 overflow-y-scroll no-scroll">
                <div className="h-auto md:sidebar-items">
                  <div className="flex flex-col gap-y-4 pb-[60px] overflow-y-scroll no-scroll">
                    <SidebarOptions user={user} t={t} />
                    <div className="h-[1.5px] bg-[#3D4147] mx-3 mt-[14px]" />
                    <SupportEmail />
                    <Link
                      hidden={
                        !!user && !userCan(PERMISSIONS.SYSTEM_SETTINGS, user)
                      }
                      to={paths.settings.privacy()}
                      className="text-theme-text-secondary hover:text-white text-xs leading-[18px] mx-3"
                    >
                      {t("settings.privacy")}
                    </Link>
                    <AppVersion />
                  </div>
                </div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 pt-2 pb-6 rounded-br-[26px] bg-theme-bg-sidebar bg-opacity-80 backdrop-filter backdrop-blur-md">
                <Footer />
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <aside className="flex h-full w-[292px] shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <SidebarHeader className="gap-3 pt-4">
        <div className="flex h-7 items-center justify-between gap-2">
          <Link
            to={paths.home()}
            aria-label="Home"
            className="flex min-w-0 items-center justify-start"
          >
            <img
              src={logo}
              alt="Logo"
              className="rounded max-h-[24px] object-contain"
            />
          </Link>
        </div>
        <div className="text-theme-text-secondary text-sm font-medium uppercase">
          {t("settings.title")}
        </div>
      </SidebarHeader>
      <SidebarContent ref={sidebarRef} className="px-2 no-scroll">
        <div className="h-auto sidebar-items">
          <div className="flex flex-col gap-y-2 pb-[60px]">
            <SidebarOptions user={user} t={t} />
            <div className="h-[1.5px] bg-[#3D4147] mx-3 mt-[14px]" />
            <SupportEmail />
            <Link
              hidden={!!user && !userCan(PERMISSIONS.SYSTEM_SETTINGS, user)}
              to={paths.settings.privacy()}
              className="text-theme-text-secondary hover:text-white hover:light:text-theme-text-primary text-xs leading-[18px] mx-3"
            >
              {t("settings.privacy")}
            </Link>
            <AppVersion />
          </div>
        </div>
      </SidebarContent>
      <SidebarFooter className="border-t border-theme-sidebar-border pt-2">
        <Footer />
      </SidebarFooter>
    </aside>
  );
}

function SupportEmail() {
  const [supportEmail, setSupportEmail] = useState(paths.mailToMintplex());
  const { t } = useTranslation();

  useEffect(() => {
    const fetchSupportEmail = async () => {
      const supportEmail = await System.fetchSupportEmail();
      setSupportEmail(
        supportEmail?.email
          ? `mailto:${supportEmail.email}`
          : paths.mailToMintplex()
      );
    };
    fetchSupportEmail();
  }, []);

  return (
    <Link
      to={supportEmail}
      className="text-theme-text-secondary hover:text-white hover:light:text-theme-text-primary text-xs leading-[18px] mx-3 mt-1"
    >
      {t("settings.contact")}
    </Link>
  );
}

const SidebarOptions = ({ user = null, t }) => (
  <CanViewChatHistoryProvider>
    {({ viewable: canViewChatHistory }) => (
      <>
        <Option
          btnText={t("settings.ai-providers")}
          icon={<Gear className="h-5 w-5 flex-shrink-0" />}
          user={user}
          childOptions={[
            {
              btnText: t("settings.llm"),
              href: paths.settings.llmPreference(),
              permissions: [PERMISSIONS.SYSTEM_SETTINGS],
            },
            {
              btnText: t("settings.vector-database"),
              href: paths.settings.vectorDatabase(),
              permissions: [PERMISSIONS.SYSTEM_SETTINGS],
            },
            {
              btnText: t("settings.embedder"),
              href: paths.settings.embedder.modelPreference(),
              permissions: [PERMISSIONS.SYSTEM_SETTINGS],
            },
            {
              btnText: t("settings.text-splitting"),
              href: paths.settings.embedder.chunkingPreference(),
              permissions: [PERMISSIONS.SYSTEM_SETTINGS],
            },
            {
              btnText: t("settings.image-generation"),
              href: paths.settings.imageGenerationPreference(),
              permissions: [PERMISSIONS.SYSTEM_SETTINGS],
            },
            {
              btnText: t("settings.voice-speech"),
              href: paths.settings.audioPreference(),
              permissions: [PERMISSIONS.SYSTEM_SETTINGS],
            },
            {
              btnText: t("settings.transcription"),
              href: paths.settings.transcriptionPreference(),
              permissions: [PERMISSIONS.SYSTEM_SETTINGS],
            },
            {
              btnText: t("settings.model-router"),
              href: paths.settings.modelRouters(),
              permissions: [PERMISSIONS.SYSTEM_MODEL_ROUTING],
            },
          ]}
        />
        <Option
          btnText={t("settings.admin")}
          icon={<UserCircleGear className="h-5 w-5 flex-shrink-0" />}
          user={user}
          childOptions={[
            {
              btnText: t("settings.users"),
              href: paths.settings.users(),
              permissions: [PERMISSIONS.USERS_VIEW],
            },
            {
              btnText: t("settings.roles"),
              href: paths.settings.roles(),
              permissions: [PERMISSIONS.ROLES_MANAGE],
            },
            {
              btnText: t("settings.workspaces"),
              href: paths.settings.workspaces(),
              permissions: [PERMISSIONS.WORKSPACES_VIEW_ALL],
            },
            {
              hidden: !canViewChatHistory,
              btnText: t("settings.workspace-chats"),
              href: paths.settings.chats(),
              permissions: [PERMISSIONS.CHATS_VIEW_ALL],
            },
            {
              btnText: t("settings.invites"),
              href: paths.settings.invites(),
              permissions: [PERMISSIONS.INVITES_MANAGE],
            },
            {
              btnText: "Default System Prompt",
              href: paths.settings.defaultSystemPrompt(),
              permissions: [PERMISSIONS.SYSTEM_PROMPTS],
            },
          ]}
        />
        <Option
          btnText={t("settings.agent-skills")}
          icon={
            <img
              src={AgentIcon}
              alt="Agent"
              className="h-5 w-5 flex-shrink-0 light:invert"
            />
          }
          href={paths.settings.agentSkills()}
          user={user}
          permissions={[PERMISSIONS.AGENTS_MANAGE_SKILLS]}
        />
        <Option
          btnText={t("settings.community-hub.title")}
          icon={
            <img
              src={CommunityHubIcon}
              alt="Community Hub"
              className="h-5 w-5 flex-shrink-0 light:invert"
            />
          }
          user={user}
          childOptions={[
            {
              btnText: t("settings.community-hub.trending"),
              href: paths.communityHub.trending(),
              permissions: [PERMISSIONS.SYSTEM_COMMUNITY_HUB],
            },
            {
              btnText: t("settings.community-hub.your-account"),
              href: paths.communityHub.authentication(),
              permissions: [PERMISSIONS.SYSTEM_COMMUNITY_HUB],
            },
            {
              btnText: t("settings.community-hub.import-item"),
              href: paths.communityHub.importItem(),
              permissions: [PERMISSIONS.SYSTEM_COMMUNITY_HUB],
            },
          ]}
        />
        <Option
          btnText={t("settings.customization")}
          icon={<PencilSimpleLine className="h-5 w-5 flex-shrink-0" />}
          user={user}
          childOptions={[
            {
              btnText: t("settings.interface"),
              href: paths.settings.interface(),
              permissions: [PERMISSIONS.SYSTEM_APPEARANCE],
            },
            {
              btnText: t("settings.branding"),
              href: paths.settings.branding(),
              permissions: [PERMISSIONS.SYSTEM_APPEARANCE],
            },
            {
              btnText: t("settings.chat"),
              href: paths.settings.chat(),
              permissions: [PERMISSIONS.SYSTEM_APPEARANCE],
            },
          ]}
        />
        <Option
          btnText={t("settings.channels")}
          icon={<Plugs className="h-5 w-5 flex-shrink-0" />}
          user={user}
          childOptions={[
            {
              btnText: t("settings.available-channels.telegram"),
              href: paths.settings.telegram(),
              hidden: !!user,
            },
          ]}
        />
        <Option
          btnText={t("settings.tools")}
          icon={<Toolbox className="h-5 w-5 flex-shrink-0" />}
          user={user}
          childOptions={[
            {
              hidden: !canViewChatHistory,
              btnText: t("settings.embeds"),
              href: paths.settings.embedChatWidgets(),
              permissions: [PERMISSIONS.EMBEDS_MANAGE],
            },
            {
              btnText: t("settings.event-logs"),
              href: paths.settings.logs(),
              permissions: [PERMISSIONS.SYSTEM_EVENT_LOGS],
            },
            {
              btnText: t("settings.scheduled-jobs"),
              href: paths.settings.scheduledJobs(),
              hidden: !!user,
            },
            {
              btnText: t("settings.api-keys"),
              href: paths.settings.apiKeys(),
              permissions: [PERMISSIONS.SYSTEM_API_KEYS],
            },
            {
              btnText: t("settings.system-prompt-variables"),
              href: paths.settings.systemPromptVariables(),
              permissions: [PERMISSIONS.SYSTEM_PROMPTS],
            },
            {
              btnText: t("settings.browser-extension"),
              href: paths.settings.browserExtension(),
              permissions: [PERMISSIONS.SYSTEM_BROWSER_EXTENSION],
            },
            {
              btnText: t("settings.mobile-app"),
              href: paths.settings.mobile(),
              permissions: [PERMISSIONS.SYSTEM_MOBILE],
            },
          ]}
        />
        <HoldToReveal key="exp_features">
          <Option
            btnText={t("settings.experimental-features")}
            icon={<Flask className="h-5 w-5 flex-shrink-0" />}
            href={paths.settings.experimental()}
            user={user}
            permissions={[PERMISSIONS.SYSTEM_EXPERIMENTAL]}
          />
        </HoldToReveal>
      </>
    )}
  </CanViewChatHistoryProvider>
);

function HoldToReveal({ children, holdForMs = 3_000 }) {
  let timeout = null;
  const [showing, setShowing] = useState(
    window.localStorage.getItem(
      "anythingllm_experimental_feature_preview_unlocked"
    )
  );

  useEffect(() => {
    const onPress = (e) => {
      if (!["Control", "Meta"].includes(e.key) || timeout !== null) return;
      timeout = setTimeout(() => {
        setShowing(true);
        // Setting toastId prevents hook spam from holding control too many times or the event not detaching
        showToast("Experimental feature previews unlocked!");
        window.localStorage.setItem(
          "anythingllm_experimental_feature_preview_unlocked",
          "enabled"
        );
        window.removeEventListener("keypress", onPress);
        window.removeEventListener("keyup", onRelease);
        clearTimeout(timeout);
      }, holdForMs);
    };
    const onRelease = (e) => {
      if (!["Control", "Meta"].includes(e.key)) return;
      if (showing) {
        window.removeEventListener("keypress", onPress);
        window.removeEventListener("keyup", onRelease);
        clearTimeout(timeout);
        return;
      }
      clearTimeout(timeout);
    };

    if (!showing) {
      window.addEventListener("keydown", onPress);
      window.addEventListener("keyup", onRelease);
    }
    return () => {
      window.removeEventListener("keydown", onPress);
      window.removeEventListener("keyup", onRelease);
    };
  }, []);

  if (!showing) return null;
  return children;
}

function AppVersion() {
  const { version, isLoading } = useAppVersion();
  if (isLoading) return null;
  return (
    <Link
      to={`https://github.com/Mintplex-Labs/anything-llm/releases/tag/v${version}`}
      target="_blank"
      rel="noreferrer"
      className="text-theme-text-secondary light:opacity-80 opacity-50 text-xs mx-3"
    >
      v{version}
    </Link>
  );
}

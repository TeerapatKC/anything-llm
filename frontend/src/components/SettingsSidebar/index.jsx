import React, { useEffect, useRef, useState } from "react";
import paths from "@/utils/paths";
import { PERMISSIONS, userCan } from "@/utils/permissions";
import useLogo from "@/hooks/useLogo";
import {
  Briefcase,
  FlaskConical,
  PanelLeftIcon,
  PenLine,
  Settings,
  Unplug,
  UserCog,
} from "lucide-react";
import AgentIcon from "@/media/animations/agent-static.png";
import CommunityHubIcon from "@/media/illustrations/community-hub.png";
import useUser from "@/hooks/useUser";
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
import { useIsMobile } from "@/hooks/use-mobile";
import MobileSidebarTopbar from "@/components/Sidebar/MobileTopbar";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

export default function SettingsSidebar() {
  const { t } = useTranslation();
  const { logo } = useLogo();
  const { user } = useUser();
  const isMobile = useIsMobile();
  const sidebarRef = useRef(null);
  const [showSidebar, setShowSidebar] = useState(false);

  if (isMobile) {
    return (
      <>
        <MobileSidebarTopbar onToggle={() => setShowSidebar(true)} />
        <Sheet open={showSidebar} onOpenChange={setShowSidebar}>
          <SheetContent
            data-sidebar="sidebar"
            data-slot="sidebar"
            data-mobile="true"
            className="w-(--sidebar-width) bg-sidebar p-0 text-sidebar-foreground [&>button]:hidden"
            style={{ "--sidebar-width": "18rem" }}
            side="left"
            showCloseButton={false}
          >
            <SheetHeader className="sr-only">
              <SheetTitle>{t("settings.title")}</SheetTitle>
              <SheetDescription>Displays the settings sidebar.</SheetDescription>
            </SheetHeader>
            <div className="flex h-full w-full flex-col">
              <SidebarHeader className="gap-3 pt-4">
                <div className="flex items-center justify-between gap-2">
                  <Link
                    to={paths.home()}
                    aria-label="Home"
                    className="min-w-0"
                  >
                    <img
                      src={logo}
                      alt="Logo"
                      className="rounded max-h-[24px] object-contain"
                    />
                  </Link>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Toggle sidebar"
                    onClick={() => setShowSidebar(false)}
                    className="shrink-0 text-theme-text-secondary hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  >
                    <PanelLeftIcon />
                    <span className="sr-only">Toggle Sidebar</span>
                  </Button>
                </div>
                <div className="text-theme-text-secondary text-sm font-medium uppercase">
                  {t("settings.title")}
                </div>
              </SidebarHeader>
              <SidebarContent ref={sidebarRef} className="px-2 no-scroll">
                <div className="h-auto md:sidebar-items">
                  <div className="flex flex-col gap-y-2 pb-[60px]">
                    <SidebarOptions user={user} t={t} />
                    <div className="h-[1.5px] bg-[#3D4147] mx-3 mt-[14px]" />
                    <SupportEmail />
                    <Link
                      hidden={!userCan(PERMISSIONS.SYSTEM_SETTINGS, user)}
                      to={paths.settings.privacy()}
                      className="text-theme-text-secondary hover:text-white text-xs leading-[18px] mx-3"
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
            </div>
          </SheetContent>
        </Sheet>
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
              hidden={!userCan(PERMISSIONS.SYSTEM_SETTINGS, user)}
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
          icon={<Settings className="h-5 w-5 shrink-0" />}
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
          icon={<UserCog className="h-5 w-5 shrink-0" />}
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
              className="h-5 w-5 shrink-0 light:invert"
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
              className="h-5 w-5 shrink-0 light:invert"
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
          icon={<PenLine className="h-5 w-5 shrink-0" />}
          user={user}
          childOptions={[
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
          icon={<Unplug className="h-5 w-5 shrink-0" />}
          user={user}
          childOptions={[
            {
              btnText: t("settings.available-channels.telegram"),
              href: paths.settings.telegram(),
              permissions: [PERMISSIONS.SUPER_ADMIN],
            },
          ]}
        />
        <Option
          btnText={t("settings.tools")}
          icon={<Briefcase className="h-5 w-5 shrink-0" />}
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
              permissions: [PERMISSIONS.SUPER_ADMIN],
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
              btnText: t("settings.slash-commands"),
              href: paths.settings.slashCommands(),
              permissions: [PERMISSIONS.SYSTEM_SETTINGS],
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
            icon={<FlaskConical className="h-5 w-5 shrink-0" />}
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

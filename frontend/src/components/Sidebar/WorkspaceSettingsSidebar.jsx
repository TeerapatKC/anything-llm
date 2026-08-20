import React from "react";
import { Link, NavLink, useMatch, useParams } from "react-router-dom";
import {
  Bot,
  Database,
  MessageSquareText,
  ShieldCheck,
  SlashSquare,
  Upload,
  User,
  Wrench,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import useLogo from "@/hooks/useLogo";
import useUser from "@/hooks/useUser";
import Footer from "@/components/Footer";
import paths from "@/utils/paths";
import {
  WORKSPACE_PERMISSIONS as WS,
  workspaceCan,
} from "@/utils/permissions";
import {
  Sidebar as SidebarPrimitive,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import WorkspaceMonogram from "@/components/Sidebar/WorkspaceMonogram";

export default function WorkspaceSettingsSidebar({ workspace }) {
  const { t } = useTranslation();
  const { logo } = useLogo();
  const { user } = useUser();
  const { slug } = useParams();
  const workspaceName = workspace?.name || slug;

  const items = [
    {
      title: t("workspaces—settings.general"),
      icon: Wrench,
      to: paths.workspace.settings.generalAppearance(slug),
    },
    {
      title: t("workspaces—settings.chat"),
      icon: MessageSquareText,
      to: paths.workspace.settings.chatSettings(slug),
    },
    {
      title: t("workspaces—settings.vector"),
      icon: Database,
      to: paths.workspace.settings.vectorDatabase(slug),
    },
    {
      title: t("workspaces—settings.members"),
      icon: User,
      to: paths.workspace.settings.members(slug),
      visible: workspaceCan(WS.MEMBERS_MANAGE, slug, user),
    },
    {
      title: "Roles",
      icon: ShieldCheck,
      to: paths.workspace.settings.roles(slug),
      visible: workspaceCan(WS.ROLES_MANAGE, slug, user),
    },
    {
      title: t("workspaces—settings.agent"),
      icon: Bot,
      to: paths.workspace.settings.agentConfig(slug),
    },
    {
      title: t("workspaces—settings.upload-documents"),
      icon: Upload,
      to: paths.workspace.settings.documents(slug),
      visible: workspaceCan(WS.DOCUMENTS_UPLOAD, slug, user),
    },
    {
      title: "Slash Commands",
      icon: SlashSquare,
      to: paths.workspace.settings.slashCommands(slug),
      visible: workspaceCan(WS.SETTINGS_MANAGE, slug, user),
    },
  ];

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
        <Link
          to={paths.workspace.chat(slug)}
          aria-label={`Back to ${workspaceName}`}
          className="flex min-w-0 items-center gap-2 rounded-md px-2 py-2 text-sidebar-foreground hover:bg-sidebar-accent group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0"
        >
          <WorkspaceMonogram
            name={workspaceName}
            isActive
            className="size-8 rounded-lg text-xs"
          />
          <span className="truncate text-lg font-semibold leading-6 group-data-[collapsible=icon]:hidden">
            {workspaceName}
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-2 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:px-0">
        <SidebarGroup className="p-0">
          <SidebarGroupLabel>Workspace settings</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1 group-data-[collapsible=icon]:items-center">
              {items.map((item) => (
                <WorkspaceSettingsMenuItem key={item.to} {...item} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-theme-sidebar-border pt-2">
        <Footer />
      </SidebarFooter>
    </SidebarPrimitive>
  );
}

function WorkspaceSettingsMenuItem({ title, icon: Icon, to, visible = true }) {
  const match = useMatch(to);
  if (!visible) return null;

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={!!match}
        tooltip={title}
        className="group-data-[collapsible=icon]:p-0!"
        render={<NavLink to={to} aria-current={match ? "page" : undefined} />}
      >
        <span className="flex size-4 shrink-0 items-center justify-center group-data-[collapsible=icon]:size-8">
          <Icon className="size-4 group-data-[collapsible=icon]:size-5!" />
        </span>
        <span>{title}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

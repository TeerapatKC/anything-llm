import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Sidebar, { SidebarPageLayout } from "@/components/Sidebar";
import Workspace from "@/models/workspace";
import { WORKSPACE_PERMISSIONS as WS, workspaceCan } from "@/utils/permissions";
import PasswordModal, { usePasswordModal } from "@/components/Modals/Password";
import { FullScreenLoader } from "@/components/Preloader";
import {
  Bot,
  Database,
  MessageSquareText,
  ShieldCheck,
  Undo2,
  Upload,
  User,
  Wrench,
} from "lucide-react";
import paths from "@/utils/paths";
import { Link } from "react-router-dom";
import { NavLink } from "react-router-dom";
import GeneralAppearance from "./GeneralAppearance";
import ChatSettings from "./ChatSettings";
import VectorDatabase from "./VectorDatabase";
import Members from "./Members";
import WorkspaceAgentConfiguration from "./AgentConfig";
import WorkspaceRoles from "./Roles";
import WorkspaceDocuments from "./Documents";
import useUser from "@/hooks/useUser";
import { useTranslation } from "react-i18next";
import System from "@/models/system";
import { cn } from "@/lib/utils";

const TABS = {
  "general-appearance": GeneralAppearance,
  "chat-settings": ChatSettings,
  "vector-database": VectorDatabase,
  members: Members,
  roles: WorkspaceRoles,
  "agent-config": WorkspaceAgentConfiguration,
  documents: WorkspaceDocuments,
};

export default function WorkspaceSettings() {
  const { loading, requiresAuth } = usePasswordModal();

  if (loading) return <FullScreenLoader />;
  if (requiresAuth !== false) {
    return <>{requiresAuth !== null && <PasswordModal />}</>;
  }

  return <ShowWorkspaceChat />;
}

function ShowWorkspaceChat() {
  const { t } = useTranslation();
  const { slug, tab } = useParams();
  const { user } = useUser();
  const [workspace, setWorkspace] = useState(null);
  const [deletionProtected, setDeletionProtected] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function getWorkspace() {
      if (!slug) return;
      const _workspace = await Workspace.bySlug(slug);
      if (!_workspace) {
        setLoading(false);
        return;
      }

      const _settings = await System.keys();
      const suggestedMessages = await Workspace.getSuggestedMessages(slug);
      setWorkspace({
        ..._workspace,
        vectorDB: _settings?.VectorDB,
        suggestedMessages,
      });
      setDeletionProtected(_settings?.WorkspaceDeletionProtection === true);
      setLoading(false);
    }
    getWorkspace();
  }, [slug, tab]);

  if (loading) return <FullScreenLoader />;

  const TabContent = TABS[tab];
  return (
    <SidebarPageLayout>
      <Sidebar />
      <div
        style={{ height: "100%" }}
        className="transition-all duration-500 relative bg-theme-bg-secondary w-full h-full overflow-y-scroll"
      >
        <div className="flex items-center gap-x-4 pt-[80px] pb-4 ml-16 mr-8 border-b-2 border-white light:border-theme-chat-input-border border-opacity-10 overflow-x-auto overflow-y-hidden thin-scrollbar md:pt-6">
          <Link
            to={paths.workspace.chat(slug)}
            className="absolute top-[64px] left-2 md:top-4 md:left-4 transition-all duration-300 p-2 rounded-full text-white bg-theme-sidebar-footer-icon hover:bg-theme-sidebar-footer-icon-hover z-10"
          >
            <Undo2 className="h-4 w-4" />
          </Link>
          <div className="inline-flex items-center gap-x-1 rounded-md bg-muted p-1 text-muted-foreground shrink-0">
            <TabItem
              title={t("workspaces—settings.general")}
              icon={<Wrench className="h-4 w-4" />}
              to={paths.workspace.settings.generalAppearance(slug)}
            />
            <TabItem
              title={t("workspaces—settings.chat")}
              icon={<MessageSquareText className="h-4 w-4" />}
              to={paths.workspace.settings.chatSettings(slug)}
            />
            <TabItem
              title={t("workspaces—settings.vector")}
              icon={<Database className="h-4 w-4" />}
              to={paths.workspace.settings.vectorDatabase(slug)}
            />
            <TabItem
              title={t("workspaces—settings.members")}
              icon={<User className="h-4 w-4" />}
              to={paths.workspace.settings.members(slug)}
              visible={workspaceCan(WS.MEMBERS_MANAGE, workspace?.slug, user)}
            />
            <TabItem
              title="Roles"
              icon={<ShieldCheck className="h-4 w-4" />}
              to={paths.workspace.settings.roles(slug)}
              visible={workspaceCan(WS.ROLES_MANAGE, workspace?.slug, user)}
            />
            <TabItem
              title={t("workspaces—settings.agent")}
              icon={<Bot className="h-4 w-4" />}
              to={paths.workspace.settings.agentConfig(slug)}
            />
            <TabItem
              title={t("workspaces—settings.upload-documents")}
              icon={<Upload className="h-4 w-4" />}
              to={paths.workspace.settings.documents(slug)}
              visible={workspaceCan(WS.DOCUMENTS_UPLOAD, slug, user)}
            />
          </div>
        </div>
        <div className="px-16 py-6">
          <TabContent
            slug={slug}
            workspace={workspace}
            deletionProtected={deletionProtected}
          />
        </div>
      </div>
    </SidebarPageLayout>
  );
}

function TabItem({ title, icon, to, visible = true }) {
  if (!visible) return null;
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          "inline-flex items-center justify-center gap-x-1.5 whitespace-nowrap rounded-sm px-3 py-1.5 text-xs font-medium shrink-0 transition-all",
          isActive
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )
      }
    >
      {icon}
      <div>{title}</div>
    </NavLink>
  );
}

import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { SidebarPageLayout } from "@/components/Sidebar";
import WorkspaceSettingsSidebar from "@/components/Sidebar/WorkspaceSettingsSidebar";
import Workspace from "@/models/workspace";
import PasswordModal, { usePasswordModal } from "@/components/Modals/Password";
import { FullScreenLoader } from "@/components/Preloader";
import GeneralAppearance from "./GeneralAppearance";
import ChatSettings from "./ChatSettings";
import VectorDatabase from "./VectorDatabase";
import Members from "./Members";
import WorkspaceAgentConfiguration from "./AgentConfig";
import WorkspaceRoles from "./Roles";
import WorkspaceDocuments from "./Documents";
import WorkspaceSlashCommands from "./SlashCommands";
import System from "@/models/system";

const TABS = {
  "general-appearance": GeneralAppearance,
  "chat-settings": ChatSettings,
  "vector-database": VectorDatabase,
  members: Members,
  roles: WorkspaceRoles,
  "agent-config": WorkspaceAgentConfiguration,
  documents: WorkspaceDocuments,
  "slash-commands": WorkspaceSlashCommands,
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
  const { slug, tab } = useParams();
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
  }, [slug]);

  if (loading) return <FullScreenLoader />;

  const TabContent = TABS[tab];
  return (
    <SidebarPageLayout>
      <WorkspaceSettingsSidebar workspace={workspace} />
      <div
        style={{ height: "100%" }}
        className="thin-scrollbar transition-all duration-500 relative min-w-0 bg-theme-bg-secondary w-full h-full overflow-y-scroll"
      >
        <div className="px-4 pb-6 pt-20 min-[1100px]:px-16 min-[1100px]:pt-6">
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

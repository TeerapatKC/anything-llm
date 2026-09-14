import React, { useEffect, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import paths from "@/utils/paths";
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
import WorkspaceScheduledJobs from "./ScheduledJobs";
import System from "@/models/system";
import ContextualSaveBar from "@/components/ContextualSaveBar";
import useContextualSaveBars from "@/hooks/useContextualSaveBars";

const TABS = {
  "general-appearance": GeneralAppearance,
  "chat-settings": ChatSettings,
  "vector-database": VectorDatabase,
  members: Members,
  roles: WorkspaceRoles,
  "agent-config": WorkspaceAgentConfiguration,
  documents: WorkspaceDocuments,
  "slash-commands": WorkspaceSlashCommands,
  "scheduled-jobs": WorkspaceScheduledJobs,
};
const FORM_TABS = [
  "general-appearance",
  "chat-settings",
  "vector-database",
  "agent-config",
];
const SAVE_BAR_LABELS = {
  "general-appearance:name": "Workspace name",
  "general-appearance:messages": "Suggested chat messages",
  "chat-settings:form": "Chat settings",
  "vector-database:form": "Vector database",
  "agent-config:model": "Agent model",
  "agent-config:skills": "Agent skills",
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

  // A private workspace has no settings, so there is nothing here to show its owner or
  // anyone else. The server refuses the writes either way; this keeps a typed URL from
  // rendering screens whose every save would come back refused.
  if (workspace?.type === "personal")
    return <Navigate to={paths.workspace.chat(slug)} replace />;

  const TabContent = TABS[tab];
  // An unknown tab used to render `undefined` as a component, which throws and takes
  // the whole page down with a React error rather than showing anything useful. A
  // retired tab still sitting in someone's bookmarks is the common way to land here -
  // agent flows moved into Agent Configuration, for instance.
  if (!TabContent) return <Navigate to={paths.workspace.chat(slug)} replace />;

  return (
    <WorkspaceSettingsContent
      key={slug}
      slug={slug}
      tab={tab}
      workspace={workspace}
      deletionProtected={deletionProtected}
      TabContent={TabContent}
      onWorkspaceSaved={(updated) =>
        setWorkspace((current) => ({ ...current, ...updated }))
      }
    />
  );
}

function WorkspaceSettingsContent({
  slug,
  tab,
  workspace,
  deletionProtected,
  TabContent,
  onWorkspaceSaved,
}) {
  const [visitedTabs, setVisitedTabs] = useState([tab]);
  const { saveBars, saveBarActions, registerSaveBar } = useContextualSaveBars();

  useEffect(() => {
    if (!FORM_TABS.includes(tab)) return;
    setVisitedTabs((current) =>
      current.includes(tab) ? current : [...current, tab]
    );
  }, [tab]);

  const dirtyId = Object.keys(saveBars).find(
    (id) => id.startsWith(`${tab}:`) && saveBars[id]?.showing
  );

  function saveBarProps(id) {
    return { id, register: registerSaveBar };
  }

  function renderFormTab(section) {
    const Component = TABS[section];
    const common = { slug, workspace, deletionProtected, onWorkspaceSaved };
    if (section === "general-appearance")
      return (
        <Component
          {...common}
          saveBarProps={saveBarProps("general-appearance:name")}
          suggestedSaveBarProps={saveBarProps("general-appearance:messages")}
        />
      );
    if (section === "agent-config")
      return (
        <Component
          {...common}
          contextualSaveBar
          saveBarProps={saveBarProps("agent-config:model")}
          skillSaveBarProps={saveBarProps("agent-config:skills")}
        />
      );
    return (
      <Component {...common} saveBarProps={saveBarProps(`${section}:form`)} />
    );
  }

  return (
    <SidebarPageLayout>
      <WorkspaceSettingsSidebar workspace={workspace} />
      <div
        style={{ height: "100%" }}
        className="thin-scrollbar transition-all duration-500 relative min-w-0 bg-theme-bg-secondary w-full h-full overflow-y-scroll"
      >
        <div className="px-4 pb-6 pt-20 min-[1100px]:px-16 min-[1100px]:pt-6">
          {FORM_TABS.map((section) =>
            visitedTabs.includes(section) || tab === section ? (
              <div key={section} hidden={tab !== section}>
                {renderFormTab(section)}
              </div>
            ) : null
          )}
          {!FORM_TABS.includes(tab) && (
            <TabContent
              slug={slug}
              workspace={workspace}
              deletionProtected={deletionProtected}
            />
          )}
        </div>
      </div>
      <ContextualSaveBar
        showing={Boolean(dirtyId)}
        saving={saveBars[dirtyId]?.saving}
        description={SAVE_BAR_LABELS[dirtyId]}
        onSave={() => saveBarActions.current[dirtyId]?.current?.onSave?.()}
        onCancel={() => saveBarActions.current[dirtyId]?.current?.onCancel?.()}
      />
    </SidebarPageLayout>
  );
}

import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import App from "@/App.jsx";
import PrivateRoute, {
  PermissionRoute,
  WorkspacePermissionRoute,
  SuperAdminRoute,
} from "@/components/PrivateRoute";
import { PERMISSIONS, WORKSPACE_PERMISSIONS } from "@/utils/permissions";
import Login from "@/pages/Login";
import SimpleSSOPassthrough from "@/pages/Login/SSO/simple";
import OnboardingFlow from "@/pages/OnboardingFlow";
import { RouteErrorBoundary } from "@/components/ErrorBoundaryFallback";
import "@/index.css";

const isDev = import.meta.env.DEV;
const REACTWRAP = isDev ? React.Fragment : React.StrictMode;

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    errorElement: <RouteErrorBoundary />,
    children: [
      {
        path: "/",
        lazy: async () => {
          const { default: Main } = await import("@/pages/Main");
          return { element: <PrivateRoute Component={Main} /> };
        },
      },
      {
        path: "/login",
        element: <Login />,
      },
      {
        path: "/change-password",
        lazy: async () => {
          const { default: ChangePassword } = await import(
            "@/pages/ChangePassword"
          );
          return { element: <ChangePassword /> };
        },
      },
      {
        path: "/sso/simple",
        element: <SimpleSSOPassthrough />,
      },
      {
        path: "/workspace/:slug/settings/:tab",
        lazy: async () => {
          const { default: WorkspaceSettings } = await import(
            "@/pages/WorkspaceSettings"
          );
          return {
            element: (
              <WorkspacePermissionRoute
                Component={WorkspaceSettings}
                permissions={[
                  WORKSPACE_PERMISSIONS.SETTINGS_MANAGE,
                  WORKSPACE_PERMISSIONS.MEMBERS_MANAGE,
                  WORKSPACE_PERMISSIONS.ROLES_MANAGE,
                  WORKSPACE_PERMISSIONS.AGENTS_MANAGE,
                  WORKSPACE_PERMISSIONS.DOCUMENTS_MANAGE,
                ]}
              />
            ),
          };
        },
      },
      {
        path: "/workspace/:slug",
        lazy: async () => {
          const { default: WorkspaceChat } = await import(
            "@/pages/WorkspaceChat"
          );
          return { element: <PrivateRoute Component={WorkspaceChat} /> };
        },
        children: [{ path: "t/:threadSlug" }],
      },
      {
        path: "/accept-invite/:code",
        lazy: async () => {
          const { default: InvitePage } = await import("@/pages/Invite");
          return { element: <InvitePage /> };
        },
      },
      // Admin routes
      {
        path: "/settings/llm-preference",
        lazy: async () => {
          const { default: GeneralLLMPreference } = await import(
            "@/pages/GeneralSettings/LLMPreference"
          );
          return {
            element: (
              <PermissionRoute
                Component={GeneralLLMPreference}
                permissions={[PERMISSIONS.SYSTEM_SETTINGS_LLM]}
              />
            ),
          };
        },
      },
      {
        path: "/settings/transcription-preference",
        lazy: async () => {
          const { default: GeneralTranscriptionPreference } = await import(
            "@/pages/GeneralSettings/TranscriptionPreference"
          );
          return {
            element: (
              <PermissionRoute
                Component={GeneralTranscriptionPreference}
                permissions={[PERMISSIONS.SYSTEM_SETTINGS_TRANSCRIPTION]}
              />
            ),
          };
        },
      },
      {
        path: "/settings/audio-preference",
        lazy: async () => {
          const { default: GeneralAudioPreference } = await import(
            "@/pages/GeneralSettings/AudioPreference"
          );
          return {
            element: (
              <PermissionRoute
                Component={GeneralAudioPreference}
                permissions={[PERMISSIONS.SYSTEM_SETTINGS_TRANSCRIPTION]}
              />
            ),
          };
        },
      },
      {
        path: "/settings/embedding-preference",
        lazy: async () => {
          const { default: GeneralEmbeddingPreference } = await import(
            "@/pages/GeneralSettings/EmbeddingPreference"
          );
          return {
            element: (
              <PermissionRoute
                Component={GeneralEmbeddingPreference}
                permissions={[PERMISSIONS.SYSTEM_SETTINGS_EMBEDDER]}
              />
            ),
          };
        },
      },
      {
        path: "/settings/image-generation-preference",
        lazy: async () => {
          const { default: ImageGenerationPreference } = await import(
            "@/pages/GeneralSettings/ImageGenerationPreference"
          );
          return {
            element: (
              <PermissionRoute
                Component={ImageGenerationPreference}
                permissions={[PERMISSIONS.SYSTEM_SETTINGS_IMAGE_GENERATION]}
              />
            ),
          };
        },
      },
      {
        path: "/settings/text-splitter-preference",
        lazy: async () => {
          const { default: EmbeddingTextSplitterPreference } = await import(
            "@/pages/GeneralSettings/EmbeddingTextSplitterPreference"
          );
          return {
            element: (
              <PermissionRoute
                Component={EmbeddingTextSplitterPreference}
                permissions={[PERMISSIONS.SYSTEM_SETTINGS_TEXT_SPLITTING]}
              />
            ),
          };
        },
      },
      {
        path: "/settings/vector-database",
        lazy: async () => {
          const { default: GeneralVectorDatabase } = await import(
            "@/pages/GeneralSettings/VectorDatabase"
          );
          return {
            element: (
              <PermissionRoute
                Component={GeneralVectorDatabase}
                permissions={[PERMISSIONS.SYSTEM_SETTINGS_VECTOR_DB]}
              />
            ),
          };
        },
      },
      {
        path: "/settings/agents",
        lazy: async () => {
          const { default: AdminAgents } = await import("@/pages/Admin/Agents");
          return {
            element: (
              <PermissionRoute
                Component={AdminAgents}
                permissions={[PERMISSIONS.AGENTS_MANAGE_SKILLS]}
              />
            ),
          };
        },
      },
      {
        path: "/settings/agents/builder",
        lazy: async () => {
          const { default: AgentBuilder } = await import(
            "@/pages/Admin/AgentBuilder"
          );
          return {
            element: (
              <PermissionRoute
                Component={AgentBuilder}
                permissions={[PERMISSIONS.AGENTS_FLOWS]}
                hideUserMenu={true}
              />
            ),
          };
        },
      },
      {
        path: "/settings/agents/builder/:flowId",
        lazy: async () => {
          const { default: AgentBuilder } = await import(
            "@/pages/Admin/AgentBuilder"
          );
          return {
            element: (
              <PermissionRoute
                Component={AgentBuilder}
                permissions={[PERMISSIONS.AGENTS_FLOWS]}
                hideUserMenu={true}
              />
            ),
          };
        },
      },
      {
        path: "/settings/event-logs",
        lazy: async () => {
          const { default: AdminLogs } = await import("@/pages/Admin/Logging");
          return {
            element: (
              <PermissionRoute
                Component={AdminLogs}
                permissions={[PERMISSIONS.SYSTEM_EVENT_LOGS]}
              />
            ),
          };
        },
      },
      {
        path: "/settings/embed-chat-widgets",
        lazy: async () => {
          const { default: ChatEmbedWidgets } = await import(
            "@/pages/GeneralSettings/ChatEmbedWidgets"
          );
          return {
            element: (
              <PermissionRoute
                Component={ChatEmbedWidgets}
                permissions={[PERMISSIONS.EMBEDS_MANAGE]}
              />
            ),
          };
        },
      },
      // Manager routes
      {
        path: "/settings/privacy",
        lazy: async () => {
          const { default: PrivacyAndData } = await import(
            "@/pages/GeneralSettings/PrivacyAndData"
          );
          return {
            element: (
              <PermissionRoute
                Component={PrivacyAndData}
                permissions={[PERMISSIONS.SYSTEM_SETTINGS]}
              />
            ),
          };
        },
      },
      {
        path: "/settings/branding",
        lazy: async () => {
          const { default: BrandingSettings } = await import(
            "@/pages/GeneralSettings/Settings/Branding"
          );
          return {
            element: (
              <PermissionRoute
                Component={BrandingSettings}
                permissions={[PERMISSIONS.SYSTEM_APPEARANCE]}
              />
            ),
          };
        },
      },
      {
        path: "/settings/default-system-prompt",
        lazy: async () => {
          const { default: DefaultSystemPrompt } = await import(
            "@/pages/Admin/DefaultSystemPrompt"
          );
          return {
            element: (
              <PermissionRoute
                Component={DefaultSystemPrompt}
                permissions={[PERMISSIONS.SYSTEM_PROMPTS]}
              />
            ),
          };
        },
      },
      {
        path: "/settings/chat",
        lazy: async () => {
          const { default: ChatSettings } = await import(
            "@/pages/GeneralSettings/Settings/Chat"
          );
          return {
            element: (
              <PermissionRoute
                Component={ChatSettings}
                permissions={[PERMISSIONS.SYSTEM_APPEARANCE]}
              />
            ),
          };
        },
      },
      {
        path: "/settings/beta-features",
        lazy: async () => {
          const { default: ExperimentalFeatures } = await import(
            "@/pages/Admin/ExperimentalFeatures"
          );
          return {
            element: (
              <PermissionRoute
                Component={ExperimentalFeatures}
                permissions={[PERMISSIONS.SYSTEM_EXPERIMENTAL]}
              />
            ),
          };
        },
      },
      {
        path: "/settings/api-keys",
        lazy: async () => {
          const { default: GeneralApiKeys } = await import(
            "@/pages/GeneralSettings/ApiKeys"
          );
          return {
            element: (
              <PermissionRoute
                Component={GeneralApiKeys}
                permissions={[PERMISSIONS.SYSTEM_API_KEYS]}
              />
            ),
          };
        },
      },
      {
        path: "/settings/model-routers",
        lazy: async () => {
          const { default: ModelRouters } = await import(
            "@/pages/GeneralSettings/ModelRouters"
          );
          return {
            element: (
              <PermissionRoute
                Component={ModelRouters}
                permissions={[PERMISSIONS.SYSTEM_MODEL_ROUTING]}
              />
            ),
          };
        },
      },
      {
        path: "/settings/model-routers/:id",
        lazy: async () => {
          const { default: RouterRulesPage } = await import(
            "@/pages/GeneralSettings/ModelRouters/RouterRulesPage"
          );
          return {
            element: (
              <PermissionRoute
                Component={RouterRulesPage}
                permissions={[PERMISSIONS.SYSTEM_MODEL_ROUTING]}
              />
            ),
          };
        },
      },
      {
        path: "/settings/slash-commands",
        lazy: async () => {
          const { default: BuiltInSlashCommands } = await import(
            "@/pages/Admin/SlashCommands"
          );
          return {
            element: (
              <PermissionRoute
                Component={BuiltInSlashCommands}
                permissions={[PERMISSIONS.SYSTEM_SETTINGS]}
              />
            ),
          };
        },
      },
      {
        path: "/settings/system-prompt-variables",
        lazy: async () => {
          const { default: SystemPromptVariables } = await import(
            "@/pages/Admin/SystemPromptVariables"
          );
          return {
            element: (
              <PermissionRoute
                Component={SystemPromptVariables}
                permissions={[PERMISSIONS.SYSTEM_PROMPTS]}
              />
            ),
          };
        },
      },
      {
        path: "/settings/browser-extension",
        lazy: async () => {
          const { default: GeneralBrowserExtension } = await import(
            "@/pages/GeneralSettings/BrowserExtensionApiKey"
          );
          return {
            element: (
              <PermissionRoute
                Component={GeneralBrowserExtension}
                permissions={[PERMISSIONS.SYSTEM_BROWSER_EXTENSION]}
              />
            ),
          };
        },
      },
      {
        path: "/settings/workspace-chats",
        lazy: async () => {
          const { default: GeneralChats } = await import(
            "@/pages/GeneralSettings/Chats"
          );
          return {
            element: (
              <PermissionRoute
                Component={GeneralChats}
                permissions={[PERMISSIONS.CHATS_VIEW_ALL]}
              />
            ),
          };
        },
      },
      {
        path: "/settings/invites",
        lazy: async () => {
          const { default: AdminInvites } = await import(
            "@/pages/Admin/Invitations"
          );
          return {
            element: (
              <PermissionRoute
                Component={AdminInvites}
                permissions={[PERMISSIONS.INVITES_MANAGE]}
              />
            ),
          };
        },
      },
      {
        path: "/settings",
        lazy: async () => {
          const { default: SettingsLanding } = await import(
            "@/pages/GeneralSettings/Landing"
          );
          return { element: <PrivateRoute Component={SettingsLanding} /> };
        },
      },
      {
        path: "/settings/roles",
        lazy: async () => {
          const { default: AdminRoles } = await import("@/pages/Admin/Roles");
          return {
            element: (
              <PermissionRoute
                Component={AdminRoles}
                permissions={[PERMISSIONS.ROLES_MANAGE]}
              />
            ),
          };
        },
      },
      {
        // Gated on being the instance owner rather than on a permission - the screens
        // behind it must never become reachable by ticking a box on a custom role.
        path: "/settings/instance-owner",
        lazy: async () => {
          const { default: AdminSuperAdmin } = await import(
            "@/pages/Admin/SuperAdmin"
          );
          return { element: <SuperAdminRoute Component={AdminSuperAdmin} /> };
        },
      },
      {
        path: "/settings/users",
        lazy: async () => {
          const { default: AdminUsers } = await import("@/pages/Admin/Users");
          return {
            element: (
              <PermissionRoute
                Component={AdminUsers}
                permissions={[PERMISSIONS.USERS_VIEW]}
              />
            ),
          };
        },
      },
      {
        path: "/settings/workspaces",
        lazy: async () => {
          const { default: AdminWorkspaces } = await import(
            "@/pages/Admin/Workspaces"
          );
          return {
            element: (
              <PermissionRoute
                Component={AdminWorkspaces}
                permissions={[PERMISSIONS.WORKSPACES_VIEW_ALL]}
              />
            ),
          };
        },
      },
      // Onboarding Flow
      {
        path: "/onboarding",
        element: <OnboardingFlow />,
      },
      {
        path: "/onboarding/:step",
        element: <OnboardingFlow />,
      },
      // Experimental feature pages
      {
        path: "/settings/beta-features/live-document-sync/manage",
        lazy: async () => {
          const { default: LiveDocumentSyncManage } = await import(
            "@/pages/Admin/ExperimentalFeatures/Features/LiveSync/manage"
          );
          return {
            element: (
              <PermissionRoute
                Component={LiveDocumentSyncManage}
                permissions={[PERMISSIONS.SYSTEM_EXPERIMENTAL]}
              />
            ),
          };
        },
      },
      {
        path: "/settings/community-hub/trending",
        lazy: async () => {
          const { default: CommunityHubTrending } = await import(
            "@/pages/GeneralSettings/CommunityHub/Trending"
          );
          return {
            element: (
              <PermissionRoute
                Component={CommunityHubTrending}
                permissions={[PERMISSIONS.SYSTEM_COMMUNITY_HUB]}
              />
            ),
          };
        },
      },
      {
        path: "/settings/community-hub/authentication",
        lazy: async () => {
          const { default: CommunityHubAuthentication } = await import(
            "@/pages/GeneralSettings/CommunityHub/Authentication"
          );
          return {
            element: (
              <PermissionRoute
                Component={CommunityHubAuthentication}
                permissions={[PERMISSIONS.SYSTEM_COMMUNITY_HUB]}
              />
            ),
          };
        },
      },
      {
        path: "/settings/community-hub/import-item",
        lazy: async () => {
          const { default: CommunityHubImportItem } = await import(
            "@/pages/GeneralSettings/CommunityHub/ImportItem"
          );
          return {
            element: (
              <PermissionRoute
                Component={CommunityHubImportItem}
                permissions={[PERMISSIONS.SYSTEM_COMMUNITY_HUB]}
              />
            ),
          };
        },
      },
      {
        path: "/settings/mobile-connections",
        lazy: async () => {
          const { default: MobileConnections } = await import(
            "@/pages/GeneralSettings/MobileConnections"
          );
          return {
            element: (
              <PermissionRoute
                Component={MobileConnections}
                permissions={[PERMISSIONS.SYSTEM_MOBILE]}
              />
            ),
          };
        },
      },
      {
        path: "/settings/external-connections/telegram",
        lazy: async () => {
          const { default: TelegramBotSettings } = await import(
            "@/pages/GeneralSettings/Connections/TelegramBot"
          );
          return {
            element: (
              <PermissionRoute
                Component={TelegramBotSettings}
                permissions={[PERMISSIONS.INTEGRATIONS_TELEGRAM]}
              />
            ),
          };
        },
      },
      {
        path: "/settings/scheduled-jobs",
        lazy: async () => {
          const { default: ScheduledJobs } = await import(
            "@/pages/GeneralSettings/ScheduledJobs"
          );
          return {
            element: (
              <PermissionRoute
                Component={ScheduledJobs}
                permissions={[PERMISSIONS.AGENTS_SCHEDULED_JOBS]}
              />
            ),
          };
        },
      },
      {
        path: "/settings/scheduled-jobs/:id/runs",
        lazy: async () => {
          const { default: ScheduledJobRuns } = await import(
            "@/pages/GeneralSettings/ScheduledJobs/RunHistoryPage"
          );
          return {
            element: (
              <PermissionRoute
                Component={ScheduledJobRuns}
                permissions={[PERMISSIONS.AGENTS_SCHEDULED_JOBS]}
              />
            ),
          };
        },
      },
      {
        path: "/settings/scheduled-jobs/:id/runs/:runId",
        lazy: async () => {
          const { default: ScheduledJobRunDetail } = await import(
            "@/pages/GeneralSettings/ScheduledJobs/RunDetailPage"
          );
          return {
            element: (
              <PermissionRoute
                Component={ScheduledJobRunDetail}
                permissions={[PERMISSIONS.AGENTS_SCHEDULED_JOBS]}
              />
            ),
          };
        },
      },
      // Catch-all route for 404s
      {
        path: "*",
        lazy: async () => {
          const { default: NotFound } = await import("@/pages/404");
          return { element: <NotFound /> };
        },
      },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root")).render(
  <REACTWRAP>
    <RouterProvider router={router} />
  </REACTWRAP>
);

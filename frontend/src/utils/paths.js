import { API_BASE } from "./constants";

/**
 * Check if a href matches the current pathname.
 * Matches exactly or as a parent path (e.g. /settings/model-routers matches /settings/model-routers/1).
 */
export function isPathMatch(href, pathname) {
  return pathname === href || pathname.startsWith(href + "/");
}

function applyOptions(path, options = {}) {
  let updatedPath = path;
  if (!options || Object.keys(options).length === 0) return updatedPath;

  if (options.search) {
    const searchParams = new URLSearchParams(options.search);
    updatedPath += `?${searchParams.toString()}`;
  }
  return updatedPath;
}

export default {
  home: () => {
    return "/";
  },
  login: (noTry = false) => {
    return `/login${noTry ? "?nt=1" : ""}`;
  },
  changePassword: () => {
    return "/change-password";
  },
  sso: {
    login: () => {
      return "/sso/simple";
    },
  },
  onboarding: {
    home: () => {
      return "/onboarding";
    },
    userSetup: () => {
      return "/onboarding/user-setup";
    },
  },
  discord: () => {
    return "https://discord.com/invite/6UyHPeGZAC";
  },
  workspace: {
    chat: (slug, options = {}) => {
      return applyOptions(`/workspace/${slug}`, options);
    },
    settings: {
      generalAppearance: (slug) => {
        return `/workspace/${slug}/settings/general-appearance`;
      },
      chatSettings: function (slug, options = {}) {
        return applyOptions(
          `/workspace/${slug}/settings/chat-settings`,
          options
        );
      },
      vectorDatabase: (slug) => {
        return `/workspace/${slug}/settings/vector-database`;
      },
      members: (slug) => {
        return `/workspace/${slug}/settings/members`;
      },
      agentConfig: (slug) => {
        return `/workspace/${slug}/settings/agent-config`;
      },
      roles: (slug) => {
        return `/workspace/${slug}/settings/roles`;
      },
      documents: (slug) => {
        return `/workspace/${slug}/settings/documents`;
      },
      slashCommands: (slug) => {
        return `/workspace/${slug}/settings/slash-commands`;
      },
    },
    thread: (wsSlug, threadSlug) => {
      return `/workspace/${wsSlug}/t/${threadSlug}`;
    },
    // The flow builder scoped to one workspace. Same screen as the instance-wide builder
    // at `agents.builder()`, but everything it saves belongs to this workspace.
    agents: {
      builder: (slug) => {
        return `/workspace/${slug}/agents/builder`;
      },
      editFlow: (slug, uuid) => {
        return `/workspace/${slug}/agents/builder/${uuid}`;
      },
    },
  },
  apiDocs: () => {
    return `${API_BASE}/docs`;
  },
  settings: {
    // Resolves to the first settings screen the user may open - see
    // pages/GeneralSettings/Landing. Deliberately not an alias for any one page.
    landing: () => {
      return "/settings";
    },
    roles: () => {
      return `/settings/roles`;
    },
    superAdmin: () => {
      return `/settings/instance-owner`;
    },
    smtp: () => {
      return `/settings/smtp`;
    },
    users: () => {
      return `/settings/users`;
    },
    invites: () => {
      return `/settings/invites`;
    },
    workspaces: () => {
      return `/settings/workspaces`;
    },
    chats: () => {
      return "/settings/workspace-chats";
    },
    llmPreference: () => {
      return "/settings/llm-preference";
    },
    transcriptionPreference: () => {
      return "/settings/transcription-preference";
    },
    audioPreference: () => {
      return "/settings/audio-preference";
    },
    defaultSystemPrompt: () => {
      return "/settings/default-system-prompt";
    },
    embedder: {
      modelPreference: () => "/settings/embedding-preference",
      chunkingPreference: () => "/settings/text-splitter-preference",
    },
    embeddingPreference: () => {
      return "/settings/embedding-preference";
    },
    imageGenerationPreference: () => {
      return "/settings/image-generation-preference";
    },
    vectorDatabase: () => {
      return "/settings/vector-database";
    },
    branding: () => {
      return "/settings/branding";
    },
    agentSkills: () => {
      return "/settings/agents";
    },
    agentFlow: () => {
      return "/settings/agent-flows";
    },
    sqlConnector: () => {
      return "/settings/sql-connector";
    },
    chat: () => {
      return "/settings/chat";
    },
    apiKeys: () => {
      return "/settings/api-keys";
    },
    modelRouters: () => {
      return "/settings/model-routers";
    },
    modelRouterRules: (id) => {
      return `/settings/model-routers/${id}`;
    },
    systemPromptVariables: () => "/settings/system-prompt-variables",
    slashCommands: () => "/settings/slash-commands",
    logs: () => {
      return "/settings/event-logs";
    },
    monitoring: () => {
      return "/settings/monitoring";
    },
    privacy: () => {
      return "/settings/privacy";
    },
    embedChatWidgets: () => {
      return `/settings/embed-chat-widgets`;
    },
    telegram: () => {
      return `/settings/external-connections/telegram`;
    },
    line: () => {
      return `/settings/external-connections/line`;
    },
    scheduledJobs: () => {
      return `/settings/scheduled-jobs`;
    },
    scheduledJobRuns: (jobId) => {
      return `/settings/scheduled-jobs/${jobId}/runs`;
    },
    scheduledJobRunDetail: (jobId, runId) => {
      return `/settings/scheduled-jobs/${jobId}/runs/${runId}`;
    },
  },
  agents: {
    builder: () => {
      return `/settings/agents/builder`;
    },
    editAgent: (uuid) => {
      return `/settings/agents/builder/${uuid}`;
    },
  },
};

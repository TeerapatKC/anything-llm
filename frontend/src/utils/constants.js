export const API_BASE = import.meta.env.VITE_API_BASE || "/api";
export const AUTH_USER = "nexusai_user";
export const AUTH_TOKEN = "nexusai_authToken";
export const AUTH_TIMESTAMP = "nexusai_authTimestamp";
// Permissions live outside the cached user object on purpose - many code paths
// rewrite that object, and losing this field silently locks a user out of everything.
export const AUTH_PERMISSIONS = "nexusai_permissions";
// The human-readable label of the role a user holds (e.g. "Content Editor") - cached
// separately from AUTH_USER for the same reason as AUTH_PERMISSIONS, and because
// user.role only ever stores the role's identifier, not something fit to display.
export const AUTH_ROLE_LABEL = "nexusai_roleLabel";
// What the user may do inside each workspace, keyed by workspace id. Workspace
// permissions are per-workspace, so they cannot live in the flat permission list.
export const AUTH_WORKSPACE_PERMISSIONS = "nexusai_workspacePermissions";
export const SEEN_DOC_PIN_ALERT = "nexusai_pinned_document_alert";
export const LAST_VISITED_WORKSPACE = "nexusai_last_visited_workspace";
export const USER_PROMPT_INPUT_MAP = "nexusai_user_prompt_input_map";
export const PENDING_HOME_MESSAGE = "nexusai_pending_home_message";

export const APPEARANCE_SETTINGS = "nexusai_appearance_settings";

export const OLLAMA_COMMON_URLS = [
  "http://127.0.0.1:11434",
  "http://host.docker.internal:11434",
  "http://172.17.0.1:11434",
];

export const LMSTUDIO_COMMON_URLS = [
  "http://localhost:1234/v1",
  "http://127.0.0.1:1234/v1",
  "http://host.docker.internal:1234/v1",
  "http://172.17.0.1:1234/v1",
];

export const KOBOLDCPP_COMMON_URLS = [
  "http://127.0.0.1:5000/v1",
  "http://localhost:5000/v1",
  "http://host.docker.internal:5000/v1",
  "http://172.17.0.1:5000/v1",
];

export const LOCALAI_COMMON_URLS = [
  "http://127.0.0.1:8080/v1",
  "http://localhost:8080/v1",
  "http://host.docker.internal:8080/v1",
  "http://172.17.0.1:8080/v1",
];

export const NVIDIA_NIM_COMMON_URLS = [
  "http://127.0.0.1:8000/v1/version",
  "http://localhost:8000/v1/version",
  "http://host.docker.internal:8000/v1/version",
  "http://172.17.0.1:8000/v1/version",
];

export const DOCKER_MODEL_RUNNER_COMMON_URLS = [
  "http://localhost:12434/engines/llama.cpp/v1",
  "http://127.0.0.1:12434/engines/llama.cpp/v1",
  "http://model-runner.docker.internal/engines/llama.cpp/v1",
  "http://host.docker.internal:12434/engines/llama.cpp/v1",
  "http://172.17.0.1:12434/engines/llama.cpp/v1",
];

export const LEMONADE_COMMON_URLS = [
  "http://localhost:8000/live",
  "http://127.0.0.1:8000/live",
  "http://host.docker.internal:8000/live",
  "http://172.17.0.1:8000/live",

  // In Lemonade 10.1.0 the base port is 13305
  "http://localhost:13305/live",
  "http://127.0.0.1:13305/live",
  "http://host.docker.internal:13305/live",
  "http://172.17.0.1:13305/live",
];

export const OMLX_COMMON_URLS = [
  "http://127.0.0.1:8000",
  "http://localhost:8000",
  "http://host.docker.internal:8000",
];

export function fullApiUrl() {
  if (API_BASE !== "/api") return API_BASE;
  return `${window.location.origin}/api`;
}

const { SystemSettings } = require("../../models/systemSettings");

/**
 * Which agent skills need a credential before they can do anything, and how to
 * tell whether an administrator has already supplied it.
 *
 * Credentials are deliberately instance-wide: an API key or OAuth grant is
 * bought/authorized once for the whole deployment, so a workspace manager never
 * enters one. That leaves a gap the per-workspace skill picker has to close -
 * offering a toggle for a skill whose key was never set produces an agent that
 * advertises a tool and then fails at call time. This module is the single
 * source of truth for "is this skill actually usable right now", so the
 * workspace UI can hide what it cannot honor.
 */

/**
 * Search engines the web-browsing skill can use, keyed by the value stored in
 * `agent_search_provider`, mapped to the env var that has to be set for the
 * engine to work. `null` means the engine needs no credential at all.
 * @type {Record<string, string|null>}
 */
const SEARCH_ENGINE_CREDENTIAL = {
  "duckduckgo-engine": null,
  // The key only lifts rate limits - the free tier works without one.
  "you-search": null,
  "brave-search": "AGENT_BRAVE_API_KEY",
  serpapi: "AGENT_SERPAPI_API_KEY",
  searchapi: "AGENT_SEARCHAPI_API_KEY",
  "serper-dot-dev": "AGENT_SERPER_DEV_KEY",
  "bing-search": "AGENT_BING_SEARCH_API_KEY",
  "baidu-search": "AGENT_BAIDU_SEARCH_API_KEY",
  "serply-engine": "AGENT_SERPLY_API_KEY",
  "searxng-engine": "AGENT_SEARXNG_API_URL",
  "tavily-search": "AGENT_TAVILY_API_KEY",
  "exa-search": "AGENT_EXA_API_KEY",
  "perplexity-search": "AGENT_PERPLEXITY_API_KEY",
  "crw-search": "AGENT_CRW_API_KEY",
};

/**
 * Search engines this instance can actually run a query with right now.
 * @returns {string[]} provider values, in the order declared above
 */
function configuredSearchProviders() {
  return Object.entries(SEARCH_ENGINE_CREDENTIAL)
    .filter(([_, envKey]) => envKey === null || !!process.env[envKey])
    .map(([provider]) => provider);
}

/**
 * Whether at least one SQL connection has been saved instance-wide. The
 * sql-agent has nothing to query without one.
 * @returns {Promise<boolean>}
 */
async function hasSQLConnections() {
  const { safeJsonParse } = require("../http");
  const connections = safeJsonParse(
    (await SystemSettings.get({ label: "agent_sql_connections" }))?.value,
    []
  );
  return Array.isArray(connections) && connections.length > 0;
}

/**
 * Resolve, for every credential-gated skill, whether an administrator has
 * already configured it. Skills absent from the returned map need no
 * credential and are always offerable.
 *
 * Every lookup is wrapped so a single misconfigured integration (an OAuth
 * bridge that throws while reading its stored config, say) reports itself as
 * unconfigured instead of failing the whole request.
 * @returns {Promise<Record<string, {configured: boolean, hint: string}>>}
 */
async function skillCredentialStatus() {
  const safely = async (fn) => {
    try {
      return !!(await fn());
    } catch {
      return false;
    }
  };

  const [gmail, googleCalendar, outlook, sql] = await Promise.all([
    safely(() =>
      require("./aibitat/plugins/gmail/lib").GmailBridge.isToolAvailable()
    ),
    safely(() =>
      require("./aibitat/plugins/google-calendar/lib").GoogleCalendarBridge.isToolAvailable()
    ),
    safely(() =>
      require("./aibitat/plugins/outlook/lib").OutlookBridge.isToolAvailable()
    ),
    safely(() => hasSQLConnections()),
  ]);

  return {
    "web-browsing": {
      // DuckDuckGo needs no key, so this only goes false on a deployment that
      // has explicitly disabled every keyless engine.
      configured: configuredSearchProviders().length > 0,
      hint: "No search engine is configured for this instance.",
    },
    "sql-agent": {
      configured: sql,
      hint: "No SQL connections have been added for this instance.",
    },
    "gmail-agent": {
      configured: gmail,
      hint: "Gmail is not connected for this instance.",
    },
    "google-calendar-agent": {
      configured: googleCalendar,
      hint: "Google Calendar is not connected for this instance.",
    },
    "outlook-agent": {
      configured: outlook,
      hint: "Outlook is not connected for this instance.",
    },
  };
}

module.exports = {
  SEARCH_ENGINE_CREDENTIAL,
  configuredSearchProviders,
  skillCredentialStatus,
};

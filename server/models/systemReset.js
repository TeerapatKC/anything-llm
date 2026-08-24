const prisma = require("../utils/prisma");
const { Role } = require("./role");

/**
 * Instance reset, in two forms.
 *
 * **Scoped reset** is a deliberately blunt tool for the two moments an operator actually
 * needs one: handing a pilot deployment over as a clean instance, and clearing out a
 * staging environment that has filled with junk. It is irreversible and there is no undo,
 * so:
 *
 *   - it is gated on holding the `super-admin` role, not on a permission, so it can
 *     never be ticked into an operator-defined role;
 *   - the caller re-enters their password and types the instance's own name;
 *   - every scope is opt-in, and `preview()` reports exactly what each one would remove
 *     before anything is touched;
 *   - the owner's own account, the role and permission catalogs, and the provider
 *     credentials that make the instance work are never in scope.
 *
 * Scopes are independent except where `implies` says otherwise - deleting workspaces
 * necessarily takes their chats and embeddings with them.
 *
 * **Factory reset** is the other thing entirely: it puts the deployment back to the state
 * it was in before anyone had ever opened it, so the next visitor lands on the onboarding
 * screen. Every table is emptied, the owner account included; the stored documents and
 * vector cache are cleared; and the provider configuration in `.env` is removed. It is a
 * separate call rather than an eighth scope precisely so it can never be reached by
 * ticking one more box.
 */

const RESET_SCOPES = [
  {
    key: "chats",
    label: "Chat history",
    description:
      "Every conversation in every workspace, plus embedded-widget conversations and agent invocation history. Workspaces, members and documents are kept.",
    implies: [],
  },
  {
    key: "workspaces",
    label: "Workspaces",
    description:
      "Every workspace on the instance, with its threads, members, embedded documents and vector namespaces. Files in the document library are kept so they can be re-embedded.",
    implies: ["chats"],
  },
  {
    key: "documents",
    label: "Document library",
    description:
      "The shared document store, its cached vectors and any pending sync jobs. Embeddings already inside a workspace are removed with it.",
    implies: [],
  },
  {
    key: "users",
    label: "User accounts",
    description:
      "Every account except your own, along with pending invitations, their sessions and their paired devices. Roles and permissions are left alone.",
    implies: [],
  },
  {
    key: "agents",
    label: "Agent activity",
    description:
      "Scheduled agent jobs and their run history, saved slash commands and prompt variables.",
    implies: [],
  },
  {
    key: "event_logs",
    label: "Event log",
    description:
      "The instance audit trail. The reset itself is written to the fresh log afterwards.",
    implies: [],
  },
  {
    key: "customization",
    label: "Appearance & customization",
    description:
      "Branding, logo, footer links, welcome messages and other look-and-feel settings, back to their defaults. LLM, embedder and vector database configuration is not touched.",
    implies: [],
  },
];

const RESET_SCOPE_KEYS = RESET_SCOPES.map((scope) => scope.key);

/**
 * System settings that survive a customization reset because losing them either breaks
 * the deployment or silently re-enables something the operator turned off.
 */
const PRESERVED_SETTINGS = [
  "multi_user_mode",
  "reserved_permissions",
  "telemetry_id",
  "hub_api_key",
  "agent_sql_connections",
  "text_splitter_chunk_size",
  "text_splitter_chunk_overlap",
  "max_embed_chunk_size",
];

/**
 * Every table a factory reset empties - which is all of them, roles and the permission
 * catalog included, since those are re-seeded immediately afterwards exactly as they
 * would be on a first boot.
 *
 * Order matters only as a hint: `_wipeEverything` retries whatever a foreign key refuses
 * the first time round, so this list does not have to encode the dependency graph.
 */
const FACTORY_WIPE_TABLES = [
  "document_sync_executions",
  "document_sync_queues",
  "workspace_parsed_files",
  "workspace_agent_invocations",
  "workspace_chats",
  "workspace_suggested_messages",
  "workspace_threads",
  "workspace_users",
  "workspace_documents",
  "document_vectors",
  "embed_chats",
  "embed_configs",
  "memories",
  "model_router_rules",
  "model_routers",
  "scheduled_job_runs",
  "scheduled_jobs",
  "slash_command_presets",
  "prompt_history",
  "workspace_role_permissions",
  "workspace_roles",
  "workspaces",
  "role_permissions",
  "roles",
  "permissions",
  "recovery_codes",
  "password_reset_tokens",
  "temporary_auth_tokens",
  "browser_extension_api_keys",
  "desktop_mobile_devices",
  "api_keys",
  "users",
  "invites",
  "cache_data",
  "system_prompt_variables",
  "external_communication_connectors",
  "system_settings",
  "event_logs",
];

/**
 * Environment variables a factory reset leaves alone even though `updateENV` manages
 * them. Everything else it manages - every provider credential, the LLM and vector
 * database selection, and the JWT secret - is cleared, because leaving any of them behind
 * would have the next boot decide the instance had already been set up.
 *
 * Note that only keys `updateENV` knows about are touched at all: `STORAGE_DIR`,
 * `SIG_KEY`, `SIG_SALT`, the port settings, the password policy and any hand-written keys
 * are not in its map, so they survive untouched.
 */
const PRESERVED_ENV_KEYS = ["DISABLE_TELEMETRY"];

const SystemReset = {
  SCOPES: RESET_SCOPES,
  SCOPE_KEYS: RESET_SCOPE_KEYS,
  FACTORY_WIPE_TABLES,

  /**
   * Normalizes a requested scope list: unknown keys are dropped and implied scopes are
   * pulled in, so a caller asking for "workspaces" cannot end up with orphaned chats.
   * @param {string[]} requested
   * @returns {string[]}
   */
  resolveScopes: function (requested = []) {
    if (!Array.isArray(requested)) return [];
    const resolved = new Set();
    for (const key of requested) {
      const scope = RESET_SCOPES.find((entry) => entry.key === key);
      if (!scope) continue;
      resolved.add(scope.key);
      for (const implied of scope.implies) resolved.add(implied);
    }
    // Returned in catalog order so reports and confirmation dialogs read consistently.
    return RESET_SCOPE_KEYS.filter((key) => resolved.has(key));
  },

  /**
   * How much each scope would remove, without removing anything. The counts are what the
   * confirmation dialog shows, so they are deliberately the same numbers `execute` acts on.
   * @param {{id: number}} actor - the owner running the reset, excluded from the user count
   * @returns {Promise<Record<string, Record<string, number>>>}
   */
  preview: async function (actor = {}) {
    const count = async (fn) => {
      try {
        return await fn();
      } catch (error) {
        console.error("RESET PREVIEW FAILED.", error.message);
        return 0;
      }
    };

    return {
      chats: {
        workspaceChats: await count(() => prisma.workspace_chats.count()),
        embedChats: await count(() => prisma.embed_chats.count()),
        agentInvocations: await count(() =>
          prisma.workspace_agent_invocations.count()
        ),
      },
      workspaces: {
        workspaces: await count(() => prisma.workspaces.count()),
        threads: await count(() => prisma.workspace_threads.count()),
        memberships: await count(() => prisma.workspace_users.count()),
        embeddedDocuments: await count(() =>
          prisma.workspace_documents.count()
        ),
      },
      documents: {
        embeddedDocuments: await count(() =>
          prisma.workspace_documents.count()
        ),
        cachedVectors: await count(() => prisma.document_vectors.count()),
        pendingSyncs: await count(() => prisma.document_sync_queues.count()),
      },
      users: {
        users: await count(() =>
          prisma.users.count({ where: { id: { not: Number(actor?.id) } } })
        ),
        pendingInvites: await count(() =>
          prisma.invites.count({ where: { status: "pending" } })
        ),
      },
      agents: {
        scheduledJobs: await count(() => prisma.scheduled_jobs.count()),
        jobRuns: await count(() => prisma.scheduled_job_runs.count()),
        slashCommands: await count(() => prisma.slash_command_presets.count()),
        promptVariables: await count(() =>
          prisma.system_prompt_variables.count()
        ),
      },
      event_logs: {
        entries: await count(() => prisma.event_logs.count()),
      },
      customization: {
        settings: await count(() =>
          prisma.system_settings.count({
            where: { label: { notIn: PRESERVED_SETTINGS } },
          })
        ),
      },
    };
  },

  /**
   * What a factory reset would remove, for the confirmation dialog. Deliberately a
   * different shape from `preview()` - there is nothing to choose between, so the only
   * useful number is the total.
   * @returns {Promise<{users: number, workspaces: number, records: number, providerSettings: number}>}
   */
  factoryPreview: async function () {
    let records = 0;
    for (const table of FACTORY_WIPE_TABLES) {
      try {
        records += await prisma[table].count();
      } catch (error) {
        console.error(
          `FACTORY PREVIEW: could not count ${table}.`,
          error.message
        );
      }
    }

    return {
      users: await prisma.users.count().catch(() => 0),
      workspaces: await prisma.workspaces.count().catch(() => 0),
      records,
      providerSettings: this._clearableEnvKeys().filter(
        (key) => process.env[key] !== undefined
      ).length,
    };
  },

  /**
   * Returns the deployment to its pre-onboarding state.
   *
   * Three things have to go together for this to actually work. Emptying the database
   * removes the owner, so `hasAnyUser()` is false and the setup endpoint reopens.
   * Clearing the stored documents and vector namespaces stops the previous instance's
   * content reappearing under a new owner. And clearing the managed environment keys is
   * what stops the *next boot* from deciding the instance was already onboarded - the
   * legacy check in `utils/boot/markOnboarded` treats a present `JWT_SECRET`,
   * `LLM_PROVIDER` or `VECTOR_DB` as proof of a completed setup, so leaving any of them
   * behind would silently undo the reset on the next restart.
   *
   * The role and permission catalogs are re-seeded before returning, so the instance is
   * left exactly as a first boot leaves it rather than in a half-built state.
   *
   * @param {{actor: {id: number, role: string}}} params
   * @returns {Promise<{success: boolean, error: string|null, results: Object}>}
   */
  factoryReset: async function ({ actor = {} } = {}) {
    if (!Role.isSuperAdmin(actor))
      return {
        success: false,
        error: "Only the super admin can reset this instance.",
        results: {},
      };

    // Written to the process log before anything is touched: the event log is one of the
    // tables about to be emptied, so this line is the operator's only durable record.
    console.log(
      `\x1b[31m[FACTORY RESET]\x1b[0m "${actor.username}" is returning this instance to its pre-onboarding state.`
    );

    const namespaces = await this._dropAllVectorNamespaces();
    const { removed, unresolved } = await this._wipeEverything();
    const storage = this._wipeStorage();
    const envCleared = this._clearManagedEnv();

    // Same two calls the server makes on boot, so the fresh instance has its built-in
    // roles and the permission catalog before the first account is created.
    const { WorkspaceRole } = require("./workspaceRole");
    Role.flushCache();
    WorkspaceRole.flushCache();
    await Role.seed();
    await WorkspaceRole.seed();

    const records = Object.values(removed).reduce(
      (total, count) => total + count,
      0
    );
    console.log(
      `\x1b[31m[FACTORY RESET]\x1b[0m Complete. ${records} records, ${storage.filesRemoved} stored files and ${envCleared} configuration values removed.`
    );

    return {
      success: true,
      error: null,
      results: {
        records,
        tables: removed,
        unresolvedTables: unresolved,
        vectorNamespaces: namespaces,
        ...storage,
        providerSettings: envCleared,
      },
    };
  },

  /**
   * Empties every table, retrying whatever a foreign key refuses on the first pass. The
   * dependency graph is not hard-coded here on purpose - it would be one more thing to
   * keep in step with the schema, and a retry loop cannot fall out of date.
   * @returns {Promise<{removed: Record<string, number>, unresolved: string[]}>}
   */
  _wipeEverything: async function () {
    const removed = {};
    let pending = [...FACTORY_WIPE_TABLES];

    for (
      let pass = 0;
      pass < FACTORY_WIPE_TABLES.length && pending.length;
      pass++
    ) {
      const blocked = [];
      for (const table of pending) {
        try {
          const { count } = await prisma[table].deleteMany({});
          removed[table] = count;
        } catch (error) {
          blocked.push(table);
          if (pass > 0)
            console.error(`FACTORY RESET: ${table} - ${error.message}`);
        }
      }
      // No table cleared this pass, so retrying cannot help - stop rather than spin.
      if (blocked.length === pending.length)
        return { removed, unresolved: blocked };
      pending = blocked;
    }

    return { removed, unresolved: pending };
  },

  /**
   * Drops every workspace namespace from the vector database. Collected before the
   * tables are emptied, because the namespaces are addressed by workspace slug.
   * @returns {Promise<number>}
   */
  _dropAllVectorNamespaces: async function () {
    let dropped = 0;
    try {
      const workspaces = await prisma.workspaces.findMany({
        select: { slug: true },
      });
      const { getVectorDbClass } = require("../utils/helpers");
      const VectorDb = getVectorDbClass();
      for (const workspace of workspaces) {
        try {
          await VectorDb["delete-namespace"]({ namespace: workspace.slug });
          dropped++;
        } catch (error) {
          console.error(
            `Could not drop vector namespace "${workspace.slug}".`,
            error.message
          );
        }
      }
    } catch (error) {
      console.error("Vector database unavailable during reset.", error.message);
    }
    return dropped;
  },

  /**
   * Clears the document store and the vector cache from disk.
   * @returns {{filesRemoved: number}}
   */
  _wipeStorage: function () {
    let filesRemoved = 0;
    try {
      const fs = require("fs");
      const path = require("path");
      const {
        documentsPath,
        purgeEntireVectorCache,
      } = require("../utils/files");

      if (fs.existsSync(documentsPath)) {
        for (const entry of fs.readdirSync(documentsPath)) {
          fs.rmSync(path.resolve(documentsPath, entry), {
            recursive: true,
            force: true,
          });
          filesRemoved++;
        }
      }
      purgeEntireVectorCache();
    } catch (error) {
      console.error("Could not clear the document store.", error.message);
    }
    return { filesRemoved };
  },

  /**
   * Every environment variable `updateENV` manages, minus the ones a reset should not
   * touch. Derived from its key map rather than duplicated, so a provider added upstream
   * is cleared without anyone having to remember this file.
   * @returns {string[]}
   */
  _clearableEnvKeys: function () {
    const { KEY_MAPPING } = require("../utils/helpers/updateENV");
    return [
      ...new Set(Object.values(KEY_MAPPING).map((entry) => entry.envKey)),
    ].filter((key) => !PRESERVED_ENV_KEYS.includes(key));
  },

  /**
   * The env files a reset rewrites. `.env` is what the app writes to; in development
   * dotenv reads `.env.development` instead, and leaving that one alone would restore
   * every cleared value on the next restart.
   * @returns {string[]}
   */
  _envFilePaths: function () {
    const path = require("path");
    const paths = [path.resolve(__dirname, "../.env")];
    if (process.env.NODE_ENV === "development")
      paths.push(path.resolve(__dirname, "../.env.development"));
    return paths;
  },

  /**
   * Removes the managed keys from the running process and from the env file on disk.
   * `dumpENV` cannot do this - it only ever merges values *in* - so the lines are
   * rewritten here, leaving comments and unmanaged keys exactly as they were.
   * @returns {number} how many values were actually cleared
   */
  _clearManagedEnv: function () {
    const fs = require("fs");
    const clearable = new Set(this._clearableEnvKeys());

    let cleared = 0;
    for (const key of clearable) {
      if (process.env[key] === undefined) continue;
      delete process.env[key];
      cleared++;
    }

    for (const envPath of this._envFilePaths()) {
      try {
        if (!fs.existsSync(envPath)) continue;
        const kept = fs
          .readFileSync(envPath, { encoding: "utf8" })
          .split(/\r?\n/)
          .filter((line) => {
            const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=/);
            return !match || !clearable.has(match[1]);
          });
        fs.writeFileSync(envPath, kept.join("\n"), {
          encoding: "utf8",
          flag: "w",
        });
      } catch (error) {
        console.error(`Could not rewrite ${envPath}.`, error.message);
      }
    }

    return cleared;
  },

  /**
   * Runs the requested scopes. Each scope is executed independently so one failure does
   * not abandon the rest half-done, and every scope reports what it actually removed.
   *
   * @param {{scopes: string[], actor: {id: number, role: string}}} params
   * @returns {Promise<{success: boolean, error: string|null, scopes: string[], results: Object}>}
   */
  execute: async function ({ scopes = [], actor = {} } = {}) {
    // Belt and braces: the endpoint checks this too, but the reset is destructive enough
    // that it should be impossible to reach from a caller that skipped the middleware.
    if (!Role.isSuperAdmin(actor))
      return {
        success: false,
        error: "Only the super admin can reset this instance.",
        scopes: [],
        results: {},
      };

    const resolved = this.resolveScopes(scopes);
    if (resolved.length === 0)
      return {
        success: false,
        error: "Choose at least one thing to reset.",
        scopes: [],
        results: {},
      };

    const results = {};
    for (const scope of resolved) {
      try {
        results[scope] = await this[`_reset_${scope}`](actor);
      } catch (error) {
        console.error(`RESET SCOPE "${scope}" FAILED.`, error.message);
        results[scope] = { error: error.message };
      }
    }

    return { success: true, error: null, scopes: resolved, results };
  },

  _reset_chats: async function () {
    const { count: workspaceChats } = await prisma.workspace_chats.deleteMany(
      {}
    );
    const { count: embedChats } = await prisma.embed_chats.deleteMany({});
    const { count: agentInvocations } =
      await prisma.workspace_agent_invocations.deleteMany({});
    return { workspaceChats, embedChats, agentInvocations };
  },

  /**
   * Workspace rows cascade to their threads, members, suggested messages and chats.
   * `workspace_documents` is the exception - its relation carries no `onDelete`, so the
   * embeddings have to be cleared first or the delete trips a foreign key.
   *
   * The vector database itself lives outside Prisma: its namespaces are dropped by name,
   * and one that is already gone is not an error.
   */
  _reset_workspaces: async function () {
    const workspaces = await prisma.workspaces.findMany({
      select: { id: true, slug: true },
    });

    await prisma.document_sync_queues.deleteMany({});
    await prisma.document_vectors.deleteMany({});
    await prisma.workspace_documents.deleteMany({});
    const { count } = await prisma.workspaces.deleteMany({});

    let namespacesDropped = 0;
    try {
      const { getVectorDbClass } = require("../utils/helpers");
      const VectorDb = getVectorDbClass();
      for (const workspace of workspaces) {
        try {
          await VectorDb["delete-namespace"]({ namespace: workspace.slug });
          namespacesDropped++;
        } catch (error) {
          console.error(
            `Could not drop vector namespace "${workspace.slug}".`,
            error.message
          );
        }
      }
    } catch (error) {
      console.error("Vector database unavailable during reset.", error.message);
    }

    return { workspaces: count, namespacesDropped };
  },

  /**
   * Clears the shared document store from disk as well as the database, since a file
   * left behind would reappear in the library the next time it is listed.
   */
  _reset_documents: async function () {
    // Sync queues cascade from the documents they watch, so they are cleared first -
    // otherwise they would be gone before the count could report them.
    const { count: pendingSyncs } =
      await prisma.document_sync_queues.deleteMany({});
    const { count: cachedVectors } = await prisma.document_vectors.deleteMany(
      {}
    );
    const { count: embeddedDocuments } =
      await prisma.workspace_documents.deleteMany({});
    await prisma.cache_data.deleteMany({});

    let filesRemoved = 0;
    try {
      const fs = require("fs");
      const path = require("path");
      const {
        documentsPath,
        purgeEntireVectorCache,
      } = require("../utils/files");

      if (fs.existsSync(documentsPath)) {
        for (const entry of fs.readdirSync(documentsPath)) {
          // `custom-documents` is recreated on demand, but removing the folder itself
          // trips upload paths that assume it exists, so only its contents are cleared.
          const target = path.resolve(documentsPath, entry);
          fs.rmSync(target, { recursive: true, force: true });
          filesRemoved++;
        }
      }
      purgeEntireVectorCache();
    } catch (error) {
      console.error("Could not clear the document store.", error.message);
    }

    return { embeddedDocuments, cachedVectors, pendingSyncs, filesRemoved };
  },

  /**
   * Everyone but the owner. Sessions, recovery codes, paired devices and API keys hang
   * off the user rows and cascade with them.
   */
  _reset_users: async function (actor) {
    const { count: users } = await prisma.users.deleteMany({
      where: { id: { not: Number(actor.id) } },
    });
    const { count: pendingInvites } = await prisma.invites.deleteMany({});
    return { users, pendingInvites };
  },

  _reset_agents: async function () {
    const { count: jobRuns } = await prisma.scheduled_job_runs.deleteMany({});
    const { count: scheduledJobs } = await prisma.scheduled_jobs.deleteMany({});
    const { count: slashCommands } =
      await prisma.slash_command_presets.deleteMany({});
    const { count: promptVariables } =
      await prisma.system_prompt_variables.deleteMany({});
    return { scheduledJobs, jobRuns, slashCommands, promptVariables };
  },

  _reset_event_logs: async function () {
    const { count: entries } = await prisma.event_logs.deleteMany({});
    return { entries };
  },

  _reset_customization: async function () {
    const { count: settings } = await prisma.system_settings.deleteMany({
      where: { label: { notIn: PRESERVED_SETTINGS } },
    });
    return { settings, preserved: PRESERVED_SETTINGS.length };
  },
};

module.exports = { SystemReset, RESET_SCOPES, RESET_SCOPE_KEYS };

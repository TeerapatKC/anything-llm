const prisma = require("../utils/prisma");
const slugifyModule = require("slugify");
const { WorkspaceUser } = require("./workspaceUsers");
const { isElevatedRole } = require("../utils/middleware/multiUserProtected");
const { v4: uuidv4 } = require("uuid");
const { User } = require("./user");
const { PromptHistory } = require("./promptHistory");
const { SystemSettings } = require("./systemSettings");

function isNullOrNaN(value) {
  if (value === null) return true;
  return isNaN(value);
}

/**
 * @typedef {Object} Workspace
 * @property {number} id - The ID of the workspace
 * @property {string} name - The name of the workspace
 * @property {string} slug - The slug of the workspace
 * @property {string} openAiPrompt - The OpenAI prompt of the workspace
 * @property {string} openAiTemp - The OpenAI temperature of the workspace
 * @property {number} openAiHistory - The OpenAI history of the workspace
 * @property {number} similarityThreshold - The similarity threshold of the workspace
 * @property {string} chatProvider - The chat provider of the workspace
 * @property {string} chatModel - The chat model of the workspace
 * @property {number} topN - The top N of the workspace
 * @property {string} chatMode - The chat mode of the workspace
 * @property {string} agentProvider - The agent provider of the workspace
 * @property {string} agentModel - The agent model of the workspace
 * @property {string} queryRefusalResponse - The query refusal response of the workspace
 * @property {string} vectorSearchMode - The vector search mode of the workspace
 */

const Workspace = {
  VALID_CHAT_MODES: ["chat", "query", "automatic"],
  defaultPrompt: SystemSettings.saneDefaultSystemPrompt,

  // Used for generic updates so we can validate keys in request body
  // commented fields are not writable, but are available on the db object
  writable: [
    "name",
    // "slug",
    // "vectorTag",
    "openAiTemp",
    "openAiHistory",
    "lastUpdatedAt",
    "openAiPrompt",
    "similarityThreshold",
    "chatProvider",
    "chatModel",
    "topN",
    "chatMode",
    // "pfpFilename",
    "agentProvider",
    "agentModel",
    "queryRefusalResponse",
    "vectorSearchMode",
    "router_id",
    "description",
    "defaultLanguage",
    // NOTE: "status"/"archivedAt" are intentionally NOT generic-writable — they
    // only change via archive()/restore()/setStatus() below, which keep the
    // two fields in sync and emit the correct event log.
  ],

  validations: {
    name: (value) => {
      // If the name is not provided or is not a string then we will use a default name.
      // as the name field is not nullable in the db schema or has a default value.
      if (!value || typeof value !== "string") return "My Workspace";
      return String(value).slice(0, 255);
    },
    openAiTemp: (value) => {
      if (value === null || value === undefined) return null;
      const temp = parseFloat(value);
      if (isNullOrNaN(temp) || temp < 0) return null;
      return temp;
    },
    openAiHistory: (value) => {
      if (value === null || value === undefined) return 20;
      const history = parseInt(value);
      if (isNullOrNaN(history)) return 20;
      if (history < 0) return 0;
      return history;
    },
    similarityThreshold: (value) => {
      if (value === null || value === undefined) return 0.25;
      const threshold = parseFloat(value);
      if (isNullOrNaN(threshold)) return 0.25;
      if (threshold < 0) return 0.0;
      if (threshold > 1) return 1.0;
      return threshold;
    },
    topN: (value) => {
      if (value === null || value === undefined) return 4;
      const n = parseInt(value);
      if (isNullOrNaN(n)) return 4;
      if (n < 1) return 1;
      return n;
    },
    chatMode: (value) => {
      if (!value || !Workspace.VALID_CHAT_MODES.includes(value))
        return "automatic";
      return value;
    },
    chatProvider: (value) => {
      if (!value || typeof value !== "string" || value === "none") return null;
      return String(value);
    },
    chatModel: (value) => {
      if (!value || typeof value !== "string") return null;
      return String(value);
    },
    agentProvider: (value) => {
      if (!value || typeof value !== "string" || value === "none") return null;
      return String(value);
    },
    agentModel: (value) => {
      if (!value || typeof value !== "string") return null;
      return String(value);
    },
    queryRefusalResponse: (value) => {
      if (!value || typeof value !== "string") return null;
      return String(value);
    },
    openAiPrompt: (value) => {
      if (!value || typeof value !== "string") return null;
      return String(value);
    },
    vectorSearchMode: (value) => {
      if (
        !value ||
        typeof value !== "string" ||
        !["default", "rerank"].includes(value)
      )
        return "default";
      return value;
    },
    router_id: (value) => {
      if ([null, undefined, "", "none"].includes(value)) return null;
      const id = Number(value);
      if (isNaN(id)) return null;
      return id;
    },
    description: (value) => {
      if (!value || typeof value !== "string") return null;
      return String(value).slice(0, 1000);
    },
    defaultLanguage: (value) => {
      if (!value || typeof value !== "string") return null;
      return String(value).slice(0, 32);
    },
  },

  VALID_STATUSES: ["active", "inactive", "archived"],

  /**
   * The default Slugify module requires some additional mapping to prevent downstream issues
   * with some vector db providers and instead of building a normalization method for every provider
   * we can capture this on the table level to not have to worry about it.
   * @param  {...any} args - slugify args for npm package.
   * @returns {string}
   */
  slugify: function (...args) {
    slugifyModule.extend({
      "+": " plus ",
      "!": " bang ",
      "@": " at ",
      "*": " splat ",
      ".": " dot ",
      ":": "",
      "~": "",
      "(": "",
      ")": "",
      "'": "",
      '"': "",
      "|": "",
    });
    return slugifyModule(...args);
  },

  /**
   * Validate the fields for a workspace update.
   * @param {Object} updates - The updates to validate - should be writable fields
   * @returns {Object} The validated updates. Only valid fields are returned.
   */
  validateFields: function (updates = {}) {
    const validatedFields = {};
    for (const [key, value] of Object.entries(updates)) {
      if (!this.writable.includes(key)) continue;
      if (this.validations[key]) {
        validatedFields[key] = this.validations[key](value);
      } else {
        // If there is no validation for the field then we will just pass it through.
        validatedFields[key] = value;
      }
    }
    return validatedFields;
  },

  /**
   * Create a new workspace.
   * @param {string} name - The name of the workspace.
   * @param {number} creatorId - The ID of the user creating the workspace.
   * @param {Object} additionalFields - Additional fields to apply to the workspace - will be validated.
   * @returns {Promise<{workspace: Object | null, message: string | null}>} A promise that resolves to an object containing the created workspace and an error message if applicable.
   */
  new: async function (name = null, creatorId = null, additionalFields = {}) {
    if (!name) return { workspace: null, message: "name cannot be null" };
    var slug = this.slugify(name, { lower: true });
    slug = slug || uuidv4();

    const existingBySlug = await this.get({ slug });
    if (existingBySlug !== null) {
      const slugSeed = Math.floor(10000000 + Math.random() * 90000000);
      slug = this.slugify(`${name}-${slugSeed}`, { lower: true });
    }

    // If system prompt wasn't sent, apply the system default system prompt
    if (!additionalFields.openAiPrompt) {
      const defaultSystemPrompt = await SystemSettings.get({
        label: "default_system_prompt",
      });
      additionalFields.openAiPrompt = !!defaultSystemPrompt?.value
        ? defaultSystemPrompt.value
        : this.defaultPrompt;
    }

    try {
      const workspace = await prisma.workspaces.create({
        data: {
          name: this.validations.name(name),
          chatMode: "automatic",
          ...this.validateFields(additionalFields),
          slug,
        },
      });

      // If created with a user then we need to create the relationship as well,
      // as a workspace-scoped admin - the creator should be able to manage the
      // workspace they just made even if their instance-wide role is later
      // changed. (No-op in practical terms for an instance admin/manager
      // creator today, since they already bypass this check everywhere, but
      // keeps the workspace_users row correct on its own terms.)
      if (!!creatorId) await WorkspaceUser.create(creatorId, workspace.id, "admin");
      return { workspace, message: null };
    } catch (error) {
      console.error(error.message);
      return { workspace: null, message: error.message };
    }
  },

  /**
   * Update the settings for a workspace. Applies validations to the updates provided.
   * @param {number} id - The ID of the workspace to update.
   * @param {Object} updates - The data to update.
   * @returns {Promise<{workspace: Object | null, message: string | null}>} A promise that resolves to an object containing the updated workspace and an error message if applicable.
   */
  update: async function (id = null, updates = {}) {
    if (!id) throw new Error("No workspace id provided for update");

    const validatedUpdates = this.validateFields(updates);
    if (Object.keys(validatedUpdates).length === 0)
      return { workspace: { id }, message: "No valid fields to update!" };

    // If the user unset the chatProvider we will need
    // to then clear the chatModel as well to prevent confusion during
    // LLM loading.
    if (validatedUpdates?.chatProvider === "default") {
      validatedUpdates.chatProvider = null;
      validatedUpdates.chatModel = null;
    }

    // When switching to anythingllm-router, chatModel is not used.
    // When switching away from anythingllm-router, clear router_id.
    if (validatedUpdates?.chatProvider === "anythingllm-router") {
      validatedUpdates.chatModel = null;
    } else if (
      validatedUpdates?.chatProvider &&
      validatedUpdates.chatProvider !== "anythingllm-router"
    ) {
      validatedUpdates.router_id = null;
    }

    return this._update(id, validatedUpdates);
  },

  /**
   * Direct update of workspace settings without any validation.
   * @param {number} id - The ID of the workspace to update.
   * @param {Object} data - The data to update.
   * @returns {Promise<{workspace: Object | null, message: string | null}>} A promise that resolves to an object containing the updated workspace and an error message if applicable.
   */
  _update: async function (id = null, data = {}) {
    if (!id) throw new Error("No workspace id provided for update");

    try {
      const workspace = await prisma.workspaces.update({
        where: { id },
        data,
      });
      return { workspace, message: null };
    } catch (error) {
      console.error(error.message);
      return { workspace: null, message: error.message };
    }
  },

  /**
   * Archive a workspace instead of hard-deleting it. Documents, vectors, and
   * chat history are left untouched and remain recoverable via restore().
   * @param {number} id - The ID of the workspace to archive.
   * @param {number|null} userId - The ID of the user performing the archive, for the event log.
   * @returns {Promise<{workspace: Object | null, message: string | null}>}
   */
  archive: async function (id = null, userId = null) {
    if (!id) throw new Error("No workspace id provided to archive");
    const result = await this._update(id, {
      status: "archived",
      archivedAt: new Date(),
    });
    if (result.workspace) {
      const { EventLogs } = require("./eventLogs");
      await EventLogs.logEvent(
        "workspace_archived",
        { workspaceName: result.workspace.name, workspaceId: id },
        userId
      );
    }
    return result;
  },

  /**
   * Restore a previously archived workspace back to active status.
   * @param {number} id - The ID of the workspace to restore.
   * @param {number|null} userId - The ID of the user performing the restore, for the event log.
   * @returns {Promise<{workspace: Object | null, message: string | null}>}
   */
  restore: async function (id = null, userId = null) {
    if (!id) throw new Error("No workspace id provided to restore");
    const result = await this._update(id, {
      status: "active",
      archivedAt: null,
    });
    if (result.workspace) {
      const { EventLogs } = require("./eventLogs");
      await EventLogs.logEvent(
        "workspace_restored",
        { workspaceName: result.workspace.name, workspaceId: id },
        userId
      );
    }
    return result;
  },

  /**
   * Generic active/inactive toggle for a workspace - distinct from archive().
   * Cannot be used to archive/unarchive - use archive()/restore() for that.
   * @param {number} id - The ID of the workspace to update.
   * @param {"active"|"inactive"} status
   * @param {number|null} userId
   * @returns {Promise<{workspace: Object | null, message: string | null}>}
   */
  setStatus: async function (id = null, status = null, userId = null) {
    if (!id) throw new Error("No workspace id provided to setStatus");
    if (!["active", "inactive"].includes(status))
      return { workspace: null, message: "Invalid status" };

    const current = await this.get({ id: Number(id) });
    if (current?.status === "archived")
      return {
        workspace: null,
        message: "Cannot change status of an archived workspace - restore it first.",
      };

    const result = await this._update(id, { status });
    if (result.workspace) {
      const { EventLogs } = require("./eventLogs");
      await EventLogs.logEvent(
        "workspace_status_changed",
        { workspaceName: result.workspace.name, workspaceId: id, status },
        userId
      );
    }
    return result;
  },

  getWithUser: async function (user = null, clause = {}, { includeArchived = false } = {}) {
    const scopedClause = includeArchived
      ? clause
      : { ...clause, status: { not: "archived" } };

    if (isElevatedRole(user)) return this.get(scopedClause);

    try {
      const workspace = await prisma.workspaces.findFirst({
        where: {
          ...scopedClause,
          workspace_users: {
            some: {
              user_id: user?.id,
            },
          },
        },
        include: {
          workspace_users: true,
          documents: true,
        },
      });

      if (!workspace) return null;

      // `workspace.documents` was already fetched by the `include` above -
      // re-querying it via Document.forWorkspace() was a redundant second
      // round-trip returning the same rows.
      return {
        ...workspace,
        contextWindow: this._getContextWindow(workspace),
        currentContextTokenCount: await this._getCurrentContextTokenCount(
          workspace.id
        ),
      };
    } catch (error) {
      console.error(error.message);
      return null;
    }
  },

  /**
   * Get the total token count of all parsed files in a workspace/thread
   * @param {number} workspaceId - The ID of the workspace
   * @param {number|null} threadId - Optional thread ID to filter by
   * @returns {Promise<number>} Total token count of all files
   * @private
   */
  async _getCurrentContextTokenCount(workspaceId, threadId = null) {
    const { WorkspaceParsedFiles } = require("./workspaceParsedFiles");
    return await WorkspaceParsedFiles.totalTokenCount({
      workspaceId: Number(workspaceId),
      threadId: threadId ? Number(threadId) : null,
    });
  },

  /**
   * Get the context window size for a workspace based on its provider and model settings.
   * If the workspace has no provider/model set, falls back to system defaults.
   * @param {Workspace} workspace - The workspace to get context window for
   * @returns {number|null} The context window size in tokens (defaults to null if no provider/model found)
   * @private
   */
  _getContextWindow: function (workspace) {
    const {
      getLLMProviderClass,
      getBaseLLMProviderModel,
    } = require("../utils/helpers");
    const provider = workspace.chatProvider || process.env.LLM_PROVIDER || null;
    const LLMProvider = getLLMProviderClass({ provider });
    const model =
      workspace.chatModel || getBaseLLMProviderModel({ provider }) || null;

    if (!provider || !model) return null;
    return LLMProvider?.promptWindowLimit?.(model) || null;
  },

  get: async function (clause = {}) {
    try {
      const workspace = await prisma.workspaces.findFirst({
        where: clause,
        include: {
          documents: true,
        },
      });

      if (!workspace) return null;
      return {
        ...workspace,
        contextWindow: this._getContextWindow(workspace),
        currentContextTokenCount: await this._getCurrentContextTokenCount(
          workspace.id
        ),
      };
    } catch (error) {
      console.error(error.message);
      return null;
    }
  },

  /**
   * Same as get(), but excludes archived workspaces by default. This is the
   * correct fallback for the single-user-mode branch of the very common
   * `multiUserMode(response) ? Workspace.getWithUser(user, {slug}) : Workspace.get({slug})`
   * pattern used throughout server/endpoints/workspaces.js - getWithUser
   * already excludes archived workspaces (see its scopedClause), but plain
   * get() does not, so single-user-mode installs previously had no archived
   * exclusion at all on many endpoints. Prefer this over a bare get({slug})
   * wherever the caller isn't specifically trying to reach an archived
   * workspace (e.g. the restore endpoint, which intentionally uses get()
   * directly to find it).
   * @param {Object} clause
   * @returns {Promise<Object|null>}
   */
  getActive: async function (clause = {}) {
    return this.get({ ...clause, status: { not: "archived" } });
  },

  delete: async function (clause = {}) {
    try {
      await prisma.workspaces.delete({
        where: clause,
      });
      return true;
    } catch (error) {
      console.error(error.message);
      return false;
    }
  },

  where: async function (clause = {}, limit = null, orderBy = null) {
    try {
      const results = await prisma.workspaces.findMany({
        where: clause,
        ...(limit !== null ? { take: limit } : {}),
        ...(orderBy !== null ? { orderBy } : {}),
      });
      return results;
    } catch (error) {
      console.error(error.message);
      return [];
    }
  },

  whereWithUser: async function (
    user,
    clause = {},
    limit = null,
    orderBy = null,
    { includeArchived = false } = {}
  ) {
    const scopedClause = includeArchived
      ? clause
      : { ...clause, status: { not: "archived" } };

    if (isElevatedRole(user)) {
      const workspaces = await this.where(scopedClause, limit, orderBy);
      return workspaces.map((ws) => ({ ...ws, myRole: "admin" }));
    }

    try {
      const workspaces = await prisma.workspaces.findMany({
        where: {
          ...scopedClause,
          workspace_users: {
            some: {
              user_id: user.id,
            },
          },
        },
        ...(limit !== null ? { take: limit } : {}),
        ...(orderBy !== null ? { orderBy } : {}),
      });

      // Attach this user's workspace-scoped role to each workspace so the
      // frontend can show/hide admin-only UI (e.g. the settings gear icon)
      // for a "default" instance-role user without a separate round trip
      // per workspace.
      const relations = await WorkspaceUser.where({
        user_id: user.id,
        workspace_id: { in: workspaces.map((ws) => Number(ws.id)) },
      });
      const roleByWorkspaceId = new Map(
        relations.map((rel) => [rel.workspace_id, rel.role])
      );
      return workspaces.map((ws) => ({
        ...ws,
        myRole: roleByWorkspaceId.get(Number(ws.id)) || "member",
      }));
    } catch (error) {
      console.error(error.message);
      return [];
    }
  },

  whereWithUsers: async function (clause = {}, limit = null, orderBy = null) {
    try {
      const workspaces = await this.where(clause, limit, orderBy);
      if (workspaces.length === 0) return workspaces;

      // Batch-fetch membership rows for every workspace in one query instead
      // of one query per workspace (was N+1 on the admin workspace list page).
      const allRelations = await WorkspaceUser.where({
        workspace_id: { in: workspaces.map((ws) => Number(ws.id)) },
      });
      const userIdsByWorkspace = new Map();
      for (const rel of allRelations) {
        if (!userIdsByWorkspace.has(rel.workspace_id))
          userIdsByWorkspace.set(rel.workspace_id, []);
        userIdsByWorkspace.get(rel.workspace_id).push(rel.user_id);
      }

      for (const workspace of workspaces)
        workspace.userIds = userIdsByWorkspace.get(Number(workspace.id)) || [];
      return workspaces;
    } catch (error) {
      console.error(error.message);
      return [];
    }
  },

  /**
   * Get all users for a workspace.
   * @param {number} workspaceId - The ID of the workspace to get users for.
   * @returns {Promise<Array<{userId: number, username: string, instanceRole: string, workspaceRole: string}>>} A promise that resolves to an array of user objects.
   */
  workspaceUsers: async function (workspaceId) {
    try {
      const { WorkspaceRole } = require("./workspaceRole");
      const users = (
        await WorkspaceUser.where({ workspace_id: Number(workspaceId) })
      ).map((rel) => rel);

      const usersById = await User.where({
        id: { in: users.map((user) => user.user_id) },
      });
      // Role name is now resolved via workspace_role_id (a role's name can
      // change without this list needing to change) - a null id (never
      // written by the app, but tolerated for safety) falls back to the
      // instance default role, same as everywhere else that reads it.
      const defaultRole = await WorkspaceRole.defaultRole();

      const userInfo = await Promise.all(
        usersById.map(async (user) => {
          const workspaceUser = users.find((u) => u.user_id === user.id);
          const role = workspaceUser.workspace_role_id
            ? await WorkspaceRole.get({ id: workspaceUser.workspace_role_id })
            : defaultRole;
          return {
            userId: user.id,
            username: user.username,
            // `instanceRole` is the account-wide role (admin/manager/default).
            // `workspaceRole` is scoped to just this workspace.
            instanceRole: user.role,
            workspaceRole: role?.name ?? "member",
            lastUpdatedAt: workspaceUser.lastUpdatedAt,
          };
        })
      );

      return userInfo;
    } catch (error) {
      console.error(error.message);
      return [];
    }
  },

  /**
   * Update the users for a workspace. Will remove all existing users and replace them with the new list.
   * Preserves workspace-scoped admin status (see server/models/workspaceUsers.js)
   * for any user who remains in the new list - createManyUsers() has no
   * concept of role and would otherwise silently reset every member,
   * including existing workspace-admins, back to "member" on every call to
   * this wholesale-replace method (used by the pre-existing
   * /admin/workspaces/:workspaceId/update-users endpoint), bypassing the
   * last-admin-lockout guard entirely since that guard only lives in
   * WorkspaceUser.removeUser()/setRole(), not this path.
   * @param {number} workspaceId - The ID of the workspace to update.
   * @param {number[]} userIds - An array of user IDs to add to the workspace.
   * @returns {Promise<{success: boolean, error: string | null}>} A promise that resolves to an object containing the success status and an error message if applicable.
   */
  updateUsers: async function (workspaceId, userIds = []) {
    try {
      const priorAdminIds = (
        await WorkspaceUser.where({
          workspace_id: Number(workspaceId),
          role: "admin",
        })
      ).map((rel) => rel.user_id);

      await WorkspaceUser.delete({ workspace_id: Number(workspaceId) });
      await WorkspaceUser.createManyUsers(userIds, workspaceId);

      const idsToRestore = priorAdminIds.filter((id) =>
        userIds.map(Number).includes(Number(id))
      );
      for (const userId of idsToRestore)
        await WorkspaceUser.setRole(userId, workspaceId, "admin");

      return { success: true, error: null };
    } catch (error) {
      console.error(error.message);
      return { success: false, error: error.message };
    }
  },

  trackChange: async function (prevData, newData, user) {
    try {
      await this._trackWorkspacePromptChange(prevData, newData, user);
      return;
    } catch (error) {
      console.error("Error tracking workspace change:", error.message);
      return;
    }
  },

  /**
   * We are tracking this change to determine the need to a prompt library or
   * prompt assistant feature. If this is something you would like to see - tell us on GitHub!
   * We now track the prompt change in the PromptHistory model.
   * which is a sub-model of the Workspace model.
   * @param {Workspace} prevData - The previous data of the workspace.
   * @param {Workspace} newData - The new data of the workspace.
   * @param {{id: number, role: string}|null} user - The user who made the change.
   * @returns {Promise<void>}
   */
  _trackWorkspacePromptChange: async function (prevData, newData, user = null) {
    if (
      !!newData?.openAiPrompt && // new prompt is set
      !!prevData?.openAiPrompt && // previous prompt was not null (default)
      prevData?.openAiPrompt !== this.defaultPrompt && // previous prompt was not default
      newData?.openAiPrompt !== prevData?.openAiPrompt // previous and new prompt are not the same
    )
      await PromptHistory.handlePromptChange(prevData, user); // log the change to the prompt history

    const { Telemetry } = require("./telemetry");
    const { EventLogs } = require("./eventLogs");
    if (
      !newData?.openAiPrompt || // no prompt change
      newData?.openAiPrompt === this.defaultPrompt || // new prompt is default prompt
      newData?.openAiPrompt === prevData?.openAiPrompt // same prompt
    )
      return;

    await Telemetry.sendTelemetry("workspace_prompt_changed");
    await EventLogs.logEvent(
      "workspace_prompt_changed",
      {
        workspaceName: prevData?.name,
        prevSystemPrompt: prevData?.openAiPrompt || this.defaultPrompt,
        newSystemPrompt: newData?.openAiPrompt,
      },
      user?.id
    );
    return;
  },

  // Direct DB queries for API use only.
  /**
   * Generic prisma FindMany query for workspaces collections
   * @param {import("../node_modules/.prisma/client/index.d.ts").Prisma.TypeMap['model']['workspaces']['operations']['findMany']['args']} prismaQuery
   * @returns
   */
  _findMany: async function (prismaQuery = {}) {
    try {
      const results = await prisma.workspaces.findMany(prismaQuery);
      return results;
    } catch (error) {
      console.error(error.message);
      return null;
    }
  },

  /**
   * Generic prisma query for .get of workspaces collections
   * @param {import("../node_modules/.prisma/client/index.d.ts").Prisma.TypeMap['model']['workspaces']['operations']['findFirst']['args']} prismaQuery
   * @returns
   */
  _findFirst: async function (prismaQuery = {}) {
    try {
      const results = await prisma.workspaces.findFirst(prismaQuery);
      return results;
    } catch (error) {
      console.error(error.message);
      return null;
    }
  },

  /**
   * Upsert a workspace.
   * If the workspace does not exist, it will be created.
   * If the workspace exists, it will be updated (if data is provided).
   * @param {Object} clause - The clause to upsert the workspace by.
   * @param {Object} createData - The data to create the workspace with.
   * @param {Object} updateData - The data to update the workspace with if it already exists.
   * @returns {Promise<{workspace: import("@prisma/client").workspaces | null, error: string | null}>} A promise that resolves to an object containing the upserted workspace and an error message if applicable.
   */
  upsert: async function (clause = {}, createData = {}, updateData = {}) {
    try {
      const workspace = await prisma.workspaces.upsert({
        where: clause,
        update: updateData,
        create: createData,
      });
      return { workspace, error: null };
    } catch (error) {
      console.error(error.message);
      return { workspace: null, error: error.message };
    }
  },

  /**
   * Get the prompt history for a workspace.
   * @param {Object} options - The options to get prompt history for.
   * @param {number} options.workspaceId - The ID of the workspace to get prompt history for.
   * @returns {Promise<Array<{id: number, prompt: string, modifiedAt: Date, modifiedBy: number, user: {id: number, username: string, role: string}}>>} A promise that resolves to an array of prompt history objects.
   */
  promptHistory: async function ({ workspaceId }) {
    try {
      const results = await PromptHistory.forWorkspace(workspaceId);
      return results;
    } catch (error) {
      console.error(error.message);
      return [];
    }
  },

  /**
   * Delete the prompt history for a workspace.
   * @param {Object} options - The options to delete the prompt history for.
   * @param {number} options.workspaceId - The ID of the workspace to delete prompt history for.
   * @returns {Promise<boolean>} A promise that resolves to a boolean indicating the success of the operation.
   */
  deleteAllPromptHistory: async function ({ workspaceId }) {
    try {
      return await PromptHistory.delete({ workspaceId });
    } catch (error) {
      console.error(error.message);
      return false;
    }
  },

  /**
   * Delete the prompt history for a workspace.
   * @param {Object} options - The options to delete the prompt history for.
   * @param {number} options.workspaceId - The ID of the workspace to delete prompt history for.
   * @param {number} options.id - The ID of the prompt history to delete.
   * @returns {Promise<boolean>} A promise that resolves to a boolean indicating the success of the operation.
   */
  deletePromptHistory: async function ({ workspaceId, id }) {
    try {
      return await PromptHistory.delete({ id, workspaceId });
    } catch (error) {
      console.error(error.message);
      return false;
    }
  },

  /**
   * Checks if the workspace's chat provider/model waterfall supports native tool calling.
   * @param {Workspace} workspace - The workspace object to check
   * @returns {Promise<boolean>}
   */
  supportsNativeToolCalling: async function (workspace = {}) {
    if (!workspace) return false;
    const { getBaseLLMProviderModel } = require("../utils/helpers");
    const AIbitat = require("../utils/agents/aibitat");
    const provider =
      workspace?.agentProvider ??
      workspace?.chatProvider ??
      process.env.LLM_PROVIDER;

    // Model router delegates to a resolved provider at chat time.
    // Check the router's fallback provider for tool calling support
    // as a reasonable proxy for the router's capabilities.
    if (provider === "anythingllm-router") {
      const { ModelRouter } = require("./modelRouter");
      const routerId =
        workspace?.router_id ||
        (process.env.MODEL_ROUTER_ID
          ? Number(process.env.MODEL_ROUTER_ID)
          : null);
      if (!routerId) return false;
      const router = await ModelRouter.get({ id: routerId });
      if (!router) return false;
      const fallbackConfig = {
        provider: router.fallback_provider,
        model: router.fallback_model,
      };
      const fallbackProvider = new AIbitat(fallbackConfig).getProviderForConfig(
        fallbackConfig
      );
      return (await fallbackProvider.supportsNativeToolCalling?.()) ?? false;
    }

    const model =
      workspace?.agentModel ??
      workspace?.chatModel ??
      getBaseLLMProviderModel({ provider });
    const agentConfig = { provider, model };
    const agentProvider = new AIbitat(agentConfig).getProviderForConfig(
      agentConfig
    );
    const nativeToolCalling = await agentProvider.supportsNativeToolCalling?.();
    return nativeToolCalling;
  },

  /**
   * Checks if the agent command is available for a workspace
   * by checking if the workspace's agent provider supports native tool calling.
   * - If the workspaces chat provider/model supports native tool calling, then the agent command is NOT available
   * as it will be assumed the model is capable of handling tool calls.
   * Otherwise, the agent command is available and the user must opt-in to "@agent" to use tool calls.
   * @param {Workspace} workspace - The workspace object to check
   * @returns {Promise<boolean>}
   */
  isAgentCommandAvailable: async function (workspace) {
    if (workspace.chatMode !== "automatic") return true;
    const nativeToolCalling = await this.supportsNativeToolCalling(workspace);
    return nativeToolCalling === false;
  },
};

module.exports = { Workspace };

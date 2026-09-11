const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const { FlowExecutor, FLOW_TYPES } = require("./executor");
const { normalizePath, isWithin } = require("../files");
const { safeJsonParse } = require("../http");

/**
 * @typedef {Object} LoadedFlow
 * @property {string} name - The name of the flow
 * @property {string} uuid - The UUID of the flow
 * @property {Object} config - The flow configuration details
 * @property {string} config.description - The description of the flow
 * @property {Array<{type: string, config: Object, [key: string]: any}>} config.steps - The steps of the flow. Each step has at least a type and config
 */

class AgentFlows {
  static flowsDir = process.env.STORAGE_DIR
    ? path.join(process.env.STORAGE_DIR, "plugins", "agent-flows")
    : path.join(process.cwd(), "storage", "plugins", "agent-flows");

  constructor() {}

  /**
   * Ensure flows directory exists
   * @returns {Boolean} True if directory exists, false otherwise
   */
  static createOrCheckFlowsDir() {
    try {
      if (fs.existsSync(AgentFlows.flowsDir)) return true;
      fs.mkdirSync(AgentFlows.flowsDir, { recursive: true });
      return true;
    } catch (error) {
      console.error("Failed to create flows directory:", error);
      return false;
    }
  }

  /**
   * Helper to get all flow files with their contents
   * @returns {Object} Map of flow UUID to flow config
   */
  static getAllFlows() {
    AgentFlows.createOrCheckFlowsDir();
    const files = fs.readdirSync(AgentFlows.flowsDir);
    const flows = {};

    for (const file of files) {
      if (!file.endsWith(".json")) continue;
      try {
        const filePath = path.join(AgentFlows.flowsDir, file);
        const content = fs.readFileSync(normalizePath(filePath), "utf8");
        const config = JSON.parse(content);
        const id = file.replace(".json", "");
        flows[id] = config;
      } catch (error) {
        console.error(`Error reading flow file ${file}:`, error);
      }
    }

    return flows;
  }

  /**
   * Load a flow configuration by UUID
   * @param {string} uuid - The UUID of the flow to load
   * @returns {LoadedFlow|null} Flow configuration or null if not found
   */
  static loadFlow(uuid) {
    try {
      const flowJsonPath = normalizePath(
        path.join(AgentFlows.flowsDir, `${uuid}.json`)
      );
      if (
        !uuid ||
        !fs.existsSync(flowJsonPath) ||
        !isWithin(AgentFlows.flowsDir, flowJsonPath)
      )
        return null;
      const flow = safeJsonParse(fs.readFileSync(flowJsonPath, "utf8"), null);
      if (!flow) return null;

      return {
        name: flow.name,
        uuid,
        config: flow,
      };
    } catch (error) {
      console.error("Failed to load flow:", error);
      return null;
    }
  }

  /**
   * Save a flow configuration
   *
   * Ownership is decided here and never taken from the caller's `config`: on an update the
   * `workspaceId` already on disk always wins, so editing a flow - from the admin screen or
   * from inside a workspace - can never move it to another owner. `workspaceId` is only read
   * from `opts` when the flow is being created.
   *
   * @param {string} name - The name of the flow
   * @param {Object} config - The flow configuration
   * @param {string|null} uuid - Optional UUID for the flow
   * @param {{workspaceId?: number|null}} opts - Owner to stamp on a newly created flow.
   *  Omit (or pass null) for a global, admin-created flow.
   * @returns {Object} Result of the save operation
   */
  static saveFlow(name, config, uuid = null, { workspaceId = null } = {}) {
    try {
      AgentFlows.createOrCheckFlowsDir();

      const isUpdate = !!uuid;
      if (!uuid) uuid = uuidv4();
      const normalizedUuid = normalizePath(`${uuid}.json`);
      const filePath = path.join(AgentFlows.flowsDir, normalizedUuid);
      if (!isWithin(AgentFlows.flowsDir, filePath)) return null;

      const owner = isUpdate
        ? AgentFlows.flowOwner(uuid)
        : AgentFlows.normalizeWorkspaceId(workspaceId);

      // Prevent saving flows with unsupported blocks or importing
      // flows with unsupported blocks (eg: file writing or code execution on Desktop importing to Docker)
      const supportedFlowTypes = Object.values(FLOW_TYPES).map(
        (definition) => definition.type
      );
      const supportsAllBlocks = config.steps.every((step) =>
        supportedFlowTypes.includes(step.type)
      );
      if (!supportsAllBlocks)
        throw new Error(
          "This flow includes unsupported blocks. They may not be supported by your version of NexusAI or are not available on this platform."
        );

      fs.writeFileSync(
        filePath,
        JSON.stringify({ ...config, name, workspaceId: owner }, null, 2)
      );
      return { success: true, uuid };
    } catch (error) {
      console.error("Failed to save flow:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Coerce a stored/supplied owner into either a workspace id or null. Anything that is
   * not a positive integer is treated as "global", so a malformed file can never make a
   * flow look owned by a workspace that does not exist.
   * @param {any} workspaceId
   * @returns {number|null}
   */
  static normalizeWorkspaceId(workspaceId) {
    const id = Number(workspaceId);
    return Number.isInteger(id) && id > 0 ? id : null;
  }

  /**
   * The workspace that owns a flow, or null when the flow is global.
   * Returns null for a flow that does not exist - callers guard on existence separately.
   * @param {string} uuid
   * @returns {number|null}
   */
  static flowOwner(uuid) {
    const flow = AgentFlows.loadFlow(uuid);
    if (!flow) return null;
    return AgentFlows.normalizeWorkspaceId(flow.config?.workspaceId);
  }

  /**
   * Public summary of a flow, shaped like SlashCommandPresets.toPublic so both
   * scoped features describe themselves the same way to the UI.
   * @param {string} uuid
   * @param {Object} flow - raw flow config as stored on disk
   * @returns {{name: string, uuid: string, description: string, active: boolean, workspaceId: number|null, scope: "global"|"workspace"}}
   */
  static toPublic(uuid, flow) {
    const workspaceId = AgentFlows.normalizeWorkspaceId(flow?.workspaceId);
    return {
      name: flow?.name,
      uuid,
      description: flow?.description,
      active: flow?.active !== false,
      workspaceId,
      scope: workspaceId === null ? "global" : "workspace",
    };
  }

  /**
   * List every flow on the instance, whatever its owner. This is the admin view - it is
   * deliberately unfiltered so an operator can audit what workspaces have built.
   * @returns {Array} Array of flow summaries
   */
  static listFlows() {
    try {
      const flows = AgentFlows.getAllFlows();
      return Object.entries(flows).map(([uuid, flow]) =>
        AgentFlows.toPublic(uuid, flow)
      );
    } catch (error) {
      console.error("Failed to list flows:", error);
      return [];
    }
  }

  /**
   * Flows with no owner - the ones an admin manages and may share into workspaces.
   * @returns {Array} Array of flow summaries
   */
  static globalFlows() {
    return AgentFlows.listFlows().filter((flow) => flow.workspaceId === null);
  }

  /**
   * Flows built inside one workspace. These are visible nowhere else and are never
   * offered to the "visible to workspaces" sharing UI.
   * @param {number|null} workspaceId
   * @returns {Array} Array of flow summaries
   */
  static ownedByWorkspace(workspaceId = null) {
    const id = AgentFlows.normalizeWorkspaceId(workspaceId);
    if (id === null) return [];
    return AgentFlows.listFlows().filter((flow) => flow.workspaceId === id);
  }

  /**
   * Every flow a workspace is allowed to reference: the global pool plus its own.
   * This is the set the workspace's agent-skill catalog and runtime may draw from.
   * @param {number|null} workspaceId
   * @returns {Array} Array of flow summaries
   */
  static listFlowsForWorkspace(workspaceId = null) {
    const id = AgentFlows.normalizeWorkspaceId(workspaceId);
    return AgentFlows.listFlows().filter(
      (flow) => flow.workspaceId === null || flow.workspaceId === id
    );
  }

  /**
   * Delete a flow by UUID
   * @param {string} uuid - The UUID of the flow to delete
   * @returns {Object} Result of the delete operation
   */
  static deleteFlow(uuid) {
    try {
      const filePath = normalizePath(
        path.join(AgentFlows.flowsDir, `${uuid}.json`)
      );
      if (!fs.existsSync(filePath) || !isWithin(AgentFlows.flowsDir, filePath))
        throw new Error(`Flow ${uuid} not found`);
      fs.rmSync(filePath);
      return { success: true };
    } catch (error) {
      console.error("Failed to delete flow:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete every flow owned by a workspace. Flows are files, so they get none of the
   * `onDelete: Cascade` a Prisma row would - without this a deleted workspace would leave
   * its flows on disk, and a later workspace reusing the id would inherit them.
   * @param {number|null} workspaceId
   * @returns {number} How many flows were removed
   */
  static deleteFlowsForWorkspace(workspaceId = null) {
    const owned = AgentFlows.ownedByWorkspace(workspaceId);
    let removed = 0;
    for (const flow of owned) {
      const { success } = AgentFlows.deleteFlow(flow.uuid);
      if (success) removed++;
    }
    return removed;
  }

  /**
   * Execute a flow by UUID
   * @param {string} uuid - The UUID of the flow to execute
   * @param {Object} variables - Initial variables for the flow
   * @param {Object} aibitat - The aibitat instance from the agent handler
   * @returns {Promise<Object>} Result of flow execution
   */
  static async executeFlow(uuid, variables = {}, aibitat = null) {
    const flow = AgentFlows.loadFlow(uuid);
    if (!flow) throw new Error(`Flow ${uuid} not found`);
    const flowExecutor = new FlowExecutor();
    return await flowExecutor.executeFlow(flow, variables, aibitat);
  }

  /**
   * Get all active flows as plugins that can be loaded into the agent.
   *
   * Instance-wide and therefore owner-blind - only safe where no workspace is in play.
   * Anything resolving flows for a specific workspace must use
   * `activeFlowPluginsForWorkspace` instead, or one workspace's flow would leak into another.
   * @returns {string[]} Array of flow names in @@flow_{uuid} format
   */
  static activeFlowPlugins() {
    const flows = AgentFlows.getAllFlows();
    return Object.entries(flows)
      .filter(([_, flow]) => flow.active !== false)
      .map(([uuid]) => `@@flow_${uuid}`);
  }

  /**
   * Active flows a given workspace may load: the global pool plus its own. A flow owned
   * by a different workspace is excluded even if its uuid is sitting in this workspace's
   * `activeFlows` - stale config or a crafted id must not be able to load it.
   * @param {number|null} workspaceId
   * @returns {string[]} Array of flow names in @@flow_{uuid} format
   */
  static activeFlowPluginsForWorkspace(workspaceId = null) {
    return AgentFlows.listFlowsForWorkspace(workspaceId)
      .filter((flow) => flow.active)
      .map((flow) => `@@flow_${flow.uuid}`);
  }

  /**
   * Sanitize a flow name into a valid OpenAI-compatible tool name.
   * Must match ^[a-zA-Z0-9_-]{1,64}$
   * @param {string} flowName - The human-readable flow name
   * @returns {string|null} Sanitized tool name, or null if empty after sanitization
   */
  static sanitizeToolName(flowName) {
    const sanitized = flowName
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_-]/g, "")
      .replace(/_+/g, "_")
      .replace(/^[-_]+|[-_]+$/g, "");
    if (!sanitized) return null;
    return sanitized.slice(0, 64);
  }

  /**
   * Load a flow plugin by its UUID
   * @param {string} uuid - The UUID of the flow to load
   * @returns {Object|null} Plugin configuration or null if not found
   */
  static loadFlowPlugin(uuid) {
    const flow = AgentFlows.loadFlow(uuid);
    if (!flow) return null;

    const startBlock = flow.config.steps?.find((s) => s.type === "start");
    const variables = startBlock?.config?.variables || [];
    const toolName = AgentFlows.sanitizeToolName(flow.name) || `flow_${uuid}`;

    // Variables without a type predate categories and retain their original
    // optional behavior. Static values stay inside the flow and are never
    // exposed to, or accepted from, the LLM.
    const llmVariables = variables.filter(
      (variable) => variable.name && (variable.type || "optional") !== "static"
    );
    const requiredNames = llmVariables
      .filter((variable) => variable.type === "required")
      .map((variable) => variable.name);

    return {
      name: toolName,
      description: `Execute agent flow: ${flow.name}`,
      plugin: (_runtimeArgs = {}) => ({
        name: toolName,
        description:
          flow.config.description || `Execute agent flow: ${flow.name}`,
        setup: (aibitat) => {
          aibitat.function({
            name: toolName,
            description:
              flow.config.description || `Execute agent flow: ${flow.name}`,
            parameters: {
              type: "object",
              properties: llmVariables.reduce((acc, variable) => {
                acc[variable.name] = {
                  type: "string",
                  description:
                    variable.description ||
                    `Value for variable ${variable.name}`,
                };
                return acc;
              }, {}),
              required: requiredNames,
            },
            handler: async (args = {}) => {
              // Provider implementations do not all enforce JSON Schema in the
              // same way, so validate required values here as well. Filtering
              // also prevents hallucinated keys from overriding static values.
              const flowArgs = Object.fromEntries(
                Object.entries(args).filter(([key]) =>
                  llmVariables.some((variable) => variable.name === key)
                )
              );
              const missing = requiredNames.filter(
                (name) => flowArgs[name] === undefined || flowArgs[name] === ""
              );
              if (missing.length > 0)
                return `Flow execution failed: missing required parameter(s): ${missing.join(", ")}`;

              aibitat.introspect(`Executing flow: ${flow.name}`);
              const result = await AgentFlows.executeFlow(
                uuid,
                flowArgs,
                aibitat
              );
              if (!result.success) {
                aibitat.introspect(
                  `Flow failed: ${result.results[0]?.error || "Unknown error"}`
                );
                return `Flow execution failed: ${result.results[0]?.error || "Unknown error"}`;
              }
              aibitat.introspect(`${flow.name} completed successfully`);

              // If the flow result has directOutput, return it
              // as the aibitat result so that no other processing is done
              if (!!result.directOutput) {
                aibitat.skipHandleExecution = true;
                return AgentFlows.stringifyResult(result.directOutput);
              }

              return AgentFlows.stringifyResult(result);
            },
          });
        },
      }),
      flowName: flow.name,
    };
  }

  /**
   * Stringify the result of a flow execution or return the input as is
   * @param {Object|string} input - The result to stringify
   * @returns {string} The stringified result
   */
  static stringifyResult(input) {
    return typeof input === "object" ? JSON.stringify(input) : String(input);
  }
}

module.exports.AgentFlows = AgentFlows;

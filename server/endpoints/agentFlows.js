const { AgentFlows } = require("../utils/agentFlows");
const {
  userPermissionValid,
} = require("../utils/middleware/authorizedRequest");
const { PERMISSIONS } = require("../utils/permissions");
const { validatedRequest } = require("../utils/middleware/validatedRequest");
const { Telemetry } = require("../models/telemetry");
const { Workspace } = require("../models/workspace");
const {
  resolveConfigForWorkspace,
} = require("../utils/agents/workspaceSkills");

function agentFlowEndpoints(app) {
  if (!app) return;

  // Save a flow configuration
  app.post(
    "/agent-flows/save",
    [validatedRequest, userPermissionValid([PERMISSIONS.AGENTS_FLOWS])],
    async (request, response) => {
      try {
        const { name, config, uuid } = request.body;

        if (!name || !config) {
          return response.status(400).json({
            success: false,
            error: "Name and config are required",
          });
        }

        const flow = AgentFlows.saveFlow(name, config, uuid);
        if (!flow || !flow.success)
          return response
            .status(200)
            .json({ flow: null, error: flow.error || "Failed to save flow" });

        if (!uuid) {
          await Telemetry.sendTelemetry("agent_flow_created", {
            blockCount: config.blocks?.length || 0,
          });
        }

        return response.status(200).json({
          success: true,
          flow,
        });
      } catch (error) {
        console.error("Error saving flow:", error);
        return response.status(500).json({
          success: false,
          error: error.message,
        });
      }
    }
  );

  // List all available flows
  app.get(
    "/agent-flows/list",
    [validatedRequest, userPermissionValid([PERMISSIONS.AGENTS_FLOWS])],
    async (_request, response) => {
      try {
        const flows = AgentFlows.listFlows();
        return response.status(200).json({
          success: true,
          flows,
        });
      } catch (error) {
        console.error("Error listing flows:", error);
        return response.status(500).json({
          success: false,
          error: error.message,
        });
      }
    }
  );

  // Get a specific flow by UUID
  app.get(
    "/agent-flows/:uuid",
    [validatedRequest, userPermissionValid([PERMISSIONS.AGENTS_FLOWS])],
    async (request, response) => {
      try {
        const { uuid } = request.params;
        const flow = AgentFlows.loadFlow(uuid);
        if (!flow) {
          return response.status(404).json({
            success: false,
            error: "Flow not found",
          });
        }

        return response.status(200).json({
          success: true,
          flow,
        });
      } catch (error) {
        console.error("Error getting flow:", error);
        return response.status(500).json({
          success: false,
          error: error.message,
        });
      }
    }
  );

  // Run a specific flow
  // app.post(
  //   "/agent-flows/:uuid/run",
  //   [validatedRequest, userPermissionValid([PERMISSIONS.AGENTS_FLOWS])],
  //   async (request, response) => {
  //     try {
  //       const { uuid } = request.params;
  //       const { variables = {} } = request.body;

  //       // TODO: Implement flow execution
  //       console.log("Running flow with UUID:", uuid);

  //       await Telemetry.sendTelemetry("agent_flow_executed", {
  //         variableCount: Object.keys(variables).length,
  //       });

  //       return response.status(200).json({
  //         success: true,
  //         results: {
  //           success: true,
  //           results: "test",
  //           variables: variables,
  //         },
  //       });
  //     } catch (error) {
  //       console.error("Error running flow:", error);
  //       return response.status(500).json({
  //         success: false,
  //         error: error.message,
  //       });
  //     }
  //   }
  // );

  // Delete a specific flow
  app.delete(
    "/agent-flows/:uuid",
    [validatedRequest, userPermissionValid([PERMISSIONS.AGENTS_FLOWS])],
    async (request, response) => {
      try {
        const { uuid } = request.params;
        const { success } = AgentFlows.deleteFlow(uuid);

        if (!success) {
          return response.status(500).json({
            success: false,
            error: "Failed to delete flow",
          });
        }

        return response.status(200).json({
          success,
        });
      } catch (error) {
        console.error("Error deleting flow:", error);
        return response.status(500).json({
          success: false,
          error: error.message,
        });
      }
    }
  );

  // Which workspaces can currently see/use this flow, and which cannot.
  app.get(
    "/agent-flows/:uuid/workspaces",
    [validatedRequest, userPermissionValid([PERMISSIONS.AGENTS_FLOWS])],
    async (request, response) => {
      try {
        const { uuid } = request.params;
        const flow = AgentFlows.loadFlow(uuid);
        if (!flow)
          return response
            .status(404)
            .json({ success: false, error: "Flow not found" });

        const workspaces = await Workspace.where({});
        const results = await Promise.all(
          workspaces.map(async (workspace) => {
            const config = await resolveConfigForWorkspace(workspace);
            return {
              id: workspace.id,
              name: workspace.name,
              slug: workspace.slug,
              enabled: config.activeFlows.includes(uuid),
            };
          })
        );

        return response
          .status(200)
          .json({ success: true, workspaces: results });
      } catch (error) {
        console.error("Error listing flow workspaces:", error);
        response.status(500).json({ success: false, error: error.message });
      }
    }
  );

  // Set the exact list of workspaces that can see/use this flow. Every other
  // workspace on the instance has it turned off. Only workspaces whose
  // membership actually changes are written, so an untouched workspace's
  // other agent skill settings are never disturbed.
  app.post(
    "/agent-flows/:uuid/workspaces",
    [validatedRequest, userPermissionValid([PERMISSIONS.AGENTS_FLOWS])],
    async (request, response) => {
      try {
        const { uuid } = request.params;
        const { workspaceIds } = request.body;
        const flow = AgentFlows.loadFlow(uuid);
        if (!flow)
          return response
            .status(404)
            .json({ success: false, error: "Flow not found" });
        if (!Array.isArray(workspaceIds))
          return response
            .status(400)
            .json({ success: false, error: "workspaceIds must be an array" });

        const desired = new Set(workspaceIds.map((id) => Number(id)));
        const workspaces = await Workspace.where({});

        for (const workspace of workspaces) {
          const config = await resolveConfigForWorkspace(workspace);
          const isEnabled = config.activeFlows.includes(uuid);
          const shouldBeEnabled = desired.has(workspace.id);
          if (isEnabled === shouldBeEnabled) continue;

          const activeFlows = shouldBeEnabled
            ? [...new Set([...config.activeFlows, uuid])]
            : config.activeFlows.filter((id) => id !== uuid);

          await Workspace.update(workspace.id, {
            agentSkillConfig: JSON.stringify({ ...config, activeFlows }),
          });
        }

        return response.status(200).json({ success: true });
      } catch (error) {
        console.error("Error updating flow workspaces:", error);
        response.status(500).json({ success: false, error: error.message });
      }
    }
  );

  // Toggle flow active status
  app.post(
    "/agent-flows/:uuid/toggle",
    [validatedRequest, userPermissionValid([PERMISSIONS.AGENTS_FLOWS])],
    async (request, response) => {
      try {
        const { uuid } = request.params;
        const { active } = request.body;

        const flow = AgentFlows.loadFlow(uuid);
        if (!flow) {
          return response
            .status(404)
            .json({ success: false, error: "Flow not found" });
        }

        flow.config.active = active;
        const { success } = AgentFlows.saveFlow(flow.name, flow.config, uuid);

        if (!success) {
          return response
            .status(500)
            .json({ success: false, error: "Failed to update flow" });
        }

        return response.json({ success: true, flow });
      } catch (error) {
        console.error("Error toggling flow:", error);
        response.status(500).json({ success: false, error: error.message });
      }
    }
  );
}

module.exports = { agentFlowEndpoints };

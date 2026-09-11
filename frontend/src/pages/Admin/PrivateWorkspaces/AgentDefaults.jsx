import WorkspaceAgentConfiguration from "@/pages/WorkspaceSettings/AgentConfig";
import Admin from "@/models/admin";
import showToast from "@/utils/toast";

/**
 * The agent every private workspace runs.
 *
 * This is the workspace agent configuration screen itself, pointed at the private
 * workspace profile instead of one workspace: the same skill list, the same flow, SQL
 * and MCP toggles, the same runtime knobs. Two things are necessarily absent, because a
 * profile is a template and owns nothing - building a flow, and adding a database
 * connection. Both belong to a real workspace, and both are already reachable from the
 * instance-wide agent pages.
 */
export default function AgentDefaults({ workspace, settings }) {
  if (!workspace) return null;

  return (
    <WorkspaceAgentConfiguration
      workspace={workspace}
      settings={settings}
      permissions={{ manageSkills: true, setModel: true }}
      copy={{
        title: "Agent configuration",
        description:
          "The model and capabilities every private workspace runs with. Changing this reaches every private workspace, including ones already in use.",
        modelDescription:
          "Select the provider and model used by the agent inside private workspaces.",
      }}
      skillsDataSource={{
        load: () => Admin.privateWorkspaceAgentSkills(),
        save: (config) => Admin.updatePrivateWorkspaceAgentSkills(config),
        savedMessage: "Private workspace agent skills updated!",
        revertedMessage:
          "Private workspaces now follow the instance default skills.",
        ownsEntities: false,
      }}
      onSaveAgentModel={async (fields) => {
        const result = await Admin.updatePrivateWorkspaceProfile({
          workspace: fields,
        });
        if (!result?.success) {
          showToast(result?.error ?? "Could not save", "error", {
            clear: true,
          });
          return false;
        }
        showToast("Saved", "success", { clear: true });
        return true;
      }}
    />
  );
}

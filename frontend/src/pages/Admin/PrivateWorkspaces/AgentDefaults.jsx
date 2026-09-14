import WorkspaceAgentConfiguration from "@/pages/WorkspaceSettings/AgentConfig";
import Admin from "@/models/admin";

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
export default function AgentDefaults({
  workspace,
  settings,
  onSave,
  saveBarProps,
  skillSaveBarProps,
}) {
  if (!workspace) return null;

  return (
    <WorkspaceAgentConfiguration
      workspace={workspace}
      settings={settings}
      permissions={{ manageSkills: true, setModel: true }}
      contextualSaveBar
      saveBarProps={saveBarProps}
      skillSaveBarProps={skillSaveBarProps}
      copy={{
        title: "Agent configuration",
        description:
          "The model and capabilities every private workspace runs with. Changing this reaches every private workspace, including ones already in use.",
        modelDescription:
          "Select the model used by the agent inside private workspaces.",
      }}
      skillsDataSource={{
        load: () => Admin.privateWorkspaceAgentSkills(),
        save: (config) => Admin.updatePrivateWorkspaceAgentSkills(config),
        savedMessage: "Private workspace agent skills updated!",
        revertedMessage:
          "Private workspaces now follow the instance default skills.",
        ownsEntities: false,
      }}
      onSaveAgentModel={onSave}
    />
  );
}

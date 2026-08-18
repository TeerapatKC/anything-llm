import Workspace from "@/models/workspace";
import SlashCommandManager from "@/components/SlashCommands/SlashCommandManager";

/**
 * Slash commands that belong to this workspace. They are usable only while chatting
 * here; the instance-wide built-ins are managed under /settings/slash-commands and are
 * deliberately not listed or editable from this screen.
 */
export default function WorkspaceSlashCommands({ workspace }) {
  if (!workspace?.slug) return null;

  return (
    <div className="w-full flex flex-col gap-y-6 px-1">
      <SlashCommandManager
        title="Workspace slash commands"
        description={`Available only when chatting in "${workspace.name}". Every workspace also inherits the instance-wide built-in commands.`}
        emptyHint="No slash commands for this workspace yet. Members here still get the built-in commands."
        fetchPresets={() => Workspace.slashCommands.owned(workspace.slug)}
        createPreset={(preset) =>
          Workspace.slashCommands.create(workspace.slug, preset)
        }
        updatePreset={(id, preset) =>
          Workspace.slashCommands.update(workspace.slug, id, preset)
        }
        deletePreset={(id) =>
          Workspace.slashCommands.delete(workspace.slug, id)
        }
      />
    </div>
  );
}

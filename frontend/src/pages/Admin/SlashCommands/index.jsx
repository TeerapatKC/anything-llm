import System from "@/models/system";
import SettingsLayout from "@/components/layout/SettingsLayout";
import PageHeader from "@/components/layout/PageHeader";
import SlashCommandManager from "@/components/SlashCommands/SlashCommandManager";

/**
 * The instance-wide built-in slash commands. Every workspace inherits these on top of
 * its own commands, so this is the place to put the ones the whole team should have.
 * A workspace that defines the same command shadows the built-in.
 */
export default function BuiltInSlashCommands() {
  return (
    <SettingsLayout>
      <PageHeader
        title={"Built-in Slash Commands"}
        description={
          "Commands defined here are available in every workspace. To add a command for one workspace only, use that workspace's settings."
        }
      />

      <div className="mt-6">
        <SlashCommandManager
          title="Default commands"
          description="Inherited by every workspace. A workspace can define a command with the same name to override the default."
          emptyHint="No built-in commands yet. Add one to make it available in every workspace."
          fetchPresets={() => System.getSlashCommandPresets()}
          createPreset={(preset) => System.createSlashCommandPreset(preset)}
          updatePreset={(id, preset) =>
            System.updateSlashCommandPreset(id, preset)
          }
          deletePreset={(id) => System.deleteSlashCommandPreset(id)}
        />
      </div>
    </SettingsLayout>
  );
}

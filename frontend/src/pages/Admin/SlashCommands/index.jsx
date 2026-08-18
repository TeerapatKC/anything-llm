import System from "@/models/system";
import Sidebar from "@/components/SettingsSidebar";
import SlashCommandManager from "@/components/SlashCommands/SlashCommandManager";

/**
 * The instance-wide built-in slash commands. Every workspace inherits these on top of
 * its own commands, so this is the place to put the ones the whole team should have.
 * A workspace that defines the same command shadows the built-in.
 */
export default function BuiltInSlashCommands() {
  return (
    <div className="w-screen h-screen overflow-hidden bg-theme-bg-container flex">
      <Sidebar />
      <div
        style={{ height: "100%" }}
        className="relative bg-theme-bg-secondary w-full h-full overflow-y-scroll p-4 md:p-0"
      >
        <div className="flex flex-col w-full px-1 md:pl-6 md:pr-[50px] md:py-6 py-16">
          <div className="w-full flex flex-col gap-y-1 pb-6 border-white/10 border-b-2">
            <div className="items-center flex gap-x-4">
              <p className="text-lg leading-6 font-bold text-theme-text-primary">
                Built-in Slash Commands
              </p>
            </div>
            <p className="text-xs leading-[18px] font-base text-theme-text-secondary">
              Commands defined here are available in every workspace. To add a
              command for one workspace only, use that workspace's settings.
            </p>
          </div>

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
        </div>
      </div>
    </div>
  );
}

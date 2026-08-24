import System from "@/models/system";
import showToast from "@/utils/toast";
import { Plug, Settings, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { sentenceCase } from "text-case";
import Toggle from "@/components/lib/Toggle";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ConfirmDialog from "@/components/ConfirmDialog";

/**
 * Converts setup_args to inputs for the form builder
 * @param {object} setupArgs - The setup arguments object
 * @returns {object} - The inputs object
 */
function inputsFromArgs(setupArgs) {
  if (
    !setupArgs ||
    setupArgs.constructor?.call?.().toString() !== "[object Object]"
  ) {
    return {};
  }
  return Object.entries(setupArgs).reduce(
    (acc, [key, props]) => ({
      ...acc,
      [key]: props.hasOwnProperty("value")
        ? props.value
        : props?.input?.default || "",
    }),
    {}
  );
}

/**
 * Imported skill config component for imported skills only.
 * @returns {JSX.Element}
 */
export default function ImportedSkillConfig({
  selectedSkill, // imported skill config object
  setImportedSkills, // function to set imported skills since config is file-write
}) {
  const [config, setConfig] = useState(selectedSkill);
  const [hasChanges, setHasChanges] = useState(false);
  const [inputs, setInputs] = useState(
    inputsFromArgs(selectedSkill?.setup_args)
  );

  const hasSetupArgs =
    selectedSkill?.setup_args &&
    Object.keys(selectedSkill.setup_args).length > 0;

  async function toggleSkill() {
    const updatedConfig = { ...selectedSkill, active: !config.active };
    await System.experimentalFeatures.agentPlugins.updatePluginConfig(
      config.hubId,
      { active: !config.active }
    );
    setImportedSkills((prev) =>
      prev.map((s) => (s.hubId === config.hubId ? updatedConfig : s))
    );
    setConfig(updatedConfig);
    showToast(
      `Skill ${updatedConfig.active ? "activated" : "deactivated"}.`,
      "success",
      { clear: true }
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errors = [];
    const updatedConfig = { ...config };

    for (const [key, value] of Object.entries(inputs)) {
      const settings = config.setup_args[key];
      if (settings.required && !value) {
        errors.push(`${key} is required to have a value.`);
        continue;
      }
      if (typeof value !== settings.type) {
        errors.push(`${key} must be of type ${settings.type}.`);
        continue;
      }
      updatedConfig.setup_args[key].value = value;
    }

    if (errors.length > 0) {
      errors.forEach((error) => showToast(error, "error"));
      return;
    }

    await System.experimentalFeatures.agentPlugins.updatePluginConfig(
      config.hubId,
      updatedConfig
    );
    setConfig(updatedConfig);
    setImportedSkills((prev) =>
      prev.map((skill) =>
        skill.hubId === config.hubId ? updatedConfig : skill
      )
    );
    showToast("Skill config updated successfully.", "success");
    setHasChanges(false);
  }

  useEffect(() => {
    setHasChanges(
      JSON.stringify(inputs) !==
        JSON.stringify(inputsFromArgs(selectedSkill.setup_args))
    );
  }, [inputs]);

  return (
    <>
      <div className="p-2">
        <div className="flex flex-col gap-y-[18px] max-w-[500px]">
          <div className="flex w-full justify-between items-center">
            <div className="flex items-center gap-x-2">
              <Plug size={24} className="text-theme-text-primary" />
              <label
                htmlFor="name"
                className="text-theme-text-primary text-md font-bold"
              >
                {sentenceCase(config.name)}
              </label>
            </div>
            <div className="flex items-center gap-x-2">
              <Toggle
                size="lg"
                enabled={config.active}
                onChange={toggleSkill}
              />
              <ManageSkillMenu
                config={config}
                setImportedSkills={setImportedSkills}
              />
            </div>
          </div>
          <p className="text-theme-text-primary/60 text-xs font-medium py-1.5">
            {config.description} by{" "}
            <a
              href={config.author_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-theme-text-primary hover:underline"
            >
              {config.author}
            </a>
          </p>

          {hasSetupArgs ? (
            <div className="flex flex-col gap-y-2">
              {Object.entries(config.setup_args).map(([key, props]) => (
                <div key={key} className="flex flex-col gap-y-1">
                  <Label htmlFor={key}>{key}</Label>
                  <input
                    type={props?.input?.type || "text"}
                    required={props?.input?.required}
                    defaultValue={
                      props.hasOwnProperty("value")
                        ? props.value
                        : props?.input?.default || ""
                    }
                    onChange={(e) =>
                      setInputs({ ...inputs, [key]: e.target.value })
                    }
                    placeholder={props?.input?.placeholder || ""}
                    className="border-solid bg-transparent border border-white light:border-black rounded-md p-2 text-theme-text-primary text-sm"
                  />
                  <p className="text-theme-text-primary/60 text-xs font-medium py-1.5">
                    {props?.input?.hint}
                  </p>
                </div>
              ))}
              {hasChanges && (
                <button
                  onClick={handleSubmit}
                  type="button"
                  className="bg-blue-500 text-theme-text-primary light:text-white rounded-md p-2"
                >
                  Save
                </button>
              )}
            </div>
          ) : (
            <p className="text-theme-text-primary/60 text-sm font-medium py-1.5">
              There are no options to modify for this skill.
            </p>
          )}
        </div>
      </div>
    </>
  );
}

function ManageSkillMenu({ config, setImportedSkills }) {
  const [confirm, setConfirm] = useState(null);

  async function deleteSkill() {
    setConfirm({
      title: "Delete this skill?",
      description: "This action cannot be undone.",
      confirmText: "Delete skill",
      variant: "destructive",
      onConfirm: deleteSkillNow,
    });
  }

  async function deleteSkillNow() {
    const success = await System.experimentalFeatures.agentPlugins.deletePlugin(
      config.hubId
    );
    if (success) {
      setImportedSkills((prev) => prev.filter((s) => s.hubId !== config.hubId));
      showToast("Skill deleted successfully.", "success");
    } else {
      showToast("Failed to delete skill.", "error");
    }
  }

  if (!config.hubId) return null;
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="icon-sm" aria-label="Manage skill" />
          }
        >
          <Settings />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-40">
          <DropdownMenuItem variant="destructive" onClick={deleteSkill}>
            <Trash2 />
            Delete skill
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ConfirmDialog config={confirm} onClose={() => setConfirm(null)} />
    </>
  );
}

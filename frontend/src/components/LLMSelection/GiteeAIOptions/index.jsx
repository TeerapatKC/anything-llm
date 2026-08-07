import { useState, useEffect } from "react";
import System from "@/models/system";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function GiteeAIOptions({ settings }) {
  return (
    <div className="flex gap-[36px] mt-1.5">
      <div className="flex flex-col w-60">
        <Label variant="settings" className="block mb-3">
          API Key
        </Label>
        <Input
          variant="settings"
          type="password"
          name="GiteeAIApiKey"
          placeholder="GiteeAI API Key"
          defaultValue={settings?.GiteeAIApiKey ? "*".repeat(20) : ""}
          required={true}
          autoComplete="off"
          spellCheck={false}
        />
      </div>
      {!settings?.credentialsOnly && (
        <>
          <GiteeAIModelSelection settings={settings} />
          <div className="flex flex-col w-60">
            <Label variant="settings" className="block mb-2">
              Model context window
            </Label>
            <Input
              variant="settings"
              type="number"
              name="GiteeAITokenLimit"
              placeholder="Content window limit (eg: 8192)"
              min={1}
              onScroll={(e) => e.target.blur()}
              defaultValue={settings?.GiteeAITokenLimit}
              required={true}
              autoComplete="off"
            />
          </div>
        </>
      )}
    </div>
  );
}

function GiteeAIModelSelection({ settings }) {
  const [groupedModels, setGroupedModels] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function findCustomModels() {
      setLoading(true);
      const { models = [] } = await System.customModels("giteeai");
      if (models?.length > 0) {
        const modelsByOrganization = models.reduce((acc, model) => {
          acc[model.organization] = acc[model.organization] || [];
          acc[model.organization].push(model);
          return acc;
        }, {});
        setGroupedModels(modelsByOrganization);
      }

      setLoading(false);
    }
    findCustomModels();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col w-60">
        <Label variant="settings" className="block mb-3">
          Chat Model Selection
        </Label>
        <select
          name="GiteeAIModelPref"
          disabled={true}
          className="border-none bg-theme-settings-input-bg border-gray-500 text-white text-sm rounded-lg block w-full p-2.5"
        >
          <option disabled={true} selected={true}>
            -- loading available models --
          </option>
        </select>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-60">
      <Label variant="settings" className="block mb-3">
        Chat Model Selection
      </Label>
      <select
        name="GiteeAIModelPref"
        required={true}
        className="border-none bg-theme-settings-input-bg border-gray-500 text-white text-sm rounded-lg block w-full p-2.5"
      >
        {Object.keys(groupedModels)
          .sort()
          .map((organization) => (
            <optgroup key={organization} label={organization}>
              {groupedModels[organization].map((model) => (
                <option
                  key={model.id}
                  value={model.id}
                  selected={settings?.GiteeAIModelPref === model.id}
                >
                  {model.name}
                </option>
              ))}
            </optgroup>
          ))}
      </select>
    </div>
  );
}

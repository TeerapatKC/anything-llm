import System from "@/models/system";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function PerplexityOptions({ settings }) {
  return (
    <div className="flex gap-[36px] mt-1.5">
      <div className="flex flex-col w-60">
        <Label variant="settings" className="block mb-3">
          Perplexity API Key
        </Label>
        <Input
          variant="settings"
          type="password"
          name="PerplexityApiKey"
          placeholder="Perplexity API Key"
          defaultValue={settings?.PerplexityApiKey ? "*".repeat(20) : ""}
          required={true}
          autoComplete="off"
          spellCheck={false}
        />
      </div>
      {!settings?.credentialsOnly && (
        <PerplexityModelSelection settings={settings} />
      )}
    </div>
  );
}

function PerplexityModelSelection({ settings }) {
  const [customModels, setCustomModels] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function findCustomModels() {
      setLoading(true);
      const { models } = await System.customModels("perplexity");
      setCustomModels(models || []);
      setLoading(false);
    }
    findCustomModels();
  }, []);

  if (loading || customModels.length == 0) {
    return (
      <div className="flex flex-col w-60">
        <Label variant="settings" className="block mb-3">
          Chat Model Selection
        </Label>
        <select
          name="PerplexityModelPref"
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
        name="PerplexityModelPref"
        required={true}
        className="border-none bg-theme-settings-input-bg border-gray-500 text-white text-sm rounded-lg block w-full p-2.5"
      >
        {customModels.length > 0 && (
          <optgroup label="Available Perplexity Models">
            {customModels.map((model) => {
              return (
                <option
                  key={model.id}
                  value={model.id}
                  selected={settings?.PerplexityModelPref === model.id}
                >
                  {model.id}
                </option>
              );
            })}
          </optgroup>
        )}
      </select>
    </div>
  );
}

import { useState, useEffect } from "react";
import System from "@/models/system";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function CerebrasLLMOptions({ settings }) {
  const [inputValue, setInputValue] = useState(settings?.CerebrasApiKey);
  const [apiKey, setApiKey] = useState(settings?.CerebrasApiKey);

  return (
    <div className="flex gap-[36px] mt-1.5">
      <div className="flex flex-col w-60">
        <Label variant="settings" className="block mb-3">
          Cerebras API Key
        </Label>
        <Input
          variant="settings"
          type="password"
          name="CerebrasApiKey"
          placeholder="Cerebras API Key"
          defaultValue={settings?.CerebrasApiKey ? "*".repeat(20) : ""}
          required={true}
          autoComplete="off"
          spellCheck={false}
          onChange={(e) => setInputValue(e.target.value)}
          onBlur={() => setApiKey(inputValue)}
        />
      </div>

      {!settings?.credentialsOnly && (
        <CerebrasModelSelection settings={settings} apiKey={apiKey} />
      )}
    </div>
  );
}

/**
 * Cerebras model selection component
 * @param {Object} props - The component props
 * @param {string} props.apiKey - The Cerebras API key (not used since we only need public models for now)
 * @param {Object} props.settings - The system settings
 * @returns {JSX.Element} The Cerebras model selection component
 */
function CerebrasModelSelection({ apiKey: _apiKey, settings }) {
  const [customModels, setCustomModels] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function findCustomModels() {
      try {
        setLoading(true);
        const { models } = await System.customModels("cerebras");
        setCustomModels(models || []);
      } catch (error) {
        console.error("Failed to fetch custom models:", error);
        setCustomModels([]);
      } finally {
        setLoading(false);
      }
    }
    findCustomModels();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col w-60">
        <Label variant="settings" className="block mb-3">
          Chat Model Selection
        </Label>
        <Select name="CerebrasModelPref" disabled={true}>
          <SelectTrigger variant="settings">
            <SelectValue placeholder="--loading available models--" />
          </SelectTrigger>
          <SelectContent />
        </Select>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-60">
      <Label variant="settings" className="block mb-3">
        Chat Model Selection
      </Label>
      <Select
        name="CerebrasModelPref"
        required={true}
        defaultValue={settings?.CerebrasModelPref ?? customModels?.[0]?.id}
      >
        <SelectTrigger variant="settings">
          <SelectValue placeholder="Select an option" />
        </SelectTrigger>
        <SelectContent>
          {customModels.length > 0 && (
            <SelectGroup>
              <SelectLabel>Available models</SelectLabel>
              {customModels.map((model) => {
                return (
                  <SelectItem key={model.id} value={model.id}>
                    {model.name}
                  </SelectItem>
                );
              })}
            </SelectGroup>
          )}
        </SelectContent>
      </Select>
    </div>
  );
}

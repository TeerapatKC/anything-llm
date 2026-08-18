import System from "@/models/system";
import { useState, useEffect } from "react";
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

export default function FireworksAiOptions({ settings }) {
  const [inputValue, setInputValue] = useState(settings?.FireworksAiLLMApiKey);
  const [fireworksAiApiKey, setFireworksAiApiKey] = useState(
    settings?.FireworksAiLLMApiKey
  );

  return (
    <div className="flex gap-[36px] mt-1.5">
      <div className="flex flex-col w-60">
        <Label variant="settings" className="block mb-3">
          Fireworks AI API Key
        </Label>
        <Input
          variant="settings"
          type="password"
          name="FireworksAiLLMApiKey"
          placeholder="Fireworks AI API Key"
          defaultValue={settings?.FireworksAiLLMApiKey ? "*".repeat(20) : ""}
          required={true}
          autoComplete="new-password"
          spellCheck={false}
          onChange={(e) => setInputValue(e.target.value)}
          onBlur={() => setFireworksAiApiKey(inputValue)}
        />
      </div>
      {!settings?.credentialsOnly && (
        <FireworksAiModelSelection
          apiKey={fireworksAiApiKey}
          settings={settings}
        />
      )}
    </div>
  );
}
function FireworksAiModelSelection({ apiKey, settings }) {
  const [groupedModels, setGroupedModels] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function findCustomModels() {
      setLoading(true);
      const { models } = await System.customModels("fireworksai", apiKey);

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
  }, [apiKey]);

  if (loading || Object.keys(groupedModels).length === 0) {
    return (
      <div className="flex flex-col w-60">
        <Label variant="settings" className="block mb-3">
          Chat Model Selection
        </Label>
        <Select name="FireworksAiLLMModelPref" disabled={true}>
          <SelectTrigger variant="settings">
            <SelectValue placeholder="-- loading available models --" />
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
        name="FireworksAiLLMModelPref"
        required={true}
        defaultValue={
          settings?.FireworksAiLLMModelPref ??
          groupedModels[Object.keys(groupedModels).sort()[0]]?.[0]?.id
        }
      >
        <SelectTrigger variant="settings">
          <SelectValue placeholder="Select an option" />
        </SelectTrigger>
        <SelectContent>
          {Object.keys(groupedModels)
            .sort()
            .map((organization) => (
              <SelectGroup key={organization}>
                <SelectLabel>{organization}</SelectLabel>
                {groupedModels[organization].map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    {model.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
        </SelectContent>
      </Select>
    </div>
  );
}

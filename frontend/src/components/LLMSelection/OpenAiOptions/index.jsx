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

export default function OpenAiOptions({ settings }) {
  const [inputValue, setInputValue] = useState(settings?.OpenAiKey);
  const [openAIKey, setOpenAIKey] = useState(settings?.OpenAiKey);

  return (
    <div className="flex gap-[36px] mt-1.5">
      <div className="flex flex-col w-60">
        <Label variant="settings" className="block mb-3">
          API Key
        </Label>
        <Input
          variant="settings"
          type="password"
          name="OpenAiKey"
          placeholder="OpenAI API Key"
          defaultValue={settings?.OpenAiKey ? "*".repeat(20) : ""}
          required={true}
          autoComplete="new-password"
          spellCheck={false}
          onChange={(e) => setInputValue(e.target.value)}
          onBlur={() => setOpenAIKey(inputValue)}
        />
      </div>
      {!settings?.credentialsOnly && (
        <OpenAIModelSelection settings={settings} apiKey={openAIKey} />
      )}
    </div>
  );
}

function OpenAIModelSelection({ apiKey, settings }) {
  const [groupedModels, setGroupedModels] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function findCustomModels() {
      setLoading(true);
      const { models } = await System.customModels(
        "openai",
        typeof apiKey === "boolean" ? null : apiKey
      );

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

  if (loading) {
    return (
      <div className="flex flex-col w-60">
        <Label variant="settings" className="block mb-3">
          Chat Model Selection
        </Label>
        <Select name="OpenAiModelPref" disabled={true}>
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
        name="OpenAiModelPref"
        required={true}
        defaultValue={
          settings?.OpenAiModelPref ??
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

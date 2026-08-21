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

export default function TogetherAiOptions({ settings }) {
  const [inputValue, setInputValue] = useState(settings?.TogetherAiApiKey);
  const [apiKey, setApiKey] = useState(settings?.TogetherAiApiKey);

  return (
    <div className="flex gap-[36px] mt-1.5">
      <div className="flex flex-col w-60">
        <Label className="block mb-3">Together AI API Key</Label>
        <Input
          type="password"
          name="TogetherAiApiKey"
          placeholder="Together AI API Key"
          defaultValue={settings?.TogetherAiApiKey ? "*".repeat(20) : ""}
          required={true}
          autoComplete="new-password"
          spellCheck={false}
          onChange={(e) => setInputValue(e.target.value)}
          onBlur={() => setApiKey(inputValue)}
        />
      </div>
      {!settings?.credentialsOnly && (
        <TogetherAiModelSelection settings={settings} apiKey={apiKey} />
      )}
    </div>
  );
}

function TogetherAiModelSelection({ settings, apiKey }) {
  const [groupedModels, setGroupedModels] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function findCustomModels() {
      setLoading(true);
      try {
        const key = apiKey === "*".repeat(20) ? null : apiKey;
        const { models } = await System.customModels("togetherai", key);
        if (models?.length > 0) {
          const modelsByOrganization = models.reduce((acc, model) => {
            if (model.type !== "chat") return acc; // Only show chat models in dropdown
            const org = model.organization || "Unknown";
            acc[org] = acc[org] || [];
            acc[org].push({
              id: model.id,
              name: model.name || model.id,
              organization: org,
              maxLength: model.maxLength,
            });
            return acc;
          }, {});
          setGroupedModels(modelsByOrganization);
        }
      } catch (error) {
        console.error("Error fetching Together AI models:", error);
      }
      setLoading(false);
    }
    findCustomModels();
  }, [apiKey]);

  if (loading || Object.keys(groupedModels).length === 0) {
    return (
      <div className="flex flex-col w-60">
        <Label className="block mb-3">Chat Model Selection</Label>
        <Select name="TogetherAiModelPref" disabled={true}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="-- loading available models --" />
          </SelectTrigger>
          <SelectContent />
        </Select>
      </div>
    );
  }

  const [selectedModel, setSelectedModel] = useState(
    settings?.TogetherAiModelPref || ""
  );

  useEffect(() => {
    setSelectedModel(settings?.TogetherAiModelPref || "");
  }, [settings?.TogetherAiModelPref]);

  const defaultFirstModel =
    groupedModels[Object.keys(groupedModels).sort()[0]]?.[0]?.id || "";
  const currentModel =
    selectedModel || settings?.TogetherAiModelPref || defaultFirstModel;

  return (
    <div className="flex flex-col w-60">
      <Label className="block mb-3">Chat Model Selection</Label>
      <Select
        name="TogetherAiModelPref"
        required={true}
        value={currentModel}
        onValueChange={setSelectedModel}
      >
        <SelectTrigger className="w-full">
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

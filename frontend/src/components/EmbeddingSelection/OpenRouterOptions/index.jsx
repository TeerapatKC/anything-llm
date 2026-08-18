import { useState, useEffect } from "react";
import System from "@/models/system";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function OpenRouterOptions({ settings }) {
  return (
    <div className="w-full flex flex-col gap-y-4">
      <div className="w-full flex items-center gap-[36px] mt-1.5">
        <div className="flex flex-col w-60">
          <Label variant="settings" className="block mb-3">
            API Key
          </Label>
          <Input
            variant="settings"
            type="password"
            name="OpenRouterApiKey"
            placeholder="OpenRouter API Key"
            defaultValue={settings?.OpenRouterApiKey ? "*".repeat(20) : ""}
            required={true}
            autoComplete="new-password"
            spellCheck={false}
          />
        </div>
        <OpenRouterEmbeddingModelSelection settings={settings} />
      </div>
    </div>
  );
}

function OpenRouterEmbeddingModelSelection({ settings }) {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedModel, setSelectedModel] = useState(
    settings?.EmbeddingModelPref || ""
  );

  useEffect(() => {
    async function fetchModels() {
      setLoading(true);
      const response = await System.customModels("openrouter-embedder");
      const fetchedModels = response?.models || [];
      setModels(fetchedModels);

      if (
        settings?.EmbeddingModelPref &&
        fetchedModels.some((m) => m.id === settings.EmbeddingModelPref)
      ) {
        setSelectedModel(settings.EmbeddingModelPref);
      } else if (fetchedModels.length > 0) {
        setSelectedModel(fetchedModels[0].id);
      }

      setLoading(false);
    }
    fetchModels();
  }, [settings?.EmbeddingModelPref]);

  if (loading) {
    return (
      <div className="flex flex-col w-60">
        <Label variant="settings" className="block mb-3">
          Model Preference
        </Label>
        <Select name="EmbeddingModelPref" disabled={true}>
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
        Model Preference
      </Label>
      <Select
        name="EmbeddingModelPref"
        required={true}
        value={selectedModel}
        onValueChange={setSelectedModel}
      >
        <SelectTrigger variant="settings">
          <SelectValue placeholder="Select a model" />
        </SelectTrigger>
        <SelectContent>
          {models.map((model) => (
            <SelectItem key={model.id} value={model.id}>
              {model.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

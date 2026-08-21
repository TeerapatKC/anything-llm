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

export default function DeepSeekOptions({ settings }) {
  const [inputValue, setInputValue] = useState(settings?.DeepSeekApiKey);
  const [deepSeekApiKey, setDeepSeekApiKey] = useState(
    settings?.DeepSeekApiKey
  );

  return (
    <div className="flex gap-[36px] mt-1.5">
      <div className="flex flex-col w-60">
        <Label className="block mb-3">API Key</Label>
        <Input
          type="password"
          name="DeepSeekApiKey"
          placeholder="DeepSeek API Key"
          defaultValue={settings?.DeepSeekApiKey ? "*".repeat(20) : ""}
          required={true}
          autoComplete="new-password"
          spellCheck={false}
          onChange={(e) => setInputValue(e.target.value)}
          onBlur={() => setDeepSeekApiKey(inputValue)}
        />
      </div>
      {!settings?.credentialsOnly && (
        <DeepSeekModelSelection settings={settings} apiKey={deepSeekApiKey} />
      )}
    </div>
  );
}

function DeepSeekModelSelection({ apiKey, settings }) {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function findCustomModels() {
      if (!apiKey) {
        setModels([]);
        setLoading(true);
        return;
      }

      setLoading(true);
      const { models } = await System.customModels(
        "deepseek",
        typeof apiKey === "boolean" ? null : apiKey
      );
      setModels(models || []);
      setLoading(false);
    }
    findCustomModels();
  }, [apiKey]);

  if (loading) {
    return (
      <div className="flex flex-col w-60">
        <Label className="block mb-3">Chat Model Selection</Label>
        {/*
          Keyed apart from the loaded select below. Base UI's `useControlled`
          decides once, on an instance's first render, whether it is controlled -
          and this placeholder renders without a value. Without distinct keys React
          reuses the instance for both, so the saved model never shows.
        */}
        <Select
          key="model-select-loading"
          name="DeepSeekModelPref"
          disabled={true}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="-- loading available models --" />
          </SelectTrigger>
          <SelectContent />
        </Select>
      </div>
    );
  }

  const [selectedModel, setSelectedModel] = useState(
    settings?.DeepSeekModelPref || ""
  );

  useEffect(() => {
    setSelectedModel(settings?.DeepSeekModelPref || "");
  }, [settings?.DeepSeekModelPref]);

  const currentModel =
    selectedModel ||
    settings?.DeepSeekModelPref ||
    (models.length > 0 ? models[0]?.id : "");

  return (
    <div className="flex flex-col w-60">
      <Label className="block mb-3">Chat Model Selection</Label>
      <Select
        key="model-select-loaded"
        name="DeepSeekModelPref"
        required={true}
        value={currentModel}
        onValueChange={setSelectedModel}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select an option" />
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

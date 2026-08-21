import { useState, useEffect } from "react";
import System from "@/models/system";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

export default function AnthropicAiOptions({ settings }) {
  const [showAdvancedControls, setShowAdvancedControls] = useState(false);
  const [inputValue, setInputValue] = useState(settings?.AnthropicApiKey);
  const [anthropicApiKey, setAnthropicApiKey] = useState(
    settings?.AnthropicApiKey
  );

  return (
    <div className="w-full flex flex-col">
      <div className="w-full flex items-center gap-9 mt-1.5">
        <div className="flex flex-col w-60">
          <Label className="block mb-3">Anthropic API Key</Label>
          <Input
            type="password"
            name="AnthropicApiKey"
            placeholder="Anthropic API Key"
            defaultValue={settings?.AnthropicApiKey ? "*".repeat(20) : ""}
            required={true}
            autoComplete="new-password"
            spellCheck={false}
            onChange={(e) => setInputValue(e.target.value)}
            onBlur={() => setAnthropicApiKey(inputValue)}
          />
        </div>
        {!settings?.credentialsOnly && (
          <AnthropicModelSelection
            apiKey={anthropicApiKey}
            settings={settings}
          />
        )}
      </div>
      <div className="flex justify-start mt-4">
        <Button
          variant="link"
          size="sm"
          onClick={(e) => {
            e.preventDefault();
            setShowAdvancedControls(!showAdvancedControls);
          }}
        >
          {showAdvancedControls ? "Hide" : "Show"} advanced settings
          {showAdvancedControls ? (
            <ChevronUp size={14} className="ml-1" />
          ) : (
            <ChevronDown size={14} className="ml-1" />
          )}
        </Button>
      </div>
      <div hidden={!showAdvancedControls}>
        <div className="w-full flex items-start gap-4 mt-1.5">
          <div className="flex flex-col w-60">
            <div className="flex justify-between items-center mb-2">
              <Label>Prompt Caching</Label>
            </div>
            <Select
              name="AnthropicCacheControl"
              defaultValue={settings?.AnthropicCacheControl ?? "none"}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select an option" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No caching</SelectItem>
                <SelectItem value="5m">5 minutes</SelectItem>
                <SelectItem value="1h">1 hour</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
}

function AnthropicModelSelection({ apiKey, settings }) {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function findCustomModels() {
      setLoading(true);
      const { models } = await System.customModels(
        "anthropic",
        typeof apiKey === "boolean" ? null : apiKey
      );
      if (models.length > 0) setModels(models);
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
          name="AnthropicModelPref"
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
    settings?.AnthropicModelPref || ""
  );

  useEffect(() => {
    setSelectedModel(settings?.AnthropicModelPref || "");
  }, [settings?.AnthropicModelPref]);

  const currentModel =
    selectedModel ||
    settings?.AnthropicModelPref ||
    (models.length > 0 ? models[0]?.id : "");

  return (
    <div className="flex flex-col w-60">
      <Label className="block mb-3">Chat Model Selection</Label>
      <Select
        key="model-select-loaded"
        name="AnthropicModelPref"
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

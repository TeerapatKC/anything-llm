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

export default function GenericOpenAiOptions({ settings }) {
  const [genericOpenAiBasePath, setGenericOpenAiBasePath] = useState(
    settings?.GenericOpenAiBasePath || ""
  );
  // GenericOpenAiKey from server is boolean (whether key exists) - use null so server uses saved env key
  const [genericOpenAiApiKey, setGenericOpenAiApiKey] = useState(
    typeof settings?.GenericOpenAiKey === "boolean"
      ? null
      : settings?.GenericOpenAiKey || null
  );
  const [genericOpenAiModelPref, setGenericOpenAiModelPref] = useState(
    settings?.GenericOpenAiModelPref || ""
  );

  useEffect(() => {
    setGenericOpenAiBasePath(settings?.GenericOpenAiBasePath || "");
    setGenericOpenAiApiKey(
      typeof settings?.GenericOpenAiKey === "boolean"
        ? null
        : settings?.GenericOpenAiKey || null
    );
    setGenericOpenAiModelPref(settings?.GenericOpenAiModelPref || "");
  }, [settings]);

  return (
    <div className="flex flex-col gap-y-7">
      <div className="flex gap-[36px] mt-1.5 flex-wrap">
        <div className="flex flex-col w-60">
          <Label className="block mb-3">Base URL</Label>
          <Input
            type="url"
            name="GenericOpenAiBasePath"
            placeholder="eg: https://proxy.openai.com"
            value={genericOpenAiBasePath}
            onChange={(e) => setGenericOpenAiBasePath(e.target.value)}
            required={true}
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        <div className="flex flex-col w-60">
          <Label className="block mb-3">API Key</Label>
          <Input
            type="password"
            name="GenericOpenAiKey"
            placeholder="Generic service API Key"
            defaultValue={settings?.GenericOpenAiKey ? "*".repeat(20) : ""}
            onChange={(e) => setGenericOpenAiApiKey(e.target.value)}
            required={false}
            autoComplete="new-password"
            spellCheck={false}
          />
        </div>
        <GenericOpenAiModelSelection
          settings={settings}
          basePath={genericOpenAiBasePath}
          apiKey={genericOpenAiApiKey}
          genericOpenAiModelPref={genericOpenAiModelPref}
          setGenericOpenAiModelPref={setGenericOpenAiModelPref}
        />
      </div>
      <div className="flex gap-[36px] flex-wrap">
        <div className="flex flex-col w-60">
          <Label className="block mb-3">Model context window</Label>
          <Input
            type="number"
            name="GenericOpenAiTokenLimit"
            placeholder="Content window limit (eg: 4096)"
            min={1}
            onScroll={(e) => e.target.blur()}
            defaultValue={settings?.GenericOpenAiTokenLimit}
            required={true}
            autoComplete="off"
          />
        </div>
        <div className="flex flex-col w-60">
          <Label className="block mb-3">Max Tokens</Label>
          <Input
            type="number"
            name="GenericOpenAiMaxTokens"
            placeholder="Max tokens per request (eg: 1024)"
            min={1}
            defaultValue={settings?.GenericOpenAiMaxTokens || 1024}
            required={true}
            autoComplete="off"
          />
        </div>
      </div>
    </div>
  );
}

function GenericOpenAiModelSelection({
  settings,
  basePath = null,
  apiKey = null,
  genericOpenAiModelPref,
  setGenericOpenAiModelPref,
}) {
  const [customModels, setCustomModels] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function findCustomModels() {
      if (!basePath) {
        setCustomModels([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const { models } = await System.customModels(
          "generic-openai",
          apiKey,
          basePath
        );
        setCustomModels(models || []);
      } catch (error) {
        console.error("Failed to fetch custom models:", error);
        setCustomModels([]);
      }
      setLoading(false);
    }
    findCustomModels();
  }, [basePath, apiKey]);

  const selectedModel =
    genericOpenAiModelPref ||
    settings?.GenericOpenAiModelPref ||
    (customModels.length > 0 ? customModels[0]?.id : "");

  useEffect(() => {
    if (!genericOpenAiModelPref && selectedModel) {
      setGenericOpenAiModelPref(selectedModel);
    }
  }, [selectedModel, genericOpenAiModelPref, setGenericOpenAiModelPref]);

  if (loading) {
    return (
      <div className="flex flex-col w-60">
        <div className="flex items-center mb-2 gap-x-1">
          <Label>Selected Model</Label>
        </div>
        {/*
          Keyed apart from the loaded select below. Base UI's `useControlled` decides
          once, on an instance's first render, whether it is controlled - and this
          placeholder renders without a `value`. Without distinct keys React reuses the
          same instance for both, so the real `value` that arrives with the model list is
          ignored for the rest of the page's life and the trigger keeps showing its
          placeholder even though a model is saved.
        */}
        <Select
          key="generic-openai-model-loading"
          name="GenericOpenAiModelPref"
          disabled={true}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="--loading available models--" />
          </SelectTrigger>
          <SelectContent />
        </Select>
      </div>
    );
  }

  // Determine if saved model preference exists in the fetched model list
  const savedModelInList =
    customModels.length > 0 && customModels.some((m) => m.id === selectedModel);

  // If no models are found OR saved model is not in the list, show a free-text input
  if (customModels.length === 0 || !savedModelInList) {
    return (
      <div className="flex flex-col w-60">
        <Label className="block mb-2">Selected Model</Label>
        <Input
          type="text"
          name="GenericOpenAiModelPref"
          placeholder="Model id used for chat requests"
          value={selectedModel}
          onChange={(e) => setGenericOpenAiModelPref(e.target.value)}
          required={true}
          autoComplete="off"
          spellCheck={false}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col w-60">
      <Label className="block mb-2">Selected Model</Label>
      <Select
        key="generic-openai-model-loaded"
        name="GenericOpenAiModelPref"
        required={true}
        value={selectedModel}
        onValueChange={(val) => setGenericOpenAiModelPref(val)}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select an option" />
        </SelectTrigger>
        <SelectContent>
          {customModels.length > 0 && (
            <SelectGroup>
              <SelectLabel>Your loaded models</SelectLabel>
              {customModels.map((model) => {
                return (
                  <SelectItem key={model.id} value={model.id}>
                    {model.id}
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

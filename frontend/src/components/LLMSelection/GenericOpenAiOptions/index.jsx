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
    settings?.GenericOpenAiBasePath
  );
  const [genericOpenAiApiKey, setGenericOpenAiApiKey] = useState(
    settings?.GenericOpenAiApiKey
  );
  const [genericOpenAiModelPref, setGenericOpenAiModelPref] = useState(
    settings?.GenericOpenAiModelPref
  );

  return (
    <div className="flex flex-col gap-y-7">
      <div className="flex gap-[36px] mt-1.5 flex-wrap">
        <div className="flex flex-col w-60">
          <Label variant="settings" className="block mb-3">
            Base URL
          </Label>
          <Input
            variant="settings"
            type="url"
            name="GenericOpenAiBasePath"
            placeholder="eg: https://proxy.openai.com"
            defaultValue={settings?.GenericOpenAiBasePath}
            onChange={(e) => setGenericOpenAiBasePath(e.target.value)}
            required={true}
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        <div className="flex flex-col w-60">
          <Label variant="settings" className="block mb-3">
            API Key
          </Label>
          <Input
            variant="settings"
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
          <Label variant="settings" className="block mb-3">
            Model context window
          </Label>
          <Input
            variant="settings"
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
          <Label variant="settings" className="block mb-3">
            Max Tokens
          </Label>
          <Input
            variant="settings"
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

  if (loading) {
    return (
      <div className="flex flex-col w-60">
        <div className="flex items-center mb-2 gap-x-1">
          <Label variant="settings">Selected Model</Label>
        </div>
        <Select name="GenericOpenAiModelPref" disabled={true}>
          <SelectTrigger variant="settings">
            <SelectValue placeholder="--loading available models--" />
          </SelectTrigger>
          <SelectContent />
        </Select>
      </div>
    );
  }

  // If no models are found, just show a free-form input field for the model name
  if (customModels.length === 0) {
    return (
      <div className="flex flex-col w-60">
        <Label variant="settings" className="block mb-2">
          Selected Model
        </Label>
        <Input
          variant="settings"
          type="text"
          name="GenericOpenAiModelPref"
          placeholder="Model id used for chat requests"
          defaultValue={genericOpenAiModelPref}
          onChange={(e) => setGenericOpenAiModelPref(e.target.value)}
          onBlur={() => setGenericOpenAiModelPref(genericOpenAiModelPref)}
          required={true}
          autoComplete="off"
          spellCheck={false}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col w-60">
      <Label variant="settings" className="block mb-2">
        Selected Model
      </Label>
      <Select
        name="GenericOpenAiModelPref"
        required={true}
        defaultValue={settings.GenericOpenAiModelPref ?? customModels?.[0]?.id}
      >
        <SelectTrigger variant="settings">
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

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

export default function ZAiLLMOptions({ settings }) {
  const [inputValue, setInputValue] = useState(settings?.ZAiApiKey);
  const [apiKey, setApiKey] = useState(settings?.ZAiApiKey);

  return (
    <div className="flex gap-[36px] mt-1.5">
      <div className="flex flex-col w-60">
        <Label className="block mb-3">Z.AI API Key</Label>
        <Input
          type="password"
          name="ZAiApiKey"
          placeholder="Z.AI API Key"
          defaultValue={settings?.ZAiApiKey ? "*".repeat(20) : ""}
          required={true}
          autoComplete="new-password"
          spellCheck={false}
          onChange={(e) => setInputValue(e.target.value)}
          onBlur={() => setApiKey(inputValue)}
        />
      </div>

      {!settings?.credentialsOnly && (
        <ZAiModelSelection settings={settings} apiKey={apiKey} />
      )}
    </div>
  );
}

function ZAiModelSelection({ apiKey, settings }) {
  const [customModels, setCustomModels] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function findCustomModels() {
      if (!apiKey) {
        setCustomModels([]);
        setLoading(true);
        return;
      }

      try {
        setLoading(true);
        const { models } = await System.customModels("zai", apiKey);
        setCustomModels(models || []);
      } catch (error) {
        console.error("Failed to fetch custom models:", error);
        setCustomModels([]);
      } finally {
        setLoading(false);
      }
    }
    findCustomModels();
  }, [apiKey]);

  if (loading) {
    return (
      <div className="flex flex-col w-60">
        <Label className="block mb-3">Chat Model Selection</Label>
        <Select name="ZAiModelPref" disabled={true}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="--loading available models--" />
          </SelectTrigger>
          <SelectContent />
        </Select>
        <p className="text-xs leading-[18px] font-base text-theme-text-primary text-opacity-60 mt-2">
          Enter a valid API key to view all available models for your account.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-60">
      <Label className="block mb-3">Chat Model Selection</Label>
      <Select
        name="ZAiModelPref"
        required={true}
        defaultValue={settings?.ZAiModelPref ?? customModels?.[0]?.id}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select an option" />
        </SelectTrigger>
        <SelectContent>
          {customModels.length > 0 && (
            <SelectGroup>
              <SelectLabel>Available models</SelectLabel>
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
      <p className="text-xs leading-[18px] font-base text-theme-text-primary text-opacity-60 mt-2">
        Select the Z.AI model you want to use for your conversations.
      </p>
    </div>
  );
}

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

export default function GroqAiOptions({ settings }) {
  const [inputValue, setInputValue] = useState(settings?.GroqApiKey);
  const [apiKey, setApiKey] = useState(settings?.GroqApiKey);

  return (
    <div className="flex gap-[36px] mt-1.5">
      <div className="flex flex-col w-60">
        <Label variant="settings" className="block mb-3">
          Groq API Key
        </Label>
        <Input
          variant="settings"
          type="password"
          name="GroqApiKey"
          placeholder="Groq API Key"
          defaultValue={settings?.GroqApiKey ? "*".repeat(20) : ""}
          required={true}
          autoComplete="new-password"
          spellCheck={false}
          onChange={(e) => setInputValue(e.target.value)}
          onBlur={() => setApiKey(inputValue)}
        />
      </div>

      {!settings?.credentialsOnly && (
        <GroqAIModelSelection settings={settings} apiKey={apiKey} />
      )}
    </div>
  );
}

function GroqAIModelSelection({ apiKey, settings }) {
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
        const { models } = await System.customModels("groq", apiKey);
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
        <Label variant="settings" className="block mb-3">
          Chat Model Selection
        </Label>
        <Select name="GroqModelPref" disabled={true}>
          <SelectTrigger variant="settings">
            <SelectValue placeholder="--loading available models--" />
          </SelectTrigger>
          <SelectContent />
        </Select>
        <p className="text-xs leading-[18px] font-base text-white text-opacity-60 mt-2">
          Enter a valid API key to view all available models for your account.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-60">
      <Label variant="settings" className="block mb-3">
        Chat Model Selection
      </Label>
      <Select
        name="GroqModelPref"
        required={true}
        defaultValue={settings?.GroqModelPref ?? customModels?.[0]?.id}
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
                    {model.id}
                  </SelectItem>
                );
              })}
            </SelectGroup>
          )}
        </SelectContent>
      </Select>
      <p className="text-xs leading-[18px] font-base text-white text-opacity-60 mt-2">
        Select the GroqAI model you want to use for your conversations.
      </p>
    </div>
  );
}

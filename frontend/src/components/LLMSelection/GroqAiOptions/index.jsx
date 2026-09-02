import { useTranslation } from "react-i18next";
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
        <Label className="block mb-3">Groq API Key</Label>
        <Input
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
  const { t } = useTranslation();
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
        <Label className="block mb-3">
          {t("provider-options.chat-model-selection")}
        </Label>
        {/*
          Keyed apart from the loaded select below. Base UI's `useControlled`
          decides once, on an instance's first render, whether it is controlled -
          and this placeholder renders without a value. Without distinct keys React
          reuses the instance for both, so the saved model never shows.
        */}
        <Select key="model-select-loading" name="GroqModelPref" disabled={true}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder={t("provider-options.loading-models")} />
          </SelectTrigger>
          <SelectContent />
        </Select>
        <p className="text-xs/60 leading-[18px] font-base text-theme-text-primary mt-2">
          Enter a valid API key to view all available models for your account.
        </p>
      </div>
    );
  }

  const [selectedModel, setSelectedModel] = useState(
    settings?.GroqModelPref || ""
  );

  useEffect(() => {
    setSelectedModel(settings?.GroqModelPref || "");
  }, [settings?.GroqModelPref]);

  const currentModel =
    selectedModel ||
    settings?.GroqModelPref ||
    (customModels.length > 0 ? customModels[0]?.id : "");

  return (
    <div className="flex flex-col w-60">
      <Label className="block mb-3">
        {t("provider-options.chat-model-selection")}
      </Label>
      <Select
        key="model-select-loaded"
        name="GroqModelPref"
        required={true}
        value={currentModel}
        onValueChange={setSelectedModel}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder={t("provider-options.select-option")} />
        </SelectTrigger>
        <SelectContent>
          {customModels.length > 0 && (
            <SelectGroup>
              <SelectLabel>
                {t("provider-options.available-models")}
              </SelectLabel>
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
      <p className="text-xs/60 leading-[18px] font-base text-theme-text-primary mt-2">
        Select the GroqAI model you want to use for your conversations.
      </p>
    </div>
  );
}

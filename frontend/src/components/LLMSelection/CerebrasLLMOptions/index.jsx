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

export default function CerebrasLLMOptions({ settings }) {
  const [inputValue, setInputValue] = useState(settings?.CerebrasApiKey);
  const [apiKey, setApiKey] = useState(settings?.CerebrasApiKey);

  return (
    <div className="flex gap-[36px] mt-1.5">
      <div className="flex flex-col w-60">
        <Label className="block mb-3">Cerebras API Key</Label>
        <Input
          type="password"
          name="CerebrasApiKey"
          placeholder="Cerebras API Key"
          defaultValue={settings?.CerebrasApiKey ? "*".repeat(20) : ""}
          required={true}
          autoComplete="off"
          spellCheck={false}
          onChange={(e) => setInputValue(e.target.value)}
          onBlur={() => setApiKey(inputValue)}
        />
      </div>

      {!settings?.credentialsOnly && (
        <CerebrasModelSelection settings={settings} apiKey={apiKey} />
      )}
    </div>
  );
}

/**
 * Cerebras model selection component
 * @param {Object} props - The component props
 * @param {string} props.apiKey - The Cerebras API key (not used since we only need public models for now)
 * @param {Object} props.settings - The system settings
 * @returns {JSX.Element} The Cerebras model selection component
 */
function CerebrasModelSelection({ apiKey: _apiKey, settings }) {
  const { t } = useTranslation();
  const [customModels, setCustomModels] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function findCustomModels() {
      try {
        setLoading(true);
        const { models } = await System.customModels("cerebras");
        setCustomModels(models || []);
      } catch (error) {
        console.error("Failed to fetch custom models:", error);
        setCustomModels([]);
      } finally {
        setLoading(false);
      }
    }
    findCustomModels();
  }, []);

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
        <Select
          key="model-select-loading"
          name="CerebrasModelPref"
          disabled={true}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder={t("provider-options.loading-models")} />
          </SelectTrigger>
          <SelectContent />
        </Select>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-60">
      <Label className="block mb-3">
        {t("provider-options.chat-model-selection")}
      </Label>
      <Select
        key="model-select-loaded"
        name="CerebrasModelPref"
        required={true}
        defaultValue={settings?.CerebrasModelPref ?? customModels?.[0]?.id}
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
                    {model.name}
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

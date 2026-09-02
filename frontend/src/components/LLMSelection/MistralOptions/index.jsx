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

export default function MistralOptions({ settings }) {
  const [inputValue, setInputValue] = useState(settings?.MistralApiKey);
  const [mistralKey, setMistralKey] = useState(settings?.MistralApiKey);

  return (
    <div className="flex gap-[36px] mt-1.5">
      <div className="flex flex-col w-60">
        <Label className="block mb-3">Mistral API Key</Label>
        <Input
          type="password"
          name="MistralApiKey"
          placeholder="Mistral API Key"
          defaultValue={settings?.MistralApiKey ? "*".repeat(20) : ""}
          required={true}
          autoComplete="new-password"
          spellCheck={false}
          onChange={(e) => setInputValue(e.target.value)}
          onBlur={() => setMistralKey(inputValue)}
        />
      </div>
      {!settings?.credentialsOnly && (
        <MistralModelSelection settings={settings} apiKey={mistralKey} />
      )}
    </div>
  );
}

function MistralModelSelection({ apiKey, settings }) {
  const { t } = useTranslation();
  const [customModels, setCustomModels] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function findCustomModels() {
      if (!apiKey) {
        setCustomModels([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      const { models } = await System.customModels(
        "mistral",
        typeof apiKey === "boolean" ? null : apiKey
      );
      setCustomModels(models || []);
      setLoading(false);
    }
    findCustomModels();
  }, [apiKey]);

  if (loading || customModels.length == 0) {
    return (
      <div className="flex flex-col w-60">
        <Label className="block mb-3">
          {t("provider-options.chat-model-selection")}
        </Label>
        <Select name="MistralModelPref" disabled={true}>
          <SelectTrigger className="w-full">
            <SelectValue
              placeholder={
                !!apiKey
                  ? "-- loading available models --"
                  : "-- waiting for API key --"
              }
            />
          </SelectTrigger>
          <SelectContent />
        </Select>
      </div>
    );
  }

  const [selectedModel, setSelectedModel] = useState(
    settings?.MistralModelPref || ""
  );

  useEffect(() => {
    setSelectedModel(settings?.MistralModelPref || "");
  }, [settings?.MistralModelPref]);

  const currentModel =
    selectedModel ||
    settings?.MistralModelPref ||
    (customModels.length > 0 ? customModels[0]?.id : "");

  return (
    <div className="flex flex-col w-60">
      <Label className="block mb-3">
        {t("provider-options.chat-model-selection")}
      </Label>
      <Select
        name="MistralModelPref"
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
              <SelectLabel>Available Mistral Models</SelectLabel>
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

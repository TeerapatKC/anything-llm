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
        <Label variant="settings" className="block mb-3">
          Mistral API Key
        </Label>
        <Input
          variant="settings"
          type="password"
          name="MistralApiKey"
          placeholder="Mistral API Key"
          defaultValue={settings?.MistralApiKey ? "*".repeat(20) : ""}
          required={true}
          autoComplete="off"
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
        <Label variant="settings" className="block mb-3">
          Chat Model Selection
        </Label>
        <Select name="MistralModelPref" disabled={true}>
          <SelectTrigger variant="settings">
            <SelectValue
              placeholder={
                !!apiKey
                  ? "-- loading available models --"
                  : "-- waiting for API key --"
              }
            />
          </SelectTrigger>
          <SelectContent>null</SelectContent>
        </Select>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-60">
      <Label variant="settings" className="block mb-3">
        Chat Model Selection
      </Label>
      <Select
        name="MistralModelPref"
        required={true}
        defaultValue={settings?.MistralModelPref ?? customModels?.[0]?.id}
      >
        <SelectTrigger variant="settings">
          <SelectValue placeholder="Select an option" />
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

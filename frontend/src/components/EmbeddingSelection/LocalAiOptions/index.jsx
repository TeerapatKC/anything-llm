import React, { useEffect, useState } from "react";
import { CaretDown, CaretUp, Info } from "@phosphor-icons/react";
import System from "@/models/system";
import PreLoader from "@/components/Preloader";
import { LOCALAI_COMMON_URLS } from "@/utils/constants";
import useProviderEndpointAutoDiscovery from "@/hooks/useProviderEndpointAutoDiscovery";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
import { Button } from "@/components/ui/button";

export default function LocalAiOptions({ settings }) {
  const {
    autoDetecting: loading,
    basePath,
    basePathValue,
    showAdvancedControls,
    setShowAdvancedControls,
    handleAutoDetectClick,
  } = useProviderEndpointAutoDiscovery({
    provider: "localai",
    initialBasePath: settings?.EmbeddingBasePath,
    ENDPOINTS: LOCALAI_COMMON_URLS,
  });
  const [apiKeyValue, setApiKeyValue] = useState(settings?.LocalAiApiKey);
  const [apiKey, setApiKey] = useState(settings?.LocalAiApiKey);

  return (
    <div className="w-full flex flex-col gap-y-7">
      <div className="w-full flex items-center gap-[36px] mt-1.5">
        <LocalAIModelSelection
          settings={settings}
          apiKey={apiKey}
          basePath={basePath.value}
        />
        <div className="flex flex-col w-60">
          <div className="flex flex-col gap-y-1 mb-2">
            <div className="flex gap-x-1 items-center">
              <Label variant="settings" className="block">
                Local AI API Key
              </Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info
                    size={16}
                    className="text-theme-text-secondary cursor-pointer"
                  />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[250px] text-xs">
                  The API key for the LocalAI server (if applicable).
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
          <Input
            variant="settings"
            type="password"
            name="LocalAiApiKey"
            placeholder="sk-mysecretkey"
            defaultValue={settings?.LocalAiApiKey ? "*".repeat(20) : ""}
            autoComplete="off"
            spellCheck={false}
            onChange={(e) => setApiKeyValue(e.target.value)}
            onBlur={() => setApiKey(apiKeyValue)}
          />
        </div>
      </div>
      <div className="w-full flex items-center gap-[36px] mt-1.5">
        <div className="flex flex-col w-60">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex gap-x-1 items-center mb-3">
                <Label variant="settings" className="block">
                  Max embedding chunk length
                </Label>
                <Info
                  size={16}
                  className="text-theme-text-secondary cursor-pointer"
                />
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[250px] text-xs">
              Maximum length of text chunks, in characters, for embedding.
            </TooltipContent>
          </Tooltip>
          <Input
            variant="settings"
            type="number"
            name="EmbeddingModelMaxChunkLength"
            placeholder="1000"
            min={1}
            onScroll={(e) => e.target.blur()}
            defaultValue={settings?.EmbeddingModelMaxChunkLength}
            required={false}
            autoComplete="off"
          />
        </div>

        <div className="flex flex-col w-60">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex gap-x-1 items-center mb-3">
                <Label variant="settings" className="block">
                  Output dimensions
                </Label>
                <Info
                  size={16}
                  className="text-theme-text-secondary cursor-pointer"
                />
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[250px] text-xs">
              The number of dimensions the resulting output embeddings should
              have if it supports multiple dimensions output.
              <br />
              <br /> Leave blank to use the default dimensions for the selected
              model.
            </TooltipContent>
          </Tooltip>
          <Input
            variant="settings"
            type="number"
            name="EmbeddingOutputDimensions"
            placeholder="Assume default dimensions"
            min={1}
            onScroll={(e) => e.target.blur()}
            defaultValue={settings?.EmbeddingOutputDimensions}
            required={false}
            autoComplete="off"
          />
        </div>
      </div>
      <div className="flex justify-start mt-4">
        <Button
          variant="inline"
          onClick={(e) => {
            e.preventDefault();
            setShowAdvancedControls(!showAdvancedControls);
          }}
        >
          {showAdvancedControls ? "Hide" : "Show"} advanced settings
          {showAdvancedControls ? (
            <CaretUp size={14} className="ml-1" />
          ) : (
            <CaretDown size={14} className="ml-1" />
          )}
        </Button>
      </div>
      <div hidden={!showAdvancedControls}>
        <div className="w-full flex items-center gap-4">
          <div className="flex flex-col w-60">
            <div className="flex justify-between items-center mb-2">
              <Label variant="settings">LocalAI Base URL</Label>
              {loading ? (
                <PreLoader size="6" />
              ) : (
                <>
                  {!basePathValue.value && (
                    <Button variant="chip" onClick={handleAutoDetectClick}>
                      Auto-Detect
                    </Button>
                  )}
                </>
              )}
            </div>
            <Input
              variant="settings"
              type="url"
              name="EmbeddingBasePath"
              placeholder="http://localhost:8080/v1"
              value={basePathValue.value}
              required={true}
              autoComplete="off"
              spellCheck={false}
              onChange={basePath.onChange}
              onBlur={basePath.onBlur}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function LocalAIModelSelection({ settings, apiKey = null, basePath = null }) {
  const [customModels, setCustomModels] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function findCustomModels() {
      if (!basePath || !basePath.includes("/v1")) {
        setCustomModels([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      const { models } = await System.customModels(
        "localai",
        typeof apiKey === "boolean" ? null : apiKey,
        basePath
      );
      setCustomModels(models || []);
      setLoading(false);
    }
    findCustomModels();
  }, [basePath, apiKey]);

  if (loading || customModels.length == 0) {
    return (
      <div className="flex flex-col w-60">
        <Label variant="settings" className="block mb-2">
          Embedding Model Name
        </Label>
        <Select name="EmbeddingModelPref" disabled={true}>
          <SelectTrigger variant="settings">
            <SelectValue
              placeholder={
                basePath?.includes("/v1")
                  ? "-- loading available models --"
                  : "-- waiting for URL --"
              }
            />
          </SelectTrigger>
          <SelectContent />
        </Select>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-60">
      <Label variant="settings" className="block mb-2">
        Embedding Model Name
      </Label>
      <Select
        name="EmbeddingModelPref"
        required={true}
        defaultValue={settings?.EmbeddingModelPref ?? customModels?.[0]?.id}
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

import React, { useEffect, useState } from "react";
import { Spinner } from "@/components/ui/spinner";
import System from "@/models/system";
import { LEMONADE_COMMON_URLS } from "@/utils/constants";
import { ChevronDown, ChevronUp, Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import useProviderEndpointAutoDiscovery from "@/hooks/useProviderEndpointAutoDiscovery";
import { originOnly } from "@/utils/url";
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

export default function LemonadeEmbeddingOptions({ settings }) {
  const {
    autoDetecting: loading,
    basePath,
    basePathValue,
    showAdvancedControls,
    setShowAdvancedControls,
    handleAutoDetectClick,
  } = useProviderEndpointAutoDiscovery({
    provider: "lemonade",
    initialBasePath: settings?.EmbeddingBasePath,
    ENDPOINTS: LEMONADE_COMMON_URLS,
    normalizeBasePath: originOnly,
  });

  const [maxChunkLength, setMaxChunkLength] = useState(
    settings?.EmbeddingModelMaxChunkLength || 8192
  );

  const handleMaxChunkLengthChange = (e) => {
    setMaxChunkLength(Number(e.target.value));
  };

  return (
    <div className="w-full flex flex-col gap-y-7">
      <div className="w-full flex items-start gap-[36px] mt-1.5">
        <LemonadeModelSelection settings={settings} basePath={basePath.value} />
        <div className="flex flex-col w-60">
          <Tooltip>
            <TooltipTrigger
              render={<div className="flex gap-x-1 items-center mb-3" />}
            >
              <Label className="block">Max embedding chunk length</Label>
              <Info
                size={16}
                className="text-theme-text-secondary cursor-pointer"
              />
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[250px] text-xs">
              Maximum length of text chunks, in characters, for embedding.
            </TooltipContent>
          </Tooltip>
          <Input
            type="number"
            name="EmbeddingModelMaxChunkLength"
            placeholder="8192"
            min={1}
            value={maxChunkLength}
            onChange={handleMaxChunkLengthChange}
            onScroll={(e) => e.target.blur()}
            required={true}
            autoComplete="off"
          />
        </div>
        <div className="flex flex-col w-60">
          <Tooltip>
            <TooltipTrigger
              render={<div className="flex gap-x-1 items-center mb-3" />}
            >
              <Label className="block">API Key (optional)</Label>
              <Info
                size={16}
                className="text-theme-text-secondary cursor-pointer"
              />
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[250px] text-xs">
              The API key for your Lemonade instance
            </TooltipContent>
          </Tooltip>
          <Input
            type="password"
            name="LemonadeLLMApiKey"
            defaultValue={settings?.LemonadeLLMApiKey ? "*".repeat(20) : ""}
            autoComplete="new-password"
          />
        </div>
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
          {showAdvancedControls ? "Hide" : "Show"} Manual Endpoint Input
          {showAdvancedControls ? (
            <ChevronUp size={14} className="ml-1" />
          ) : (
            <ChevronDown size={14} className="ml-1" />
          )}
        </Button>
      </div>

      <div hidden={!showAdvancedControls}>
        <div className="w-full flex items-start gap-4">
          <div className="flex flex-col w-[300px]">
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-1">
                <Label>Lemonade Base URL</Label>
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Info
                        size={18}
                        className="text-theme-text-secondary cursor-pointer"
                      />
                    }
                  ></TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[250px] text-xs">
                    Enter the URL where Lemonade is running.
                  </TooltipContent>
                </Tooltip>
              </div>
              {loading ? (
                <Spinner className="text-theme-text-secondary" />
              ) : (
                <>
                  {!basePathValue.value && (
                    <Button
                      variant="secondary"
                      size="xs"
                      onClick={handleAutoDetectClick}
                    >
                      Auto-Detect
                    </Button>
                  )}
                </>
              )}
            </div>
            <Input
              type="url"
              name="EmbeddingBasePath"
              placeholder="http://localhost:8000/live"
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

function LemonadeModelSelection({ settings, basePath = null }) {
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
          "lemonade-embedder",
          null,
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
  }, [basePath]);

  const downloadedModels = customModels.filter((model) => model?.downloaded);

  if (loading || customModels.length == 0) {
    return (
      <div className="flex flex-col w-60">
        <Label className="block mb-2">Lemonade Embedding Model</Label>
        <Select name="EmbeddingModelPref" disabled={true}>
          <SelectTrigger className="w-full">
            <SelectValue
              placeholder={
                !!basePath
                  ? "--loading available models--"
                  : "Enter Lemonade URL first"
              }
            />
          </SelectTrigger>
          <SelectContent />
        </Select>
        <p className="text-xs/60 leading-[18px] font-base text-theme-text-primary mt-2">
          Select the Lemonade model for embeddings. Models will load after
          entering a valid Lemonade URL.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-60">
      <Label className="block mb-3">Lemonade Embedding Model</Label>
      <Select
        name="EmbeddingModelPref"
        required={true}
        // A native select falls back to its first option; the two groups render
        // in this order, so the first downloaded model wins when there is one.
        defaultValue={
          settings.EmbeddingModelPref ??
          (downloadedModels[0]?.id || customModels[0]?.id)
        }
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select a model" />
        </SelectTrigger>
        <SelectContent>
          {downloadedModels.length > 0 && (
            <SelectGroup>
              <SelectLabel>Downloaded models</SelectLabel>
              {downloadedModels.map((model) => (
                <SelectItem key={model.id} value={model.id}>
                  {model.id}
                </SelectItem>
              ))}
            </SelectGroup>
          )}
          {customModels.length > 0 && (
            <SelectGroup>
              <SelectLabel>Discovered models</SelectLabel>
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

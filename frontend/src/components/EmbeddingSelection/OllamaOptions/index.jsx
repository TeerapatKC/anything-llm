import React, { useEffect, useState } from "react";
import System from "@/models/system";
import PreLoader from "@/components/Preloader";
import { OLLAMA_COMMON_URLS } from "@/utils/constants";
import { ChevronDown, ChevronUp, Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import useProviderEndpointAutoDiscovery from "@/hooks/useProviderEndpointAutoDiscovery";
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

export default function OllamaEmbeddingOptions({ settings }) {
  const {
    autoDetecting: loading,
    basePath,
    basePathValue,
    showAdvancedControls,
    setShowAdvancedControls,
    handleAutoDetectClick,
    authToken,
    authTokenValue,
  } = useProviderEndpointAutoDiscovery({
    provider: "ollama",
    initialBasePath: settings?.EmbeddingBasePath,
    ENDPOINTS: OLLAMA_COMMON_URLS,
  });

  const [maxChunkLength, setMaxChunkLength] = useState(
    settings?.EmbeddingModelMaxChunkLength || 8192
  );
  const [batchSize, setBatchSize] = useState(
    settings?.OllamaEmbeddingBatchSize || 1
  );

  const handleMaxChunkLengthChange = (e) => {
    setMaxChunkLength(Number(e.target.value));
  };

  const handleBatchSizeChange = (e) => {
    setBatchSize(Number(e.target.value));
  };

  return (
    <div className="w-full flex flex-col gap-y-7">
      <div className="w-full flex items-start gap-[36px] mt-1.5">
        <OllamaEmbeddingModelSelection
          settings={settings}
          basePath={basePath.value}
        />
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
          {showAdvancedControls ? "Hide" : "Show"} advanced settings
          {showAdvancedControls ? (
            <ChevronUp size={14} className="ml-1" />
          ) : (
            <ChevronDown size={14} className="ml-1" />
          )}
        </Button>
      </div>

      <div hidden={!showAdvancedControls}>
        <div className="w-full flex items-start gap-4">
          <div className="flex flex-col w-60">
            <div className="flex justify-between items-center mb-2">
              <Label>Ollama Base URL</Label>
              {loading ? (
                <PreLoader size="6" />
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
              placeholder="http://127.0.0.1:11434"
              value={basePathValue.value}
              required={true}
              autoComplete="off"
              spellCheck={false}
              onChange={basePath.onChange}
              onBlur={basePath.onBlur}
            />
            <p className="text-xs/60 leading-[18px] font-base text-theme-text-primary mt-2">
              Enter the URL where Ollama is running.
            </p>
          </div>
          <div className="flex flex-col w-60">
            <Tooltip>
              <TooltipTrigger
                render={<div className="flex gap-x-1 items-center mb-3" />}
              >
                <Label className="block">Embedding batch size</Label>
                <Info
                  size={16}
                  className="text-theme-text-secondary cursor-pointer"
                />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[250px] text-xs">
                Number of text chunks to embed in parallel. Higher values
                improve speed but use more memory. Default is 1.
              </TooltipContent>
            </Tooltip>
            <Input
              type="number"
              name="OllamaEmbeddingBatchSize"
              placeholder="1"
              min={1}
              value={batchSize}
              onChange={handleBatchSizeChange}
              onScroll={(e) => e.target.blur()}
              required={true}
              autoComplete="off"
            />
            <p className="text-xs/60 leading-[18px] font-base text-theme-text-primary mt-2">
              Increase this value to process multiple chunks simultaneously for
              faster embedding.
            </p>
          </div>
          <div>
            <Label className="block mb-3">Auth Token (optional)</Label>
            <Input
              type="password"
              name="OllamaLLMAuthToken"
              placeholder="Enter your Auth Token"
              defaultValue={settings?.OllamaLLMAuthToken ? "*".repeat(20) : ""}
              value={authTokenValue.value}
              onChange={authToken.onChange}
              onBlur={authToken.onBlur}
              required={false}
              autoComplete="off"
              spellCheck={false}
            />
            <p className="text-xs/60 leading-[18px] font-base text-theme-text-primary mt-2">
              Enter a <code>Bearer</code> Auth Token for interacting with your
              Ollama server.
              <br />
              Used <b>only</b> if running Ollama behind an authentication
              server.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function OllamaEmbeddingModelSelection({ settings, basePath = null }) {
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
        const { models } = await System.customModels("ollama", null, basePath);
        setCustomModels(models || []);
      } catch (error) {
        console.error("Failed to fetch custom models:", error);
        setCustomModels([]);
      }
      setLoading(false);
    }
    findCustomModels();
  }, [basePath]);

  if (loading || customModels.length == 0) {
    return (
      <div className="flex flex-col w-60">
        <Label className="block mb-2">Ollama Embedding Model</Label>
        <Select name="EmbeddingModelPref" disabled={true}>
          <SelectTrigger className="w-full">
            <SelectValue
              placeholder={
                !!basePath
                  ? "--loading available models--"
                  : "Enter Ollama URL first"
              }
            />
          </SelectTrigger>
          <SelectContent />
        </Select>
        <p className="text-xs/60 leading-[18px] font-base text-theme-text-primary mt-2">
          Select the Ollama model for embeddings. Models will load after
          entering a valid Ollama URL.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-60">
      <Label className="block mb-2">Ollama Embedding Model</Label>
      <Select
        name="EmbeddingModelPref"
        required={true}
        defaultValue={settings.EmbeddingModelPref ?? customModels?.[0]?.id}
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
      <p className="text-xs/60 leading-[18px] font-base text-theme-text-primary mt-2">
        Choose the Ollama model you want to use for generating embeddings.
      </p>
    </div>
  );
}

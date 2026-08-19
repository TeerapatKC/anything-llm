import React, { useEffect, useState } from "react";
import { Spinner } from "@/components/ui/spinner";
import System from "@/models/system";
import { LMSTUDIO_COMMON_URLS } from "@/utils/constants";
import { ChevronDown, ChevronUp, Info, TriangleAlert } from "lucide-react";
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

export default function LMStudioEmbeddingOptions({ settings }) {
  const {
    autoDetecting: loading,
    basePath,
    basePathValue,
    authToken,
    authTokenValue,
    showAdvancedControls,
    setShowAdvancedControls,
    handleAutoDetectClick,
  } = useProviderEndpointAutoDiscovery({
    provider: "lmstudio",
    initialBasePath: settings?.EmbeddingBasePath,
    ENDPOINTS: LMSTUDIO_COMMON_URLS,
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
        <LMStudioModelSelection
          settings={settings}
          basePath={basePath.value}
          apiKey={authTokenValue.value}
        />
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
          variant="inline"
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
                <Label variant="settings">LM Studio Base URL</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info
                      size={18}
                      className="text-theme-text-secondary cursor-pointer"
                    />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[250px] text-xs">
                    Enter the URL where LM Studio is running.
                  </TooltipContent>
                </Tooltip>
              </div>
              {loading ? (
                <Spinner className="text-theme-text-secondary" />
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
              placeholder="http://localhost:1234/v1"
              value={basePathValue.value}
              required={true}
              autoComplete="off"
              spellCheck={false}
              onChange={basePath.onChange}
              onBlur={basePath.onBlur}
            />
          </div>
          <div className="flex flex-col w-60">
            <div className="flex items-center mb-2 gap-x-1">
              <Label variant="settings">Authentication Token</Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info
                    size={18}
                    className="text-theme-text-secondary cursor-pointer"
                  />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[250px] text-xs">
                  <p className="text-xs leading-[18px] font-base">
                    Enter a <code>Bearer</code> Auth Token for interacting with
                    your LM Studio server.
                    <br /> <br />
                    Useful if running LM Studio behind an authentication or
                    proxy.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
            <Input
              variant="settings"
              type="password"
              name="LMStudioAuthToken"
              placeholder="LM Studio Auth Token"
              defaultValue={settings?.LMStudioAuthToken ? "*".repeat(20) : ""}
              value={authTokenValue.value}
              onChange={authToken.onChange}
              onBlur={authToken.onBlur}
              required={false}
              autoComplete="off"
              spellCheck={false}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function LMStudioModelSelection({ settings, basePath = null, apiKey = null }) {
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
          "lmstudio",
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

  if (loading || customModels.length == 0) {
    return (
      <div className="flex flex-col w-60">
        <div className="flex items-center mb-2 gap-x-1">
          <Label variant="settings">Embedding Model</Label>
          {!loading && !!basePath && (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <TriangleAlert
                    size={18}
                    className="text-red-400 cursor-pointer"
                  />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[250px] text-xs">
                  <p className="text-xs leading-[18px] font-base">
                    Could not reach LM Studio. Verify the URL is correct and the
                    LMStudio server is running and accessible.
                  </p>
                </TooltipContent>
              </Tooltip>
            </>
          )}
        </div>
        <Select name="EmbeddingModelPref" disabled={true}>
          <SelectTrigger variant="settings">
            <SelectValue
              placeholder={
                loading
                  ? "--loading available models--"
                  : !!basePath
                    ? "No models found"
                    : "Enter LM Studio URL first"
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
        LM Studio Embedding Model
      </Label>
      <Select
        name="EmbeddingModelPref"
        required={true}
        defaultValue={settings.EmbeddingModelPref ?? customModels?.[0]?.id}
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
      <p className="text-xs leading-[18px] font-base text-theme-text-primary text-opacity-60 mt-2">
        Choose the LM Studio model you want to use for generating embeddings.
      </p>
    </div>
  );
}

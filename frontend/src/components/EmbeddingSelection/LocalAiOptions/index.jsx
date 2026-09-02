import { useTranslation } from "react-i18next";
import React, { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Info } from "lucide-react";
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
  const { t } = useTranslation();
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
              <Label className="block">Local AI API Key</Label>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Info
                      size={16}
                      className="text-theme-text-secondary cursor-pointer"
                    />
                  }
                ></TooltipTrigger>
                <TooltipContent side="top" className="max-w-[250px] text-xs">
                  The API key for the LocalAI server (if applicable).
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
          <Input
            type="password"
            name="LocalAiApiKey"
            placeholder="sk-mysecretkey"
            defaultValue={settings?.LocalAiApiKey ? "*".repeat(20) : ""}
            autoComplete="new-password"
            spellCheck={false}
            onChange={(e) => setApiKeyValue(e.target.value)}
            onBlur={() => setApiKey(apiKeyValue)}
          />
        </div>
      </div>
      <div className="w-full flex items-center gap-[36px] mt-1.5">
        <div className="flex flex-col w-60">
          <Tooltip>
            <TooltipTrigger
              render={<div className="flex gap-x-1 items-center mb-3" />}
            >
              <Label className="block">
                {t("provider-options.max-embedding-chunk")}
              </Label>
              <Info
                size={16}
                className="text-theme-text-secondary cursor-pointer"
              />
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[250px] text-xs">
              {t("provider-options.max-embedding-chunk-help")}
            </TooltipContent>
          </Tooltip>
          <Input
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
            <TooltipTrigger
              render={<div className="flex gap-x-1 items-center mb-3" />}
            >
              <Label className="block">
                {t("provider-options.output-dimensions")}
              </Label>
              <Info
                size={16}
                className="text-theme-text-secondary cursor-pointer"
              />
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[250px] text-xs">
              {t("help.local-ai-options")}
              <br />
              <br /> Leave blank to use the default dimensions for the selected
              model.
            </TooltipContent>
          </Tooltip>
          <Input
            type="number"
            name="EmbeddingOutputDimensions"
            placeholder={t("provider-options.assume-default-dimensions")}
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
        <div className="w-full flex items-center gap-4">
          <div className="flex flex-col w-60">
            <div className="flex justify-between items-center mb-2">
              <Label>LocalAI Base URL</Label>
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
  const { t } = useTranslation();
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
        <Label className="block mb-2">
          {t("provider-options.embedding-model-name")}
        </Label>
        <Select name="EmbeddingModelPref" disabled={true}>
          <SelectTrigger className="w-full">
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
      <Label className="block mb-2">
        {t("provider-options.embedding-model-name")}
      </Label>
      <Select
        name="EmbeddingModelPref"
        required={true}
        defaultValue={settings?.EmbeddingModelPref ?? customModels?.[0]?.id}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder={t("provider-options.select-option")} />
        </SelectTrigger>
        <SelectContent>
          {customModels.length > 0 && (
            <SelectGroup>
              <SelectLabel>
                {t("provider-options.your-loaded-models")}
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
    </div>
  );
}

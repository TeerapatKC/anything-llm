import { useTranslation } from "react-i18next";
import React, { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Info } from "lucide-react";
import paths from "@/utils/paths";
import System from "@/models/system";
import PreLoader from "@/components/Preloader";
import { LOCALAI_COMMON_URLS } from "@/utils/constants";
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function LocalAiOptions({ settings, showAlert = false }) {
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
    initialBasePath: settings?.LocalAiBasePath,
    ENDPOINTS: LOCALAI_COMMON_URLS,
  });
  const [apiKeyValue, setApiKeyValue] = useState(settings?.LocalAiApiKey);
  const [apiKey, setApiKey] = useState(settings?.LocalAiApiKey);
  const [maxTokens, setMaxTokens] = useState(settings?.LocalAiTokenLimit || "");

  return (
    <div className="w-full flex flex-col gap-y-7">
      {showAlert && (
        <div className="flex flex-col md:flex-row md:items-center gap-x-2 text-theme-text-primary mb-6 bg-blue-800/30 w-fit rounded-lg px-4 py-2">
          <div className="gap-x-2 flex items-center">
            <Info size={12} className="hidden md:visible" />
            <p className="text-sm md:text-base">
              {t("help.local-ai-options-2")}
            </p>
          </div>
          <a
            href={paths.settings.embedder.modelPreference()}
            className="text-sm md:text-base my-2 underline"
          >
            Manage embedding &rarr;
          </a>
        </div>
      )}
      <div className="w-full flex items-center gap-[36px] mt-1.5">
        {!settings?.credentialsOnly && (
          <LocalAIModelSelection
            settings={settings}
            basePath={basePath.value}
            apiKey={apiKey}
          />
        )}
        <div className="flex flex-col w-60">
          <div className="flex flex-col gap-y-1 mb-2">
            <Label className="flex items-center gap-x-2">
              Local AI API Key{" "}
              <p className="text-xs! italic! font-thin!">optional</p>
            </Label>
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
              <Label>Local AI Base URL</Label>
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
              name="LocalAiBasePath"
              placeholder="http://localhost:8080/v1"
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
              <Label className="block">
                {t("provider-options.model-context-window")}
              </Label>
              <Tooltip>
                <TooltipTrigger render={<span className="cursor-pointer" />}>
                  <Info size={14} className="text-theme-text-secondary" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-64 text-xs">
                  Override the context window limit. Leave empty to auto-detect
                  from the model (defaults to 8192 if detection fails).
                </TooltipContent>
              </Tooltip>
            </div>
            <Input
              type="number"
              name="LocalAiTokenLimit"
              placeholder="Automatically managed"
              min={1}
              value={maxTokens}
              onChange={(e) =>
                setMaxTokens(e.target.value ? Number(e.target.value) : "")
              }
              onScroll={(e) => e.target.blur()}
              required={false}
              autoComplete="off"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function LocalAIModelSelection({ settings, basePath = null, apiKey = null }) {
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
          {t("provider-options.chat-model-selection")}
        </Label>
        <Select name="LocalAiModelPref" disabled={true}>
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

  const [selectedModel, setSelectedModel] = useState(
    settings?.LocalAiModelPref || ""
  );

  useEffect(() => {
    setSelectedModel(settings?.LocalAiModelPref || "");
  }, [settings?.LocalAiModelPref]);

  const currentModel =
    selectedModel ||
    settings?.LocalAiModelPref ||
    (customModels.length > 0 ? customModels[0]?.id : "");

  return (
    <div className="flex flex-col w-60">
      <Label className="block mb-2">
        {t("provider-options.chat-model-selection")}
      </Label>
      <Select
        name="LocalAiModelPref"
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

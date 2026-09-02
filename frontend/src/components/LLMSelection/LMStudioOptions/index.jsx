import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { Spinner } from "@/components/ui/spinner";
import { ChevronDown, ChevronUp, Info, TriangleAlert } from "lucide-react";
import paths from "@/utils/paths";
import System from "@/models/system";
import { LMSTUDIO_COMMON_URLS } from "@/utils/constants";
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

export default function LMStudioOptions({ settings, showAlert = false }) {
  const { t } = useTranslation();
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
    initialBasePath: settings?.LMStudioBasePath,
    ENDPOINTS: LMSTUDIO_COMMON_URLS,
  });

  const [maxTokens, setMaxTokens] = useState(
    settings?.LMStudioTokenLimit || ""
  );

  const handleMaxTokensChange = (e) => {
    setMaxTokens(e.target.value ? Number(e.target.value) : "");
  };

  return (
    <div className="w-full flex flex-col gap-y-7">
      {showAlert && (
        <div className="flex flex-col md:flex-row md:items-center gap-x-2 text-theme-text-primary mb-6 bg-blue-800/30 w-fit rounded-lg px-4 py-2">
          <div className="gap-x-2 flex items-center">
            <Info size={12} className="hidden md:visible" />
            <p className="text-sm md:text-base">
              {t("help.lmstudio-options-3")}
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
      <div className="w-full flex items-start gap-[36px] mt-1.5">
        <LMStudioModelSelection
          settings={settings}
          basePath={basePath.value}
          apiKey={authTokenValue.value}
        />
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
          <div className="flex flex-col w-[300px]">
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-1">
                <Label>LM Studio Base URL</Label>
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
                    Enter the URL where LM Studio is running.
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
              name="LMStudioBasePath"
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
              <Label>Model Context Window</Label>
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
                  {t("help.lmstudio-context-window")}
                </TooltipContent>
              </Tooltip>
            </div>
            <Input
              type="number"
              name="LMStudioTokenLimit"
              placeholder={t("provider-options.automatically-managed")}
              min={1}
              value={maxTokens}
              onChange={handleMaxTokensChange}
              onScroll={(e) => e.target.blur()}
              required={false}
              autoComplete="off"
            />
          </div>
        </div>

        <div className="flex items-start gap-4 mt-4">
          <div className="flex flex-col w-60">
            <div className="flex items-center mb-2 gap-x-1">
              <Label>{t("provider-options.auth-token")}</Label>
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
                  <p className="text-xs leading-[18px] font-base">
                    Enter a <code>Bearer</code> Auth Token for interacting with
                    your LM Studio server.
                    <br /> <br />
                    {t("help.lmstudio-options-4")}
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
            <Input
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
  const { t } = useTranslation();
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

  if (loading || customModels.length === 0) {
    return (
      <div className="flex flex-col w-60">
        <div className="flex items-center mb-2 gap-x-1">
          <Label>{t("provider-options.selected-model")}</Label>
          {!loading && !!basePath && (
            <>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <TriangleAlert
                      size={18}
                      className="text-red-400 cursor-pointer"
                    />
                  }
                ></TooltipTrigger>
                <TooltipContent side="top" className="max-w-[250px] text-xs">
                  <p className="text-xs leading-[18px] font-base">
                    {t("help.lmstudio-options-5")}
                  </p>
                </TooltipContent>
              </Tooltip>
            </>
          )}
        </div>
        <Select name="LMStudioModelPref" disabled={true}>
          <SelectTrigger className="w-full">
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

  const [selectedModel, setSelectedModel] = useState(
    settings?.LMStudioModelPref || ""
  );

  useEffect(() => {
    setSelectedModel(settings?.LMStudioModelPref || "");
  }, [settings?.LMStudioModelPref]);

  const currentModel =
    selectedModel ||
    settings?.LMStudioModelPref ||
    (customModels.length > 0 ? customModels[0]?.id : "");

  return (
    <div className="flex flex-col w-60">
      <Label className="block mb-2">
        {t("provider-options.selected-model")}
      </Label>
      <Select
        name="LMStudioModelPref"
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

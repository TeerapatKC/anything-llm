import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import System from "@/models/system";
import PreLoader from "@/components/Preloader";
import { KOBOLDCPP_COMMON_URLS } from "@/utils/constants";
import { ChevronDown, ChevronUp } from "lucide-react";
import useProviderEndpointAutoDiscovery from "@/hooks/useProviderEndpointAutoDiscovery";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

export default function KoboldCPPOptions({ settings }) {
  const { t } = useTranslation();
  const {
    autoDetecting: loading,
    basePath,
    basePathValue,
    showAdvancedControls,
    setShowAdvancedControls,
    handleAutoDetectClick,
  } = useProviderEndpointAutoDiscovery({
    provider: "koboldcpp",
    initialBasePath: settings?.KoboldCPPBasePath,
    ENDPOINTS: KOBOLDCPP_COMMON_URLS,
  });

  const [tokenLimit, setTokenLimit] = useState(
    settings?.KoboldCPPTokenLimit || 4096
  );
  const [maxTokens, setMaxTokens] = useState(
    settings?.KoboldCPPMaxTokens || 2048
  );

  const handleTokenLimitChange = (e) => {
    setTokenLimit(Number(e.target.value));
  };

  const handleMaxTokensChange = (e) => {
    setMaxTokens(Number(e.target.value));
  };

  return (
    <div className="w-full flex flex-col gap-y-7">
      <div className="w-full flex items-start gap-[36px] mt-1.5">
        <KoboldCPPModelSelection
          settings={settings}
          basePath={basePath.value}
        />
        <div className="flex flex-col w-60">
          <Label className="block mb-2">
            {t("provider-options.model-context-window")}
          </Label>
          <Input
            type="number"
            name="KoboldCPPTokenLimit"
            placeholder="4096"
            min={1}
            value={tokenLimit}
            onChange={handleTokenLimitChange}
            onScroll={(e) => e.target.blur()}
            required={true}
            autoComplete="off"
          />
          <p className="text-xs/60 leading-[18px] font-base text-theme-text-primary mt-2">
            Maximum number of tokens for context and response.
          </p>
        </div>
        <div className="flex flex-col w-60">
          <Label className="block mb-2">Max response tokens</Label>
          <Input
            type="number"
            name="KoboldCPPMaxTokens"
            placeholder="2048"
            min={1}
            value={maxTokens}
            onChange={handleMaxTokensChange}
            onScroll={(e) => e.target.blur()}
            required={true}
            autoComplete="off"
          />
          <p className="text-xs/60 leading-[18px] font-base text-theme-text-primary mt-2">
            Maximum number of tokens for the response.
          </p>
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
          <div className="flex flex-col w-60">
            <div className="flex justify-between items-center mb-2">
              <Label>KoboldCPP Base URL</Label>
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
              name="KoboldCPPBasePath"
              placeholder="http://127.0.0.1:5000/v1"
              value={basePathValue.value}
              required={true}
              autoComplete="off"
              spellCheck={false}
              onChange={basePath.onChange}
              onBlur={basePath.onBlur}
            />
            <p className="text-xs/60 leading-[18px] font-base text-theme-text-primary mt-2">
              Enter the URL where KoboldCPP is running.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function KoboldCPPModelSelection({ settings, basePath = null }) {
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
      try {
        const { models } = await System.customModels(
          "koboldcpp",
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

  if (loading || customModels.length === 0) {
    return (
      <div className="flex flex-col w-60">
        <Label className="block mb-2">KoboldCPP Model</Label>
        <Select name="KoboldCPPModelPref" disabled={true}>
          <SelectTrigger className="w-full">
            <SelectValue
              placeholder={
                basePath?.includes("/v1")
                  ? "--loading available models--"
                  : "Enter KoboldCPP URL first"
              }
            />
          </SelectTrigger>
          <SelectContent />
        </Select>
        <p className="text-xs/60 leading-[18px] font-base text-theme-text-primary mt-2">
          {t("help.kobold-cppoptions")}
        </p>
      </div>
    );
  }

  const [selectedModel, setSelectedModel] = useState(
    settings?.KoboldCPPModelPref || ""
  );

  useEffect(() => {
    setSelectedModel(settings?.KoboldCPPModelPref || "");
  }, [settings?.KoboldCPPModelPref]);

  const currentModel =
    selectedModel ||
    settings?.KoboldCPPModelPref ||
    (customModels.length > 0 ? customModels[0]?.id : "");

  return (
    <div className="flex flex-col w-60">
      <Label className="block mb-2">KoboldCPP Model</Label>
      <Select
        name="KoboldCPPModelPref"
        required={true}
        value={currentModel}
        onValueChange={setSelectedModel}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder={t("provider-options.select-option")} />
        </SelectTrigger>
        <SelectContent>
          {customModels.map((model) => (
            <SelectItem key={model.id} value={model.id}>
              {model.id}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs/60 leading-[18px] font-base text-theme-text-primary mt-2">
        Choose the KoboldCPP model you want to use for your conversations.
      </p>
    </div>
  );
}

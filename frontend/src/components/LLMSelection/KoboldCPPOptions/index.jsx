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
          <Label variant="settings" className="block mb-2">
            Model context window
          </Label>
          <Input
            variant="settings"
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
          <p className="text-xs leading-[18px] font-base text-theme-text-primary text-opacity-60 mt-2">
            Maximum number of tokens for context and response.
          </p>
        </div>
        <div className="flex flex-col w-60">
          <Label variant="settings" className="block mb-2">
            Max response tokens
          </Label>
          <Input
            variant="settings"
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
          <p className="text-xs leading-[18px] font-base text-theme-text-primary text-opacity-60 mt-2">
            Maximum number of tokens for the response.
          </p>
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
          <div className="flex flex-col w-60">
            <div className="flex justify-between items-center mb-2">
              <Label variant="settings">KoboldCPP Base URL</Label>
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
              name="KoboldCPPBasePath"
              placeholder="http://127.0.0.1:5000/v1"
              value={basePathValue.value}
              required={true}
              autoComplete="off"
              spellCheck={false}
              onChange={basePath.onChange}
              onBlur={basePath.onBlur}
            />
            <p className="text-xs leading-[18px] font-base text-theme-text-primary text-opacity-60 mt-2">
              Enter the URL where KoboldCPP is running.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function KoboldCPPModelSelection({ settings, basePath = null }) {
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
        <Label variant="settings" className="block mb-2">
          KoboldCPP Model
        </Label>
        <Select name="KoboldCPPModelPref" disabled={true}>
          <SelectTrigger variant="settings">
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
        <p className="text-xs leading-[18px] font-base text-theme-text-primary text-opacity-60 mt-2">
          Select the KoboldCPP model you want to use. Models will load after
          entering a valid KoboldCPP URL.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-60">
      <Label variant="settings" className="block mb-2">
        KoboldCPP Model
      </Label>
      <Select
        name="KoboldCPPModelPref"
        required={true}
        defaultValue={settings.KoboldCPPModelPref ?? customModels?.[0]?.id}
      >
        <SelectTrigger variant="settings">
          <SelectValue placeholder="Select an option" />
        </SelectTrigger>
        <SelectContent>
          {customModels.map((model) => (
            <SelectItem key={model.id} value={model.id}>
              {model.id}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs leading-[18px] font-base text-theme-text-primary text-opacity-60 mt-2">
        Choose the KoboldCPP model you want to use for your conversations.
      </p>
    </div>
  );
}

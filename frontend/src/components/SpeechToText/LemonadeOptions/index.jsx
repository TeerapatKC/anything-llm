import { useEffect, useState } from "react";
import { Spinner } from "@/components/ui/spinner";
import System from "@/models/system";
import { LEMONADE_COMMON_URLS } from "@/utils/constants";
import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import useProviderEndpointAutoDiscovery from "@/hooks/useProviderEndpointAutoDiscovery";
import { originOnly } from "@/utils/url";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function LemonadeSpeechToTextOptions({ settings }) {
  const {
    autoDetecting: loading,
    basePath,
    basePathValue,
    handleAutoDetectClick,
  } = useProviderEndpointAutoDiscovery({
    provider: "lemonade",
    initialBasePath: settings?.STTLemonadeBasePath,
    ENDPOINTS: LEMONADE_COMMON_URLS,
    normalizeBasePath: originOnly,
  });

  return (
    <div className="w-full flex flex-col gap-y-7">
      <div className="flex gap-[36px] mt-1.5 flex-wrap">
        <div className="flex flex-col w-60">
          <div className="flex items-center gap-1 mb-3">
            <div className="flex justify-between items-center gap-x-2">
              <Label>Base URL</Label>
              {loading ? (
                <Spinner size="sm" className="text-theme-text-secondary" />
              ) : (
                <>
                  {!basePathValue.value && (
                    <Button
                      variant="secondary"
                      size="xs"
                      type="button"
                      onClick={handleAutoDetectClick}
                    >
                      Auto-Detect
                    </Button>
                  )}
                </>
              )}
            </div>

            <Tooltip>
              <TooltipTrigger
                render={
                  <div className="text-theme-text-secondary cursor-pointer hover:bg-theme-bg-primary flex items-center justify-center rounded-full" />
                }
              >
                <Info size={18} className="text-theme-text-secondary" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[250px] text-xs">
                Enter the URL where your Lemonade server is running.
              </TooltipContent>
            </Tooltip>
          </div>
          <Input
            type="url"
            name="STTLemonadeBasePath"
            placeholder="http://localhost:13305"
            value={basePathValue.value}
            required={true}
            autoComplete="off"
            spellCheck={false}
            onChange={basePath.onChange}
            onBlur={basePath.onBlur}
          />
        </div>
        <LemonadeSTTModelSelection
          settings={settings}
          basePath={basePathValue.value}
        />
        <div className="flex flex-col w-60">
          <div className="flex items-center gap-1 mb-3">
            <Label className="block">API Key (optional)</Label>

            <Tooltip>
              <TooltipTrigger
                render={
                  <div className="text-theme-text-secondary cursor-pointer hover:bg-theme-bg-primary flex items-center justify-center rounded-full" />
                }
              >
                <Info size={18} className="text-theme-text-secondary" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[250px] text-xs">
                The API key for your Lemonade server. Shared with the Lemonade
                LLM and embedder settings.
              </TooltipContent>
            </Tooltip>
          </div>
          <Input
            type="password"
            name="LemonadeLLMApiKey"
            defaultValue={settings?.LemonadeLLMApiKey ? "*".repeat(20) : ""}
            autoComplete="new-password"
          />
        </div>
      </div>
    </div>
  );
}

function LemonadeSTTModelSelection({ settings, basePath = null }) {
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
          "lemonade-stt",
          null,
          basePath
        );
        setCustomModels(models || []);
      } catch (error) {
        console.error("Failed to fetch Lemonade STT models:", error);
        setCustomModels([]);
      }
      setLoading(false);
    }
    findCustomModels();
  }, [basePath]);

  const downloadedModels = customModels.filter((model) => model?.downloaded);

  if (loading || customModels.length === 0) {
    return (
      <div className="flex flex-col w-60">
        <Label className="block mb-3">Transcription Model</Label>
        <Select name="STTLemonadeModelPref" disabled={true}>
          <SelectTrigger className="w-full">
            <SelectValue
              placeholder={
                basePath
                  ? "-- no transcription models found --"
                  : "Enter Lemonade URL first"
              }
            />
          </SelectTrigger>
          <SelectContent />
        </Select>
        <p className="text-xs/60 leading-[18px] font-base text-theme-text-primary mt-2">
          Load a Whisper or transcription model into your Lemonade server, then
          it will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-60">
      <Label className="block mb-3">Transcription Model</Label>
      <Select
        name="STTLemonadeModelPref"
        required={true}
        // The groups render in this order, so a native select would have
        // defaulted to the first downloaded model when there was one.
        defaultValue={
          settings?.STTLemonadeModelPref ??
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
              {customModels.map((model) => (
                <SelectItem key={model.id} value={model.id}>
                  {model.id}
                </SelectItem>
              ))}
            </SelectGroup>
          )}
        </SelectContent>
      </Select>
    </div>
  );
}

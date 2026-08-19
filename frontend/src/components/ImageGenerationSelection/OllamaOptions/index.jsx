import { ChevronDown, ChevronUp, Info } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import useProviderEndpointAutoDiscovery from "@/hooks/useProviderEndpointAutoDiscovery";
import { OLLAMA_COMMON_URLS } from "@/utils/constants";
import ImageModelSelection from "../ImageModelSelection";
import ImageDimensionSelection from "../ImageDimensionSelection";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function OllamaImageOptions({ settings }) {
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
    provider: "ollama-imggen",
    initialBasePath: settings?.ImageGenerationOllamaBasePath,
    initialAuthToken: settings?.ImageGenerationOllamaAuthToken
      ? "*".repeat(20)
      : "",
    ENDPOINTS: OLLAMA_COMMON_URLS,
  });

  return (
    <div className="w-full flex flex-col gap-y-4">
      <div className="w-full flex items-start gap-[36px] mt-1.5">
        <ImageModelSelection
          provider="ollama-imggen"
          apiKey={authToken.value}
          basePath={basePath.value}
          settings={settings}
          endpointName="Ollama URL"
        />
        <ImageDimensionSelection provider="ollama-imggen" settings={settings} />
      </div>
      <p className="text-xs/60 leading-[18px] font-base text-theme-text-primary">
        Ollama image generation is experimental and only available on macOS.
        Only models that report image generation support will be listed.
      </p>
      <div className="flex justify-start">
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
              <div className="flex items-center gap-1">
                <Label>Ollama Base URL</Label>
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
                    Enter the URL where Ollama is running.
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
              name="ImageGenerationOllamaBasePath"
              placeholder="http://127.0.0.1:11434"
              value={basePathValue.value || ""}
              required={true}
              autoComplete="off"
              spellCheck={false}
              onChange={basePath.onChange}
              onBlur={basePath.onBlur}
            />
          </div>

          <div className="flex flex-col w-60">
            <div className="flex items-center mb-2 gap-x-1">
              <Label>Authentication Token</Label>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Info
                      size={18}
                      className="text-theme-text-secondary cursor-pointer"
                    />
                  }
                ></TooltipTrigger>
                <TooltipContent side="top" className="max-w-[250px]">
                  <p className="text-xs leading-[18px] font-base">
                    Enter a <code>Bearer</code> Auth Token for interacting with
                    your Ollama server.
                    <br /> <br />
                    Used <b>only</b> if running Ollama behind an authentication
                    server.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
            <Input
              type="password"
              name="ImageGenerationOllamaAuthToken"
              placeholder="Ollama Auth Token"
              value={authTokenValue.value || ""}
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

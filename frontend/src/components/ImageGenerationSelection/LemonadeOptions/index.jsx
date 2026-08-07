import { CircleNotch, Info } from "@phosphor-icons/react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Link } from "react-router-dom";
import useProviderEndpointAutoDiscovery from "@/hooks/useProviderEndpointAutoDiscovery";
import { LEMONADE_COMMON_URLS } from "@/utils/constants";
import { originOnly } from "@/utils/url";
import ImageModelSelection from "../ImageModelSelection";
import ImageDimensionSelection from "../ImageDimensionSelection";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function LemonadeImageOptions({ settings }) {
  const {
    autoDetecting: loading,
    basePath,
    basePathValue,
    authToken,
    authTokenValue,
    handleAutoDetectClick,
  } = useProviderEndpointAutoDiscovery({
    provider: "lemonade-imggen",
    initialBasePath: settings?.ImageGenerationLemonadeBasePath,
    initialAuthToken: settings?.ImageGenerationLemonadeApiKey
      ? "*".repeat(20)
      : "",
    ENDPOINTS: LEMONADE_COMMON_URLS,
    normalizeBasePath: originOnly,
  });

  return (
    <div className="w-full flex flex-col gap-y-4">
      <div className="w-full flex items-start gap-[36px] mt-1.5 flex-wrap">
        <div className="flex flex-col w-60">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-1">
              <Label variant="settings">Lemonade Base URL</Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info
                    size={18}
                    className="text-theme-text-secondary cursor-pointer"
                  />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[250px] text-xs">
                  Enter the URL where Lemonade is running.
                  <br />
                  <br />
                  <Link
                    to="https://lemonade-server.ai/docs"
                    target="_blank"
                    className="text-blue-500 hover:underline"
                  >
                    Learn more &rarr;
                  </Link>
                </TooltipContent>
              </Tooltip>
            </div>
            {loading ? (
              <CircleNotch
                size={16}
                className="text-theme-text-secondary animate-spin"
              />
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
            name="ImageGenerationLemonadeBasePath"
            placeholder="http://localhost:13305"
            value={basePathValue.value || ""}
            required={true}
            autoComplete="off"
            spellCheck={false}
            onChange={basePath.onChange}
            onBlur={basePath.onBlur}
          />
        </div>
        <div className="flex flex-col w-60">
          <Label variant="settings" className="block mb-3">
            API Key <span className="text-white/40">(optional)</span>
          </Label>
          <Input
            variant="settings"
            type="password"
            name="ImageGenerationLemonadeApiKey"
            placeholder="Lemonade API Key"
            value={authTokenValue.value || ""}
            onChange={authToken.onChange}
            onBlur={authToken.onBlur}
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        <ImageModelSelection
          provider="lemonade-imggen"
          apiKey={authToken.value}
          basePath={basePath.value}
          settings={settings}
          endpointName="Lemonade URL"
        />
        <ImageDimensionSelection
          provider="lemonade-imggen"
          settings={settings}
        />
      </div>
    </div>
  );
}

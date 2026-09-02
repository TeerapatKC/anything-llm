import { useTranslation } from "react-i18next";
import { Info } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Link } from "react-router-dom";
import useProviderEndpointAutoDiscovery from "@/hooks/useProviderEndpointAutoDiscovery";
import { LOCALAI_COMMON_URLS } from "@/utils/constants";
import ImageModelSelection from "../ImageModelSelection";
import ImageDimensionSelection from "../ImageDimensionSelection";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function LocalAiImageOptions({ settings }) {
  const { t } = useTranslation();
  const {
    autoDetecting: loading,
    basePath,
    basePathValue,
    authToken,
    authTokenValue,
    handleAutoDetectClick,
  } = useProviderEndpointAutoDiscovery({
    provider: "localai-imggen",
    initialBasePath: settings?.ImageGenerationLocalAiBasePath,
    initialAuthToken: settings?.ImageGenerationLocalAiApiKey
      ? "*".repeat(20)
      : "",
    ENDPOINTS: LOCALAI_COMMON_URLS,
  });

  return (
    <div className="w-full flex flex-col gap-y-4">
      <div className="w-full flex items-start gap-[36px] mt-1.5 flex-wrap">
        <div className="flex flex-col w-60">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-1">
              <Label>LocalAI Base URL</Label>
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
                  Enter the URL where LocalAI is running.
                  <br />
                  <br />
                  <Link
                    to="https://localai.io/features/image-generation/"
                    target="_blank"
                    className="text-blue-500 hover:underline"
                  >
                    Learn more &rarr;
                  </Link>
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
            name="ImageGenerationLocalAiBasePath"
            placeholder="http://localhost:8080/v1"
            value={basePathValue.value || ""}
            required={true}
            autoComplete="off"
            spellCheck={false}
            onChange={basePath.onChange}
            onBlur={basePath.onBlur}
          />
        </div>
        <div className="flex flex-col w-60">
          <Label className="block mb-3">
            {t("provider-options.api-key")}{" "}
            <span className="text-white/40">(optional)</span>
          </Label>
          <Input
            type="password"
            name="ImageGenerationLocalAiApiKey"
            placeholder="LocalAI API Key"
            value={authTokenValue.value || ""}
            onChange={authToken.onChange}
            onBlur={authToken.onBlur}
            autoComplete="new-password"
            spellCheck={false}
          />
        </div>
        <ImageModelSelection
          provider="localai-imggen"
          apiKey={authToken.value}
          basePath={basePath.value}
          settings={settings}
          endpointName="LocalAI URL"
        />
        <ImageDimensionSelection provider="localai-imggen" settings={settings} />
      </div>
    </div>
  );
}

import { useTranslation } from "react-i18next";
import PreLoader from "@/components/Preloader";
import useProviderEndpointAutoDiscovery from "@/hooks/useProviderEndpointAutoDiscovery";
import System from "@/models/system";
import { NVIDIA_NIM_COMMON_URLS } from "@/utils/constants";
import { useState, useEffect } from "react";
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

/**
 * This component is used to select a remote NVIDIA NIM model endpoint
 * This is the default component and way to connect to NVIDIA NIM
 * as the "managed" provider can only work in the Desktop context.
 */
export default function RemoteNvidiaNimOptions({ settings }) {
  const {
    autoDetecting: loading,
    basePath,
    basePathValue,
    handleAutoDetectClick,
  } = useProviderEndpointAutoDiscovery({
    provider: "nvidia-nim",
    initialBasePath: settings?.NvidiaNimLLMBasePath,
    ENDPOINTS: NVIDIA_NIM_COMMON_URLS,
  });

  return (
    <div className="flex gap-[36px] mt-1.5">
      <div className="flex flex-col w-60">
        <div className="flex justify-between items-center mb-2">
          <Label>NVIDIA Nim Base URL</Label>
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
          name="NvidiaNimLLMBasePath"
          placeholder="http://localhost:8000/v1"
          value={basePathValue.value}
          required={true}
          autoComplete="off"
          spellCheck={false}
          onChange={basePath.onChange}
          onBlur={basePath.onBlur}
        />
        <p className="text-xs/60 leading-[18px] font-base text-theme-text-primary mt-2">
          Enter the URL where NVIDIA NIM is running.
        </p>
      </div>
      {!settings?.credentialsOnly && (
        <NvidiaNimModelSelection
          settings={settings}
          basePath={basePath.value}
        />
      )}
    </div>
  );
}
function NvidiaNimModelSelection({ settings, basePath }) {
  const { t } = useTranslation();
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function findCustomModels() {
      setLoading(true);
      const { models } = await System.customModels(
        "nvidia-nim",
        null,
        basePath
      );
      setModels(models);
      setLoading(false);
    }
    findCustomModels();
  }, [basePath]);

  if (loading || models.length === 0) {
    return (
      <div className="flex flex-col w-60">
        <Label className="block mb-3">
          {t("provider-options.chat-model-selection")}
        </Label>
        <Select name="NvidiaNimLLMModelPref" disabled={true}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder={t("provider-options.loading-models")} />
          </SelectTrigger>
          <SelectContent />
        </Select>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-60">
      <Label className="block mb-3">
        {t("provider-options.chat-model-selection")}
      </Label>
      <Select
        name="NvidiaNimLLMModelPref"
        required={true}
        defaultValue={settings?.NvidiaNimLLMModelPref ?? models?.[0]?.id}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder={t("provider-options.select-option")} />
        </SelectTrigger>
        <SelectContent>
          {models.map((model) => (
            <SelectItem key={model.id} value={model.id}>
              {model.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

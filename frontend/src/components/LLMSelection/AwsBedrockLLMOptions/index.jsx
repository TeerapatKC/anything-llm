import { useTranslation } from "react-i18next";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info, SquareArrowOutUpRight } from "lucide-react";
import { AWS_REGIONS } from "./regions";
import { useState, useEffect } from "react";
import System from "@/models/system";
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
  SelectSeparator,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

const MANUAL_REGION_ENTRY = "-- Enter region manually --";

export default function AwsBedrockLLMOptions({ settings }) {
  const { t } = useTranslation();
  const [inputValue, setInputValue] = useState(settings?.AwsBedrockLLMApiKey);
  const [apiKey, setApiKey] = useState(settings?.AwsBedrockLLMApiKey);
  const [region, setRegion] = useState(settings?.AwsBedrockLLMRegion);
  // A saved region outside the known list (eg: GovCloud or other specialized
  // regions set via ENV/Helm) can only render via manual entry - a select
  // with no matching option would silently fall back to the first region.
  const [manualRegion, setManualRegion] = useState(
    !!settings?.AwsBedrockLLMRegion &&
      !AWS_REGIONS.some((r) => r.code === settings.AwsBedrockLLMRegion)
  );

  return (
    <div className="w-full flex flex-col">
      {!settings?.credentialsOnly && (
        <div className="flex flex-col md:flex-row md:items-center gap-x-2 text-theme-text-primary mb-4 bg-blue-800/30 w-fit rounded-lg px-4 py-2">
          <div className="gap-x-2 flex items-center">
            <Info size={40} />
            <p className="text-base">
              Connect to AWS Bedrock using the OpenAI-compatible Mantle API.
              <br />
              <a
                href="https://docs.anythingllm.com/setup/llm-configuration/cloud/aws-bedrock"
                target="_blank"
                className="underline flex gap-x-1 items-center"
                rel="noreferrer"
              >
                Read more on how to use AWS Bedrock in NexusAI
                <SquareArrowOutUpRight size={14} />
              </a>
            </p>
          </div>
        </div>
      )}

      <div className="w-full flex items-center gap-[36px] my-1.5">
        <div className="flex flex-col w-60">
          <Label className="block mb-3">AWS Bedrock API Key</Label>
          <Input
            type="password"
            name="AwsBedrockLLMApiKey"
            placeholder="AWS Bedrock API Key"
            defaultValue={settings?.AwsBedrockLLMApiKey ? "*".repeat(20) : ""}
            required={true}
            autoComplete="new-password"
            spellCheck={false}
            onChange={(e) => setInputValue(e.target.value)}
            onBlur={() => setApiKey(inputValue)}
          />
        </div>
        <div className="flex flex-col w-60">
          <Label className="block mb-3">AWS Region</Label>
          {manualRegion ? (
            <>
              <Input
                type="text"
                name="AwsBedrockLLMRegion"
                placeholder="us-gov-west-1"
                defaultValue={region}
                required={true}
                autoComplete="off"
                spellCheck={false}
                onChange={(e) => setRegion(e.target.value)}
              />
              <Button
                type="button"
                variant="link"
                size="sm"
                className="mt-1.5 h-auto w-fit p-0 text-xs"
                onClick={() => {
                  if (!AWS_REGIONS.some((r) => r.code === region))
                    setRegion(AWS_REGIONS[0].code);
                  setManualRegion(false);
                }}
              >
                Select from available regions
              </Button>
            </>
          ) : (
            <Select
              name="AwsBedrockLLMRegion"
              value={region}
              required={true}
              onValueChange={(value) => {
                if (value === MANUAL_REGION_ENTRY) return setManualRegion(true);
                setRegion(value);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("ui.select-region")} />
              </SelectTrigger>
              <SelectContent>
                {AWS_REGIONS.map((region) => {
                  return (
                    <SelectItem key={region.code} value={region.code}>
                      {region.name} ({region.code})
                    </SelectItem>
                  );
                })}
                <SelectSeparator />
                <SelectItem value={MANUAL_REGION_ENTRY}>
                  {MANUAL_REGION_ENTRY}
                </SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      <div className="w-full flex items-center gap-[36px] my-1.5">
        {!settings?.credentialsOnly && (
          <>
            <BedrockModelSelection
              settings={settings}
              apiKey={apiKey}
              region={region}
            />
            <div className="flex flex-col w-60">
              <Label className="block mb-3">
                {t("provider-options.model-context-window")}
              </Label>
              <Input
                type="number"
                name="AwsBedrockLLMTokenLimit"
                placeholder="Content window limit (eg: 8192)"
                min={1}
                onScroll={(e) => e.target.blur()}
                defaultValue={settings?.AwsBedrockLLMTokenLimit}
                required={true}
                autoComplete="off"
              />
            </div>
            <div className="flex flex-col w-60">
              <div className="flex items-center gap-x-1 mb-3">
                <Label className="block">
                  {t("provider-options.max-tokens")}
                </Label>
                <Tooltip>
                  <TooltipTrigger render={<span className="cursor-pointer" />}>
                    <Info size={14} className="text-theme-text-secondary" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-64 text-xs">
                    {t("help.aws-bedrock-llmoptions")}
                  </TooltipContent>
                </Tooltip>
              </div>
              <Input
                type="number"
                name="AwsBedrockLLMMaxTokens"
                placeholder="4096"
                min={1}
                onScroll={(e) => e.target.blur()}
                defaultValue={settings?.AwsBedrockLLMMaxTokens}
                required={false}
                autoComplete="off"
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const MANUAL_MODEL_ENTRY = "-- Enter model ID manually --";

function BedrockModelSelection({ settings, apiKey, region }) {
  const { t } = useTranslation();
  const [groupedModels, setGroupedModels] = useState({});
  const [loading, setLoading] = useState(true);
  const [manualEntry, setManualEntry] = useState(false);

  useEffect(() => {
    async function findCustomModels() {
      setLoading(true);
      const { models = [] } = await System.customModels(
        "bedrock",
        apiKey,
        null,
        null,
        { region }
      );
      const modelsByOrganization = models.reduce((acc, model) => {
        const org = model.organization || "AWS Bedrock";
        acc[org] = acc[org] || [];
        acc[org].push(model);
        return acc;
      }, {});
      setGroupedModels(modelsByOrganization);

      // Saved models not present in the fetched list (eg: cross-region
      // inference profile IDs the Mantle listing omits) can only render
      // via manual entry - same for an empty list.
      const savedModel = settings?.AwsBedrockLLMModel;
      const savedModelInList = models.some((model) => model.id === savedModel);
      setManualEntry(
        models.length === 0 || (!!savedModel && !savedModelInList)
      );
      setLoading(false);
    }
    findCustomModels();
  }, [apiKey, region]);

  if (loading) {
    return (
      <div className="flex flex-col w-60">
        <Label className="block mb-3">
          {t("provider-options.chat-model-selection")}
        </Label>
        <Select name="AwsBedrockLLMModel" disabled={true}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder={t("provider-options.loading-models")} />
          </SelectTrigger>
          <SelectContent />
        </Select>
      </div>
    );
  }

  if (manualEntry) {
    return (
      <div className="flex flex-col w-60">
        <Label className="block mb-3">
          {t("provider-options.chat-model-selection")}
        </Label>
        <Input
          type="text"
          name="AwsBedrockLLMModel"
          placeholder="eu.anthropic.claude-sonnet-4-5-20250929-v1:0"
          defaultValue={settings?.AwsBedrockLLMModel}
          required={true}
          autoComplete="off"
          spellCheck={false}
        />
        {Object.keys(groupedModels).length > 0 && (
          <Button
            type="button"
            variant="link"
            size="sm"
            className="mt-1.5 h-auto w-fit p-0 text-xs"
            onClick={() => setManualEntry(false)}
          >
            Select from available models
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col w-60">
      <Label className="block mb-3">
        {t("provider-options.chat-model-selection")}
      </Label>
      <Select
        name="AwsBedrockLLMModel"
        required={true}
        defaultValue={
          settings?.AwsBedrockLLMModel ??
          groupedModels[Object.keys(groupedModels).sort()[0]]?.[0]?.id
        }
        onValueChange={(value) => {
          if (value === MANUAL_MODEL_ENTRY) setManualEntry(true);
        }}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder={t("provider-options.select-option")} />
        </SelectTrigger>
        <SelectContent>
          {Object.keys(groupedModels)
            .sort()
            .map((organization) => (
              <SelectGroup key={organization}>
                <SelectLabel>{organization}</SelectLabel>
                {groupedModels[organization].map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    {model.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          <SelectSeparator />
          <SelectItem value={MANUAL_MODEL_ENTRY}>
            {MANUAL_MODEL_ENTRY}
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

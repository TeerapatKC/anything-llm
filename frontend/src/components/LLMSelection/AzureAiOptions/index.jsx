import { Info } from "lucide-react";
import { useTranslation } from "react-i18next";
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
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function AzureAiOptions({ settings }) {
  const { t } = useTranslation();

  return (
    <div className="w-full flex flex-col gap-y-7 mt-1.5">
      <div className="w-full flex items-center gap-[36px]">
        <div className="flex flex-col w-60">
          <Label className="block mb-3">
            {t("llm.providers.azure_openai.azure_service_endpoint")}
          </Label>
          <Input
            type="url"
            name="AzureOpenAiEndpoint"
            placeholder="https://my-azure.openai.azure.com"
            defaultValue={settings?.AzureOpenAiEndpoint}
            required={true}
            autoComplete="off"
            spellCheck={false}
          />
        </div>

        <div className="flex flex-col w-60">
          <Label className="block mb-3">
            {t("llm.providers.azure_openai.api_key")}
          </Label>
          <Input
            type="password"
            name="AzureOpenAiKey"
            placeholder="Azure OpenAI API Key"
            defaultValue={settings?.AzureOpenAiKey ? "*".repeat(20) : ""}
            required={true}
            autoComplete="off"
            spellCheck={false}
          />
        </div>

        <div className="flex flex-col w-60">
          <Label className="block mb-3">
            {t("llm.providers.azure_openai.chat_deployment_name")}
          </Label>
          <Input
            type="text"
            name="AzureOpenAiModelPref"
            placeholder="Azure OpenAI chat model deployment name"
            defaultValue={settings?.AzureOpenAiModelPref}
            required={true}
            autoComplete="off"
            spellCheck={false}
          />
        </div>
      </div>

      <div className="w-full flex items-center gap-[36px]">
        <div className="flex flex-col w-60">
          <Label className="block mb-3">
            {t("llm.providers.azure_openai.chat_model_token_limit")}
          </Label>
          {/* Radix only deals in string values, where a native select coerced
              the numbers itself — value={4096} submitted "4096". */}
          <Select
            name="AzureOpenAiTokenLimit"
            defaultValue={String(settings?.AzureOpenAiTokenLimit || 4096)}
            required={true}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select an option" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="4096">4,096 (gpt-3.5-turbo)</SelectItem>
              <SelectItem value="16384">16,384 (gpt-3.5-16k)</SelectItem>
              <SelectItem value="8192">8,192 (gpt-4)</SelectItem>
              <SelectItem value="32768">32,768 (gpt-4-32k)</SelectItem>
              <SelectItem value="128000">
                128,000 (gpt-4-turbo,gpt-4o,gpt-4o-mini,o1-mini)
              </SelectItem>
              <SelectItem value="200000">
                200,000 (o1,o1-pro,o3-mini)
              </SelectItem>
              <SelectItem value="1047576">1,047,576 (gpt-4.1)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col w-60">
          <div className="flex items-center gap-1 mb-3">
            <Label className="block">
              {t("llm.providers.azure_openai.model_type")}
            </Label>

            <Tooltip>
              <TooltipTrigger
                render={
                  <div
                    type="button"
                    className="text-theme-text-secondary cursor-pointer hover:bg-theme-bg-primary flex items-center justify-center rounded-full"
                  />
                }
              >
                <Info size={18} className="text-theme-text-secondary" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[250px] text-xs">
                {t("llm.providers.azure_openai.model_type_tooltip")}
              </TooltipContent>
            </Tooltip>
          </div>
          <Select
            name="AzureOpenAiModelType"
            defaultValue={settings?.AzureOpenAiModelType || "default"}
            required={true}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select an option" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">
                {t("llm.providers.azure_openai.default")}
              </SelectItem>
              <SelectItem value="reasoning">
                {t("llm.providers.azure_openai.reasoning")}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

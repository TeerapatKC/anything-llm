import { useEffect, useState } from "react";
import System from "@/models/system";
import { Warning, Info } from "@phosphor-icons/react";
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

export default function LiteLLMOptions({ settings }) {
  const [basePathValue, setBasePathValue] = useState(settings?.LiteLLMBasePath);
  const [basePath, setBasePath] = useState(settings?.LiteLLMBasePath);
  const [apiKeyValue, setApiKeyValue] = useState(settings?.LiteLLMAPIKey);
  const [apiKey, setApiKey] = useState(settings?.LiteLLMAPIKey);

  return (
    <div className="w-full flex flex-col gap-y-7">
      <div className="w-full flex items-center gap-[36px] mt-1.5">
        <div className="flex flex-col w-60">
          <Label variant="settings" className="block mb-3">
            Base URL
          </Label>
          <Input
            variant="settings"
            type="url"
            name="LiteLLMBasePath"
            placeholder="http://127.0.0.1:4000"
            defaultValue={settings?.LiteLLMBasePath}
            required={true}
            autoComplete="off"
            spellCheck={false}
            onChange={(e) => setBasePathValue(e.target.value)}
            onBlur={() => setBasePath(basePathValue)}
          />
        </div>
        <LiteLLMModelSelection
          settings={settings}
          basePath={basePath}
          apiKey={apiKey}
        />
        <div className="flex flex-col w-60">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex gap-x-1 items-center mb-3">
                <Info
                  size={16}
                  className="text-theme-text-secondary cursor-pointer"
                />
                <Label variant="settings" className="block">
                  Max embedding chunk length
                </Label>
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[250px] text-xs">
              Maximum length of text chunks, in characters, for embedding.
            </TooltipContent>
          </Tooltip>
          <Input
            variant="settings"
            type="number"
            name="EmbeddingModelMaxChunkLength"
            placeholder="8192"
            min={1}
            onScroll={(e) => e.target.blur()}
            defaultValue={settings?.EmbeddingModelMaxChunkLength}
            required={false}
            autoComplete="off"
          />
        </div>
      </div>
      <div className="w-full flex items-center gap-[36px]">
        <div className="flex flex-col w-60">
          <div className="flex flex-col gap-y-1 mb-4">
            <Label variant="settings" className="flex items-center gap-x-2">
              API Key <p className="!text-xs !italic !font-thin">optional</p>
            </Label>
          </div>
          <Input
            variant="settings"
            type="password"
            name="LiteLLMAPIKey"
            placeholder="sk-mysecretkey"
            defaultValue={settings?.LiteLLMAPIKey ? "*".repeat(20) : ""}
            autoComplete="new-password"
            spellCheck={false}
            onChange={(e) => setApiKeyValue(e.target.value)}
            onBlur={() => setApiKey(apiKeyValue)}
          />
        </div>
      </div>
    </div>
  );
}

function LiteLLMModelSelection({ settings, basePath = null, apiKey = null }) {
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
      const { models } = await System.customModels(
        "litellm",
        typeof apiKey === "boolean" ? null : apiKey,
        basePath
      );
      setCustomModels(models || []);
      setLoading(false);
    }
    findCustomModels();
  }, [basePath, apiKey]);

  if (loading || customModels.length == 0) {
    return (
      <div className="flex flex-col w-60">
        <Label variant="settings" className="block mb-3">
          Embedding Model Selection
        </Label>
        <Select name="EmbeddingModelPref" disabled={true}>
          <SelectTrigger variant="settings">
            <SelectValue
              placeholder={
                basePath?.includes("/v1")
                  ? "-- loading available models --"
                  : "-- waiting for URL --"
              }
            />
          </SelectTrigger>
          <SelectContent />
        </Select>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-60">
      <div className="flex items-center">
        <Label variant="settings" className="block mb-3">
          Embedding Model Selection
        </Label>
        <EmbeddingModelTooltip />
      </div>
      <Select
        name="EmbeddingModelPref"
        required={true}
        defaultValue={settings.EmbeddingModelPref ?? customModels?.[0]?.id}
      >
        <SelectTrigger variant="settings">
          <SelectValue placeholder="Select an option" />
        </SelectTrigger>
        <SelectContent>
          {customModels.length > 0 && (
            <SelectGroup>
              <SelectLabel>Your loaded models</SelectLabel>
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

function EmbeddingModelTooltip() {
  return (
    <div className="flex items-center justify-center -mt-3 ml-1">
      <Tooltip>
        <TooltipTrigger asChild>
          <Warning size={14} className="ml-1 text-orange-500 cursor-pointer" />
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[250px] text-xs">
          <p className="text-sm">
            Be sure to select a valid embedding model. Chat models are not
            embedding models. See{" "}
            <a
              href="https://litellm.vercel.app/docs/embedding/supported_embedding"
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              this page
            </a>{" "}
            for more information.
          </p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

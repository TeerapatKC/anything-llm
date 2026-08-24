import React, { useEffect, useState } from "react";
import { Spinner } from "@/components/ui/spinner";
import System from "@/models/system";
import { OLLAMA_COMMON_URLS } from "@/utils/constants";
import { ChevronDown, ChevronUp, Info } from "lucide-react";
import useProviderEndpointAutoDiscovery from "@/hooks/useProviderEndpointAutoDiscovery";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Link } from "react-router-dom";
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
import { Button } from "@/components/ui/button";

export default function OllamaLLMOptions({ settings }) {
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
    provider: "ollama",
    initialBasePath: settings?.OllamaLLMBasePath,
    ENDPOINTS: OLLAMA_COMMON_URLS,
  });
  const [maxTokens, setMaxTokens] = useState(
    settings?.OllamaLLMTokenLimit || ""
  );

  return (
    <div className="w-full flex flex-col gap-y-7">
      <div className="w-full flex items-start gap-[36px] mt-1.5">
        <OllamaLLMModelSelection
          settings={settings}
          basePath={basePath.value}
          authToken={authToken.value}
        />
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
          {showAdvancedControls ? "Hide" : "Show"} advanced settings
          {showAdvancedControls ? (
            <ChevronUp size={14} className="ml-1" />
          ) : (
            <ChevronDown size={14} className="ml-1" />
          )}
        </Button>
      </div>

      <div hidden={!showAdvancedControls}>
        <div className="flex flex-col">
          <div className="w-full flex items-start gap-4 mb-4">
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
                    <TooltipContent
                      side="top"
                      className="max-w-[250px] text-xs"
                    >
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
                name="OllamaLLMBasePath"
                placeholder="http://127.0.0.1:11434"
                value={basePathValue.value}
                required={true}
                autoComplete="off"
                spellCheck={false}
                onChange={basePath.onChange}
                onBlur={basePath.onBlur}
              />
            </div>

            <div className="flex flex-col w-60">
              <div className="flex items-center mb-2 gap-x-1">
                <Label className="block">Ollama Keep Alive</Label>
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
                    <p className="text-xs leading-[18px] font-base">
                      Choose how long Ollama should keep your model in memory
                      before unloading.{" "}
                      <Link
                        className="underline text-blue-300"
                        to="https://docs.ollama.com/faq#how-do-i-keep-a-model-loaded-in-memory-or-make-it-unload-immediately"
                        target="_blank"
                        rel="noreferrer"
                      >
                        Learn more &rarr;
                      </Link>
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Select
                name="OllamaLLMKeepAliveSeconds"
                required={true}
                defaultValue={settings?.OllamaLLMKeepAliveSeconds ?? "300"}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select an option" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">No cache</SelectItem>
                  <SelectItem value="300">5 minutes</SelectItem>
                  <SelectItem value="3600">1 hour</SelectItem>
                  <SelectItem value="-1">Forever</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="w-full flex items-start gap-4">
            <div className="flex flex-col w-60">
              <div className="flex items-center mb-2 gap-x-1">
                <Label className="block">Model context window</Label>
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
                    <p className="text-xs leading-[18px] font-base">
                      Specify the maximum number of tokens that can be used for
                      the model context window.
                      <br /> <br />
                      If you leave this field blank, the context window limit
                      will be auto-detected from the model and applied to all
                      chats. If auto-detection fails, a fallback context window
                      limit of 4096 will be used.
                      <br /> <br />
                      <b>Important:</b> Some models have very large context
                      windows using the full context window limit can
                      dramatically increase the memory usage of your system. For
                      this reason, we will automatically cap the context window
                      limit to 16,384 tokens if the model supports more than
                      that and no value is specified.
                      <br /> <br />
                      If an invalid value is entered, NexusAI will handle this
                      for you so that chats do not fail.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Input
                type="number"
                name="OllamaLLMTokenLimit"
                placeholder="Automatically managed"
                min={1}
                value={maxTokens}
                onChange={(e) =>
                  setMaxTokens(e.target.value ? Number(e.target.value) : "")
                }
                onScroll={(e) => e.target.blur()}
                required={false}
                autoComplete="off"
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
                  <TooltipContent side="top" className="max-w-[250px] text-xs">
                    <p className="text-xs leading-[18px] font-base">
                      Enter a <code>Bearer</code> Auth Token for interacting
                      with your Ollama server.
                      <br /> <br />
                      Used <b>only</b> if running Ollama behind an
                      authentication server.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Input
                type="password"
                name="OllamaLLMAuthToken"
                placeholder="Ollama Auth Token"
                defaultValue={
                  settings?.OllamaLLMAuthToken ? "*".repeat(20) : ""
                }
                value={authTokenValue.value}
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
    </div>
  );
}

function OllamaLLMModelSelection({
  settings,
  basePath = null,
  authToken = null,
}) {
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
          "ollama",
          authToken,
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
  }, [basePath, authToken]);

  if (loading || customModels.length === 0) {
    return (
      <div className="flex flex-col w-60">
        <Label className="block mb-2">Ollama Model</Label>
        <Select name="OllamaLLMModelPref" disabled={true}>
          <SelectTrigger className="w-full">
            <SelectValue
              placeholder={
                !!basePath
                  ? "--loading available models--"
                  : "Enter Ollama URL first"
              }
            />
          </SelectTrigger>
          <SelectContent />
        </Select>
        <p className="text-xs/60 leading-[18px] font-base text-theme-text-primary mt-2">
          Select the Ollama model you want to use. Models will load after
          entering a valid Ollama URL.
        </p>
      </div>
    );
  }

  const [selectedModel, setSelectedModel] = useState(
    settings?.OllamaLLMModelPref || ""
  );

  useEffect(() => {
    setSelectedModel(settings?.OllamaLLMModelPref || "");
  }, [settings?.OllamaLLMModelPref]);

  const currentModel =
    selectedModel ||
    settings?.OllamaLLMModelPref ||
    (customModels.length > 0 ? customModels[0]?.id : "");

  return (
    <div className="flex flex-col w-60">
      <Label className="block mb-2">Ollama Model</Label>
      <Select
        name="OllamaLLMModelPref"
        required={true}
        value={currentModel}
        onValueChange={setSelectedModel}
      >
        <SelectTrigger className="w-full">
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
      <p className="text-xs/60 leading-[18px] font-base text-theme-text-primary mt-2">
        Choose the Ollama model you want to use for your conversations.
      </p>
    </div>
  );
}

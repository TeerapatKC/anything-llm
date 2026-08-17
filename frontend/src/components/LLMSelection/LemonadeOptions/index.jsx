import { useState, useEffect } from "react";
import System from "@/models/system";
import useProviderEndpointAutoDiscovery from "@/hooks/useProviderEndpointAutoDiscovery";
import { CircleNotch, Info } from "@phosphor-icons/react";
import strDistance from "js-levenshtein";
import { LLM_PREFERENCE_CHANGED_EVENT } from "@/pages/GeneralSettings/LLMPreference";
import { LEMONADE_COMMON_URLS } from "@/utils/constants";
import { originOnly } from "@/utils/url";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Link } from "react-router-dom";
import ModelTable from "@/components/lib/ModelTable";
import ModelTableLayout from "@/components/lib/ModelTable/layout";
import ModelTableLoadingSkeleton from "@/components/lib/ModelTable/loading";
import showToast from "@/utils/toast";
import LemonadeUtils from "@/models/utils/lemonadeUtils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import ConfirmDialog from "@/components/ConfirmDialog";

export default function LemonadeOptions({ settings }) {
  const {
    autoDetecting: loading,
    basePath,
    basePathValue,
    handleAutoDetectClick,
  } = useProviderEndpointAutoDiscovery({
    provider: "lemonade",
    initialBasePath: settings?.LemonadeLLMBasePath,
    ENDPOINTS: LEMONADE_COMMON_URLS,
    normalizeBasePath: originOnly,
  });
  const [selectedModelId, setSelectedModelId] = useState(
    settings?.LemonadeLLMModelPref
  );
  const [maxTokens, setMaxTokens] = useState(
    settings?.LemonadeLLMModelTokenLimit || 4096
  );

  return (
    <div className="w-full flex flex-col gap-y-7">
      <div className="flex gap-[36px] mt-1.5 flex-wrap">
        <div className="flex flex-col w-60">
          <div className="flex items-center gap-1 mb-3">
            <div className="flex justify-between items-center gap-x-2">
              <Label variant="settings">Base URL</Label>
              {loading ? (
                <CircleNotch className="w-4 h-4 text-theme-text-secondary animate-spin" />
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

            <Tooltip>
              <TooltipTrigger asChild>
                <div className="text-theme-text-secondary cursor-pointer hover:bg-theme-bg-primary flex items-center justify-center rounded-full">
                  <Info size={18} className="text-theme-text-secondary" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[250px] text-xs">
                Enter the URL where the Lemonade is running.
                <br />
                <br />
                You <b>must</b> have enabled the Lemonade TCP support for this
                to work.
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

          <Input
            variant="settings"
            type="url"
            name="LemonadeLLMBasePath"
            placeholder="http://localhost:13305"
            value={basePathValue.value}
            required={true}
            autoComplete="off"
            spellCheck={false}
            onChange={basePath.onChange}
            onBlur={basePath.onBlur}
          />
        </div>
        <div className="flex flex-col w-60">
          <div className="flex items-center gap-1 mb-3">
            <Label variant="settings" className="block">
              Model context window
            </Label>

            <Tooltip>
              <TooltipTrigger asChild>
                <div className="text-theme-text-secondary cursor-pointer hover:bg-theme-bg-primary flex items-center justify-center rounded-full">
                  <Info size={18} className="text-theme-text-secondary" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[250px] text-xs">
                The maximum number of tokens that can be used for a model
                context window. This must be set to a value that is supported by
                the model.
              </TooltipContent>
            </Tooltip>
          </div>
          <Input
            variant="settings"
            type="number"
            name="LemonadeLLMModelTokenLimit"
            placeholder="8192"
            min={1}
            value={maxTokens}
            onChange={(e) => setMaxTokens(Number(e.target.value))}
            onScroll={(e) => e.target.blur()}
            required={true}
            autoComplete="off"
          />
        </div>
        <div className="flex flex-col w-60">
          <div className="flex items-center gap-1 mb-3">
            <Label variant="settings" className="block">
              API Key (optional)
            </Label>

            <Tooltip>
              <TooltipTrigger asChild>
                <div className="text-theme-text-secondary cursor-pointer hover:bg-theme-bg-primary flex items-center justify-center rounded-full">
                  <Info size={18} className="text-theme-text-secondary" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[250px] text-xs">
                The API key for your Lemonade server
              </TooltipContent>
            </Tooltip>
          </div>
          <Input
            variant="settings"
            type="password"
            name="LemonadeLLMApiKey"
            defaultValue={settings?.LemonadeLLMApiKey ? "*".repeat(20) : ""}
            autoComplete="off"
          />
        </div>
        <LemonadeModelSelection
          selectedModelId={selectedModelId}
          setSelectedModelId={setSelectedModelId}
          basePath={basePathValue.value}
        />
      </div>
    </div>
  );
}

function LemonadeModelSelection({
  selectedModelId,
  setSelectedModelId,
  basePath = null,
}) {
  const [customModels, setCustomModels] = useState([]);
  const [filteredModels, setFilteredModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [confirm, setConfirm] = useState(null);

  async function fetchModels() {
    if (!basePath) {
      setCustomModels([]);
      setFilteredModels([]);
      setLoading(false);
      setSearchQuery("");
      return;
    }
    setLoading(true);
    const { models } = await System.customModels("lemonade", null, basePath);
    setCustomModels(models || []);
    setFilteredModels(models || []);
    setSearchQuery("");
    setLoading(false);
  }

  useEffect(() => {
    fetchModels();
  }, [basePath]);

  useEffect(() => {
    if (!searchQuery || !customModels.length) {
      setFilteredModels(customModels || []);
      return;
    }

    const normalizedSearchQuery = searchQuery.toLowerCase().trim();
    const filteredModels = new Map();

    customModels.forEach((model) => {
      const modelNameNormalized = model.name.toLowerCase();
      const modelOrganizationNormalized = model.organization.toLowerCase();

      if (modelNameNormalized.startsWith(normalizedSearchQuery))
        filteredModels.set(model.id, model);
      if (modelOrganizationNormalized.startsWith(normalizedSearchQuery))
        filteredModels.set(model.id, model);
      if (strDistance(modelNameNormalized, normalizedSearchQuery) <= 2)
        filteredModels.set(model.id, model);
      if (strDistance(modelOrganizationNormalized, normalizedSearchQuery) <= 2)
        filteredModels.set(model.id, model);
    });

    setFilteredModels(Array.from(filteredModels.values()));
  }, [searchQuery]);

  async function uninstallModel(modelId) {
    setConfirm({
      title: "Uninstall this model?",
      description: "You will need to download it again to use it.",
      confirmText: "Uninstall",
      variant: "destructive",
      onConfirm: () => uninstallModelNow(modelId),
    });
  }

  async function uninstallModelNow(modelId) {
    try {
      const { success, error } = await LemonadeUtils.deleteModel(
        modelId,
        basePath
      );

      if (!success)
        throw new Error(
          error || "An error occurred while uninstalling the model"
        );

      const updatedModels = customModels.map((model) =>
        model.id === modelId ? { ...model, downloaded: false } : model
      );
      setCustomModels(updatedModels);
      setFilteredModels(updatedModels);
      setSearchQuery("");
    } catch (e) {
      console.error("Error uninstalling model:", e);
      showToast(
        e.message || "An error occurred while uninstalling the model",
        "error",
        { clear: true }
      );
    } finally {
      setLoading(false);
    }
  }

  async function downloadModel(modelId, fileSize, progressCallback) {
    setConfirm({
      title: "Download this model?",
      description: `It is ${fileSize} in size and may take a while to download.`,
      confirmText: "Download",
      variant: "default",
      onConfirm: () => downloadModelNow(modelId, progressCallback),
    });
  }

  async function downloadModelNow(modelId, progressCallback) {
    try {
      const { success, error } = await LemonadeUtils.downloadModel(
        modelId,
        basePath,
        progressCallback
      );
      if (!success)
        throw new Error(
          error || "An error occurred while downloading the model"
        );
      progressCallback(100);
      handleSetActiveModel(modelId);

      const existingModels = [...customModels];
      const newModel = existingModels.find((model) => model.id === modelId);
      if (newModel) {
        newModel.downloaded = true;
        setCustomModels(existingModels);
        setFilteredModels(existingModels);
        setSearchQuery("");
      }
    } catch (e) {
      console.error("Error downloading model:", e);
      showToast(
        e.message || "An error occurred while downloading the model",
        "error",
        { clear: true }
      );
    } finally {
      setLoading(false);
    }
  }

  function groupModelsByAlias(models) {
    const mapping = new Map();
    mapping.set("installed", new Map());
    mapping.set("not installed", new Map());

    const groupedModels = models.reduce((acc, model) => {
      acc[model.organization] = acc[model.organization] || [];
      acc[model.organization].push(model);
      return acc;
    }, {});

    Object.entries(groupedModels).forEach(([organization, models]) => {
      const hasInstalled = models.some((model) => model.downloaded);
      if (hasInstalled) {
        const installedModels = models.filter((model) => model.downloaded);
        mapping
          .get("installed")
          .set("Downloaded Models", [
            ...(mapping.get("installed").get("Downloaded Models") || []),
            ...installedModels,
          ]);
      }
      const tags = models.map((model) => ({
        ...model,
        name: model.name.split(":")[1],
      }));
      mapping.get("not installed").set(organization, tags);
    });

    const orderedMap = new Map();
    const installedMap = new Map();
    mapping
      .get("installed")
      .entries()
      .forEach(([organization, models]) =>
        installedMap.set(organization, models)
      );
    mapping
      .get("not installed")
      .entries()
      .forEach(([organization, models]) =>
        orderedMap.set(organization, models)
      );

    // Sort the models by organization/creator name alphabetically but keep the installed models at the top
    return Object.fromEntries(
      Array.from(installedMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .concat(
          Array.from(orderedMap.entries()).sort((a, b) =>
            a[0].localeCompare(b[0])
          )
        )
    );
  }

  function handleSetActiveModel(modelId) {
    if (modelId === selectedModelId) return;
    setSelectedModelId(modelId);
    window.dispatchEvent(new Event(LLM_PREFERENCE_CHANGED_EVENT));
  }

  const groupedModels = groupModelsByAlias(filteredModels);
  return (
    <ModelTableLayout
      fetchModels={fetchModels}
      searchQuery={searchQuery}
      setSearchQuery={setSearchQuery}
      loading={loading}
    >
      <input
        type="hidden"
        name="LemonadeLLMModelPref"
        id="LemonadeLLMModelPref"
        value={selectedModelId}
      />
      {loading ? (
        <ModelTableLoadingSkeleton />
      ) : filteredModels.length === 0 ? (
        <div className="flex flex-col w-full gap-y-2 mt-4">
          <p className="text-theme-text-secondary text-sm">No models found!</p>
        </div>
      ) : (
        Object.entries(groupedModels).map(([alias, models]) => (
          <ModelTable
            key={alias}
            alias={alias}
            models={models}
            setActiveModel={handleSetActiveModel}
            downloadModel={downloadModel}
            selectedModelId={selectedModelId}
            uninstallModel={uninstallModel}
            ui={{
              showRuntime: false,
            }}
          />
        ))
      )}
      <ConfirmDialog config={confirm} onClose={() => setConfirm(null)} />
    </ModelTableLayout>
  );
}

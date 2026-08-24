import React, { useEffect, useState, useRef } from "react";
import PageHeader from "@/components/layout/PageHeader";
import SettingsLayout from "@/components/layout/SettingsLayout";
import { SpinnerBlock } from "@/components/ui/spinner";
import System from "@/models/system";
import showToast from "@/utils/toast";
import AnythingLLMIcon from "@/media/logo/anything-llm-icon.png";
import OpenAiLogo from "@/media/llmprovider/openai.png";
import AzureOpenAiLogo from "@/media/llmprovider/azure.png";
import GeminiAiLogo from "@/media/llmprovider/gemini.png";
import LocalAiLogo from "@/media/llmprovider/localai.png";
import OllamaLogo from "@/media/llmprovider/ollama.png";
import LMStudioLogo from "@/media/llmprovider/lmstudio.png";
import CohereLogo from "@/media/llmprovider/cohere.png";
import VoyageAiLogo from "@/media/embeddingprovider/voyageai.png";
import LiteLLMLogo from "@/media/llmprovider/litellm.png";
import GenericOpenAiLogo from "@/media/llmprovider/generic-openai.png";
import MistralAiLogo from "@/media/llmprovider/mistral.jpeg";
import OpenRouterLogo from "@/media/llmprovider/openrouter.jpeg";
import LemonadeLogo from "@/media/llmprovider/lemonade.png";

import ChangeWarningModal from "@/components/ChangeWarning";
import OpenAiOptions from "@/components/EmbeddingSelection/OpenAiOptions";
import AzureAiOptions from "@/components/EmbeddingSelection/AzureAiOptions";
import GeminiOptions from "@/components/EmbeddingSelection/GeminiOptions";
import LocalAiOptions from "@/components/EmbeddingSelection/LocalAiOptions";
import NativeEmbeddingOptions from "@/components/EmbeddingSelection/NativeEmbeddingOptions";
import OllamaEmbeddingOptions from "@/components/EmbeddingSelection/OllamaOptions";
import LMStudioEmbeddingOptions from "@/components/EmbeddingSelection/LMStudioOptions";
import CohereEmbeddingOptions from "@/components/EmbeddingSelection/CohereOptions";
import VoyageAiOptions from "@/components/EmbeddingSelection/VoyageAiOptions";
import LiteLLMOptions from "@/components/EmbeddingSelection/LiteLLMOptions";
import GenericOpenAiEmbeddingOptions from "@/components/EmbeddingSelection/GenericOpenAiOptions";
import OpenRouterOptions from "@/components/EmbeddingSelection/OpenRouterOptions";
import MistralAiOptions from "@/components/EmbeddingSelection/MistralAiOptions";
import LemonadeOptions from "@/components/EmbeddingSelection/LemonadeOptions";

import EmbedderItem from "@/components/EmbeddingSelection/EmbedderItem";
import { ChevronsUpDown, Search, X } from "lucide-react";
import { useModal } from "@/hooks/useModal";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useTranslation } from "react-i18next";

const EMBEDDERS = [
  {
    name: "NexusAI Embedder",
    value: "native",
    logo: AnythingLLMIcon,
    options: (settings) => <NativeEmbeddingOptions settings={settings} />,
    description: "Use the built-in embedding provider for NexusAI. Zero setup!",
  },
  {
    name: "OpenAI",
    value: "openai",
    logo: OpenAiLogo,
    options: (settings) => <OpenAiOptions settings={settings} />,
    description: "The standard option for most non-commercial use.",
  },
  {
    name: "Azure OpenAI",
    value: "azure",
    logo: AzureOpenAiLogo,
    options: (settings) => <AzureAiOptions settings={settings} />,
    description: "The enterprise option of OpenAI hosted on Azure services.",
  },
  {
    name: "Gemini",
    value: "gemini",
    logo: GeminiAiLogo,
    options: (settings) => <GeminiOptions settings={settings} />,
    description: "Run powerful embedding models from Google AI.",
  },
  {
    name: "Local AI",
    value: "localai",
    logo: LocalAiLogo,
    options: (settings) => <LocalAiOptions settings={settings} />,
    description: "Run embedding models locally on your own machine.",
  },
  {
    name: "Ollama",
    value: "ollama",
    logo: OllamaLogo,
    options: (settings) => <OllamaEmbeddingOptions settings={settings} />,
    description: "Run embedding models locally on your own machine.",
  },
  {
    name: "LM Studio",
    value: "lmstudio",
    logo: LMStudioLogo,
    options: (settings) => <LMStudioEmbeddingOptions settings={settings} />,
    description:
      "Discover, download, and run thousands of cutting edge LLMs in a few clicks.",
  },
  {
    name: "Lemonade",
    value: "lemonade",
    logo: LemonadeLogo,
    options: (settings) => <LemonadeOptions settings={settings} />,
    description:
      "Run embedding models locally on your own machine using Lemonade.",
  },
  {
    name: "OpenRouter",
    value: "openrouter",
    logo: OpenRouterLogo,
    options: (settings) => <OpenRouterOptions settings={settings} />,
    description: "Run embedding models from OpenRouter.",
  },
  {
    name: "LiteLLM",
    value: "litellm",
    logo: LiteLLMLogo,
    options: (settings) => <LiteLLMOptions settings={settings} />,
    description: "Run powerful embedding models from LiteLLM.",
  },
  {
    name: "Cohere",
    value: "cohere",
    logo: CohereLogo,
    options: (settings) => <CohereEmbeddingOptions settings={settings} />,
    description: "Run powerful embedding models from Cohere.",
  },
  {
    name: "Voyage AI",
    value: "voyageai",
    logo: VoyageAiLogo,
    options: (settings) => <VoyageAiOptions settings={settings} />,
    description: "Run powerful embedding models from Voyage AI.",
  },
  {
    name: "Mistral AI",
    value: "mistral",
    logo: MistralAiLogo,
    options: (settings) => <MistralAiOptions settings={settings} />,
    description: "Run powerful embedding models from Mistral AI.",
  },
  {
    name: "Generic OpenAI",
    value: "generic-openai",
    logo: GenericOpenAiLogo,
    options: (settings) => (
      <GenericOpenAiEmbeddingOptions settings={settings} />
    ),
    description: "Run embedding models from any OpenAI compatible API service.",
  },
];

export default function GeneralEmbeddingPreference() {
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [hasEmbeddings, setHasEmbeddings] = useState(false);
  const [hasCachedEmbeddings, setHasCachedEmbeddings] = useState(false);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredEmbedders, setFilteredEmbedders] = useState([]);
  const [selectedEmbedder, setSelectedEmbedder] = useState(null);
  const [searchMenuOpen, setSearchMenuOpen] = useState(false);
  const searchInputRef = useRef(null);
  const { isOpen, openModal, closeModal } = useModal();
  const { t } = useTranslation();

  function embedderModelChanged(formEl) {
    try {
      const newModel = new FormData(formEl).get("EmbeddingModelPref") ?? null;
      if (newModel === null) return false;
      return settings?.EmbeddingModelPref !== newModel;
    } catch (error) {
      console.error(error);
    }
    return false;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (
      (selectedEmbedder !== settings?.EmbeddingEngine ||
        embedderModelChanged(e.target)) &&
      hasChanges &&
      (hasEmbeddings || hasCachedEmbeddings)
    ) {
      openModal();
    } else {
      await handleSaveSettings();
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    const form = document.getElementById("embedding-form");
    const settingsData = {};
    const formData = new FormData(form);
    settingsData.EmbeddingEngine = selectedEmbedder;
    for (var [key, value] of formData.entries()) settingsData[key] = value;

    const { error } = await System.updateSystem(settingsData);
    if (error) {
      showToast(`Failed to save embedding settings: ${error}`, "error");
      setHasChanges(true);
    } else {
      showToast("Embedding preferences saved successfully.", "success");
      setHasChanges(false);
    }
    setSaving(false);
    closeModal();
  };

  const updateChoice = (selection) => {
    setSearchQuery("");
    setSelectedEmbedder(selection);
    setSearchMenuOpen(false);
    setHasChanges(true);
  };

  const handleXButton = () => {
    if (searchQuery.length > 0) {
      setSearchQuery("");
      if (searchInputRef.current) searchInputRef.current.value = "";
    } else {
      setSearchMenuOpen(!searchMenuOpen);
    }
  };

  useEffect(() => {
    async function fetchKeys() {
      const _settings = await System.keys();
      setSettings(_settings);
      setSelectedEmbedder(_settings?.EmbeddingEngine || "native");
      setHasEmbeddings(_settings?.HasExistingEmbeddings || false);
      setHasCachedEmbeddings(_settings?.HasCachedEmbeddings || false);
      setLoading(false);
    }
    fetchKeys();
  }, []);

  useEffect(() => {
    const filtered = EMBEDDERS.filter((embedder) =>
      embedder.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredEmbedders(filtered);
  }, [searchQuery, selectedEmbedder]);

  const selectedEmbedderObject = EMBEDDERS.find(
    (embedder) => embedder.value === selectedEmbedder
  );

  return (
    <SettingsLayout>
      {loading ? (
        <SpinnerBlock className="min-h-[60vh]" />
      ) : (
        <form
          id="embedding-form"
          onSubmit={handleSubmit}
          className="flex flex-col w-full"
        >
          <PageHeader
            title={t("embedding.title")}
            description={
              <>
                {t("embedding.desc-start")}
                <br />
                {t("embedding.desc-end")}
              </>
            }
          />
          <div className="w-full justify-end flex">
            {hasChanges && (
              <Button size="lg" type="submit" className="mt-3">
                {saving ? t("common.saving") : t("common.save")}
              </Button>
            )}
          </div>
          <div className="text-base font-bold text-theme-text-primary mt-6 mb-4">
            {t("embedding.provider.title")}
          </div>
          <Popover open={searchMenuOpen} onOpenChange={setSearchMenuOpen}>
            <PopoverTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full max-w-[640px] h-[64px] justify-between gap-0 p-[14px] rounded-lg border-2 border-transparent bg-theme-settings-input-bg hover:bg-theme-settings-input-bg hover:border-primary-button aria-expanded:bg-theme-settings-input-bg transition-all duration-300"
                >
                  <div className="flex gap-x-4 items-center">
                    <img
                      src={selectedEmbedderObject.logo}
                      alt={`${selectedEmbedderObject.name} logo`}
                      className="w-10 h-10 rounded-md"
                    />
                    <div className="flex flex-col text-left">
                      <div className="text-sm font-semibold text-theme-text-primary">
                        {selectedEmbedderObject.name}
                      </div>
                      <div className="mt-1 text-xs text-description font-normal">
                        {selectedEmbedderObject.description}
                      </div>
                    </div>
                  </div>
                  <ChevronsUpDown
                    size={24}
                    className="text-theme-text-primary"
                  />
                </Button>
              }
            />
            <PopoverContent
              align="start"
              sideOffset={4}
              className="w-(--anchor-width) max-w-[640px] max-h-[310px] min-h-[64px] flex-col gap-0 rounded-lg bg-theme-settings-input-bg p-0 border-2 border-primary-button"
            >
              <div className="flex items-center border-b border-[#9CA3AF] px-4">
                <Search
                  size={20}
                  className="text-theme-text-primary shrink-0"
                />
                <Input
                  type="text"
                  name="embedder-search"
                  autoComplete="off"
                  placeholder="Search all embedding providers"
                  className="h-[38px] border-0 bg-transparent px-3 shadow-none focus-visible:ring-0 focus-visible:border-0 text-theme-text-primary placeholder:text-theme-text-primary placeholder:font-medium"
                  onChange={(e) => setSearchQuery(e.target.value)}
                  ref={searchInputRef}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") e.preventDefault();
                  }}
                />
                <X
                  size={20}
                  className="cursor-pointer text-theme-text-primary hover:text-x-button shrink-0"
                  onClick={handleXButton}
                />
              </div>
              <div className="flex-1 flex flex-col gap-y-1 overflow-y-auto thin-scrollbar px-2 py-2 max-h-[245px]">
                {filteredEmbedders.map((embedder) => (
                  <EmbedderItem
                    key={embedder.name}
                    name={embedder.name}
                    value={embedder.value}
                    image={embedder.logo}
                    description={embedder.description}
                    checked={selectedEmbedder === embedder.value}
                    onClick={() => updateChoice(embedder.value)}
                  />
                ))}
              </div>
            </PopoverContent>
          </Popover>
          <div
            onChange={() => setHasChanges(true)}
            className="mt-4 flex flex-col gap-y-1"
          >
            {selectedEmbedder &&
              EMBEDDERS.find(
                (embedder) => embedder.value === selectedEmbedder
              )?.options(settings)}
          </div>
        </form>
      )}
      <Dialog
        open={isOpen}
        onOpenChange={(open) => (open ? openModal() : closeModal())}
      >
        <DialogContent>
          <ChangeWarningModal
            warningText="Switching the embedding model will reset all previously embedded documents in all workspaces.\n\nConfirming will clear all embeddings from your vector database and remove all documents from your workspaces. Your uploaded documents will not be deleted, they will be available for re-embedding."
            onClose={closeModal}
            onConfirm={handleSaveSettings}
          />
        </DialogContent>
      </Dialog>
    </SettingsLayout>
  );
}

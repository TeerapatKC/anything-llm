import { useEffect, useState, useRef } from "react";
import SettingsLayout from "@/components/layout/SettingsLayout";
import PageHeader from "@/components/layout/PageHeader";
import { SpinnerBlock } from "@/components/ui/spinner";
import System from "@/models/system";
import showToast from "@/utils/toast";
import AnythingLLMIcon from "@/media/logo/anything-llm-icon.png";
import OpenAiLogo from "@/media/llmprovider/openai.png";
import OllamaLogo from "@/media/llmprovider/ollama.png";
import LemonadeLogo from "@/media/llmprovider/lemonade.png";
import OpenRouterLogo from "@/media/llmprovider/openrouter.jpeg";

import OpenAiOptions from "@/components/ImageGenerationSelection/OpenAiOptions";
import OllamaOptions from "@/components/ImageGenerationSelection/OllamaOptions";
import LemonadeOptions from "@/components/ImageGenerationSelection/LemonadeOptions";
import OpenRouterOptions from "@/components/ImageGenerationSelection/OpenRouterOptions";
import ImageGenerationItem from "@/components/ImageGenerationSelection/ImageGenerationItem";

import { ChevronsUpDown, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useTranslation } from "react-i18next";

const PROVIDERS = [
  {
    name: "OpenAI",
    value: "openai",
    logo: OpenAiLogo,
    options: (settings) => <OpenAiOptions settings={settings} />,
    description: "Generate images with OpenAI's DALL-E and image models.",
  },
  {
    name: "Ollama",
    value: "ollama",
    logo: OllamaLogo,
    options: (settings) => <OllamaOptions settings={settings} />,
    description: "Generate images locally on your own machine (macOS only).",
  },
  {
    name: "Lemonade",
    value: "lemonade",
    logo: LemonadeLogo,
    options: (settings) => <LemonadeOptions settings={settings} />,
    description: "Generate images locally on your own machine using Lemonade.",
  },
  {
    name: "OpenRouter",
    value: "openrouter",
    logo: OpenRouterLogo,
    options: (settings) => <OpenRouterOptions settings={settings} />,
    description: "Generate images from image models on OpenRouter.",
  },
];

export default function ImageGenerationPreference() {
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredProviders, setFilteredProviders] = useState([]);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [searchMenuOpen, setSearchMenuOpen] = useState(false);
  const searchInputRef = useRef(null);
  const { t } = useTranslation();

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setSaving(true);
    const form = document.getElementById("image-generation-form");
    const settingsData = { ImageGenerationProvider: selectedProvider };
    const formData = new FormData(form);
    for (var [key, value] of formData.entries()) settingsData[key] = value;

    const { error } = await System.updateSystem(settingsData);
    if (error) {
      showToast(`Failed to save image generation settings: ${error}`, "error");
      setHasChanges(true);
    } else {
      showToast("Image generation preferences saved successfully.", "success");
      setHasChanges(false);
    }
    setSaving(false);
  };

  const updateChoice = (selection) => {
    setSearchQuery("");
    setSelectedProvider(selection);
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
      setSelectedProvider(_settings?.ImageGenerationProvider || null);
      setLoading(false);
    }
    fetchKeys();
  }, []);

  useEffect(() => {
    setFilteredProviders(
      PROVIDERS.filter((provider) =>
        provider.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    );
  }, [searchQuery, selectedProvider]);

  const selectedProviderObject = PROVIDERS.find(
    (provider) => provider.value === selectedProvider
  );

  return (
    <SettingsLayout>
      {loading ? (
        <SpinnerBlock className="min-h-[60vh]" />
      ) : (
        <form
          id="image-generation-form"
          onSubmit={handleSubmit}
          className="flex flex-col w-full"
        >
          <PageHeader
            title={t("imageGeneration.title")}
            description={t("imageGeneration.description")}
          />
          <div className="w-full justify-end flex">
            {hasChanges && (
              <Button size="lg" type="submit" className="mt-3 mr-0 -mb-14 z-10">
                {saving ? t("common.saving") : t("common.save")}
              </Button>
            )}
          </div>
          <div className="text-base font-bold text-theme-text-primary mt-6 mb-4">
            {t("imageGeneration.provider")}
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
                      src={selectedProviderObject?.logo || AnythingLLMIcon}
                      alt={`${selectedProviderObject?.name} logo`}
                      className="w-10 h-10 rounded-md"
                    />
                    <div className="flex flex-col text-left">
                      <div className="text-sm font-semibold text-theme-text-primary">
                        {selectedProviderObject?.name || "None selected"}
                      </div>
                      <div className="mt-1 text-xs text-description font-normal">
                        {selectedProviderObject?.description ||
                          "You need to select an image generation provider"}
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
                  name="provider-search"
                  autoComplete="off"
                  placeholder="Search image generation providers"
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
                {filteredProviders.map((provider) => (
                  <ImageGenerationItem
                    key={provider.name}
                    name={provider.name}
                    value={provider.value}
                    image={provider.logo}
                    description={provider.description}
                    checked={selectedProvider === provider.value}
                    onClick={() => updateChoice(provider.value)}
                  />
                ))}
              </div>
            </PopoverContent>
          </Popover>
          <div
            onChange={() => setHasChanges(true)}
            className="mt-4 flex flex-col gap-y-1"
          >
            {selectedProvider && selectedProviderObject?.options(settings)}
          </div>
        </form>
      )}
    </SettingsLayout>
  );
}

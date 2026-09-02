import React, { useEffect, useState, useRef } from "react";
import SettingsLayout from "@/components/layout/SettingsLayout";
import PageHeader from "@/components/layout/PageHeader";
import { SpinnerBlock } from "@/components/ui/spinner";
import System from "@/models/system";
import showToast from "@/utils/toast";
import OpenAiLogo from "@/media/llmprovider/openai.png";
import GenericOpenAiLogo from "@/media/llmprovider/generic-openai.png";
import AnythingLLMIcon from "@/media/logo/anything-llm-icon.png";
import OpenAiWhisperOptions from "@/components/TranscriptionSelection/OpenAiOptions";
import GenericOpenAiWhisperOptions from "@/components/TranscriptionSelection/GenericOpenAiOptions";
import NativeTranscriptionOptions from "@/components/TranscriptionSelection/NativeTranscriptionOptions";
import LLMItem from "@/components/LLMSelection/LLMItem";
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
    options: (settings) => <OpenAiWhisperOptions settings={settings} />,
    description: "Leverage the OpenAI Whisper-large model using your API key.",
  },
  {
    name: "OpenAI Compatible",
    value: "generic-openai",
    logo: GenericOpenAiLogo,
    options: (settings) => <GenericOpenAiWhisperOptions settings={settings} />,
    description:
      "Transcribe audio using any OpenAI-compatible API via custom configuration.",
  },
  {
    name: "NexusAI Built-In",
    value: "local",
    logo: AnythingLLMIcon,
    options: (settings) => <NativeTranscriptionOptions settings={settings} />,
    description: "Run a built-in whisper model on this instance privately.",
  },
];

export default function TranscriptionModelPreference() {
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
    e.preventDefault();
    const form = e.target;
    const data = { WhisperProvider: selectedProvider };
    const formData = new FormData(form);

    for (var [key, value] of formData.entries()) data[key] = value;
    const { error } = await System.updateSystem(data);
    setSaving(true);

    if (error) {
      showToast(`Failed to save preferences: ${error}`, "error");
    } else {
      showToast("Transcription preferences saved successfully.", "success");
    }
    setSaving(false);
    setHasChanges(!!error);
  };

  const updateProviderChoice = (selection) => {
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
      setSelectedProvider(_settings?.WhisperProvider || "local");
      setLoading(false);
    }
    fetchKeys();
  }, []);

  useEffect(() => {
    const filtered = PROVIDERS.filter((provider) =>
      provider.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredProviders(filtered);
  }, [searchQuery, selectedProvider]);

  const selectedProviderObject = PROVIDERS.find(
    (provider) => provider.value === selectedProvider
  );

  return (
    <SettingsLayout>
      {loading ? (
        <SpinnerBlock className="min-h-[60vh]" />
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col w-full">
          <PageHeader
            title={t("transcription.title")}
            description={t("transcription.description")}
          />
          <div className="w-full justify-end flex">
            {hasChanges && (
              <Button size="lg" type="submit" className="mt-3">
                {saving ? "Saving..." : "Save changes"}
              </Button>
            )}
          </div>
          <div className="text-base font-bold text-theme-text-primary mt-6 mb-4">
            {t("transcription.provider")}
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
                      src={selectedProviderObject.logo}
                      alt={`${selectedProviderObject.name} logo`}
                      className="w-10 h-10 rounded-md"
                    />
                    <div className="flex flex-col text-left">
                      <div className="text-sm font-semibold text-theme-text-primary">
                        {selectedProviderObject.name}
                      </div>
                      <div className="mt-1 text-xs text-description font-normal">
                        {selectedProviderObject.description}
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
                  placeholder={t("ui.search-transcription-providers")}
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
                  <LLMItem
                    key={provider.name}
                    name={provider.name}
                    value={provider.value}
                    image={provider.logo}
                    description={provider.description}
                    checked={selectedProvider === provider.value}
                    onClick={() => updateProviderChoice(provider.value)}
                  />
                ))}
              </div>
            </PopoverContent>
          </Popover>
          <div
            onChange={() => setHasChanges(true)}
            className="mt-4 flex flex-col gap-y-1"
          >
            {selectedProvider &&
              PROVIDERS.find(
                (provider) => provider.value === selectedProvider
              )?.options(settings)}
          </div>
        </form>
      )}
    </SettingsLayout>
  );
}

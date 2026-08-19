import React, { useEffect, useState, useRef } from "react";
import PageHeader from "@/components/layout/PageHeader";
import System from "@/models/system";
import showToast from "@/utils/toast";
import LLMItem from "@/components/LLMSelection/LLMItem";
import { ChevronsUpDown, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import OpenAiLogo from "@/media/llmprovider/openai.png";
import DeepgramLogo from "@/media/ttsproviders/deepgram.png";
import AnythingLLMIcon from "@/media/logo/anything-llm-icon.png";
import LemonadeLogo from "@/media/llmprovider/lemonade.png";
import GenericOpenAiLogo from "@/media/llmprovider/generic-openai.png";
import GroqLogo from "@/media/llmprovider/groq.png";

import BrowserNative from "@/components/SpeechToText/BrowserNative";
import OpenAiSTTOptions from "@/components/SpeechToText/OpenAiOptions";
import DeepgramSTTOptions from "@/components/SpeechToText/DeepgramOptions";
import LemonadeSTTOptions from "@/components/SpeechToText/LemonadeOptions";
import GenericOpenAiSTTOptions from "@/components/SpeechToText/GenericOpenAiOptions";
import GroqSTTOptions from "@/components/SpeechToText/GroqOptions";

const PROVIDERS = [
  {
    name: "System native",
    value: "native",
    logo: AnythingLLMIcon,
    options: (settings) => <BrowserNative settings={settings} />,
    description: "Uses your browser's built in STT service if supported.",
  },
  {
    name: "OpenAI",
    value: "openai",
    logo: OpenAiLogo,
    options: (settings) => <OpenAiSTTOptions settings={settings} />,
    description: "Use OpenAI's Whisper API to transcribe speech to text.",
  },
  {
    name: "Lemonade",
    value: "lemonade",
    logo: LemonadeLogo,
    options: (settings) => <LemonadeSTTOptions settings={settings} />,
    description: "Transcribe speech via your local Lemonade server.",
  },
  {
    name: "Deepgram",
    value: "deepgram",
    logo: DeepgramLogo,
    options: (settings) => <DeepgramSTTOptions settings={settings} />,
    description: "Transcribe speech using Deepgram's hosted Nova models.",
  },
  {
    name: "Groq",
    value: "groq",
    logo: GroqLogo,
    options: (settings) => <GroqSTTOptions settings={settings} />,
    description: "Transcribe speech using Groq's hosted models.",
  },
  {
    name: "Generic OpenAI",
    value: "generic-openai",
    logo: GenericOpenAiLogo,
    options: (settings) => <GenericOpenAiSTTOptions settings={settings} />,
    description:
      "Connect to any OpenAI-compatible STT service via a custom configuration.",
  },
];

export default function SpeechToTextProvider({ settings }) {
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredProviders, setFilteredProviders] = useState([]);
  const [selectedProvider, setSelectedProvider] = useState(
    settings?.SpeechToTextProvider || "native"
  );
  const [searchMenuOpen, setSearchMenuOpen] = useState(false);
  const searchInputRef = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const form = e.target;
    const data = { SpeechToTextProvider: selectedProvider };
    const formData = new FormData(form);

    for (var [key, value] of formData.entries()) data[key] = value;
    const { error } = await System.updateSystem(data);
    setSaving(true);

    if (error) {
      showToast(`Failed to save preferences: ${error}`, "error");
    } else {
      showToast("Speech-to-text preferences saved successfully.", "success");
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
    const filtered = PROVIDERS.filter((provider) =>
      provider.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredProviders(filtered);
  }, [searchQuery, selectedProvider]);

  const selectedProviderObject = PROVIDERS.find(
    (provider) => provider.value === selectedProvider
  );

  return (
    <form onSubmit={handleSubmit} className="flex w-full">
      <div className="flex flex-col w-full px-1 py-16 md:px-6 md:py-6">
        <PageHeader
          title={"Speech-to-text Preference"}
          description={
            "Here you can specify what kind of text-to-speech and speech-to-text providers you would want to use in your AnythingLLM experience. By default, we use the browser's built in support for these services, but you may want to use others."
          }
        />
        <div className="w-full justify-end flex">
          {hasChanges && (
            <Button size="lg" type="submit" className="mt-3 mr-0 -mb-14 z-10">
              {saving ? "Saving..." : "Save changes"}
            </Button>
          )}
        </div>
        <div className="text-base font-bold text-theme-text-primary mt-6 mb-4">
          Provider
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
                <ChevronsUpDown size={24} className="text-theme-text-primary" />
              </Button>
            }
          />
          <PopoverContent
            align="start"
            sideOffset={4}
            className="w-(--anchor-width) max-w-[640px] max-h-[310px] min-h-[64px] flex-col gap-0 rounded-lg bg-theme-settings-input-bg p-0 border-2 border-primary-button"
          >
            <div className="flex items-center border-b border-[#9CA3AF] px-4">
              <Search size={20} className="text-theme-text-primary shrink-0" />
              <Input
                type="text"
                name="stt-provider-search"
                autoComplete="off"
                placeholder="Search speech to text providers"
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
      </div>
    </form>
  );
}

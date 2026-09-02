import { useTranslation } from "react-i18next";
import React, { useEffect, useRef, useState } from "react";
import Admin from "@/models/admin";
import SerpApiIcon from "./icons/serpapi.png";
import SearchApiIcon from "./icons/searchapi.png";
import SerperDotDevIcon from "./icons/serper.png";
import BingSearchIcon from "./icons/bing.png";
import BaiduSearchIcon from "./icons/baidu.png";
import SerplySearchIcon from "./icons/serply.png";
import SearXNGSearchIcon from "./icons/searxng.png";
import TavilySearchIcon from "./icons/tavily.svg";
import DuckDuckGoIcon from "./icons/duckduckgo.png";
import ExaIcon from "./icons/exa.png";
import PerplexitySearchIcon from "./icons/perplexity.png";
import BraveSearchIcon from "./icons/brave.png";
import CrwSearchIcon from "./icons/crw.png";
import YouSearchIcon from "./icons/you.png";
import { ChevronsUpDown, ListFilter, Search, X } from "lucide-react";
import Toggle from "@/components/lib/Toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import SearchProviderItem from "./SearchProviderItem";
import WebSearchImage from "@/media/agents/scrape-websites.png";
import {
  SerpApiOptions,
  SearchApiOptions,
  SerperDotDevOptions,
  BingSearchOptions,
  BaiduSearchOptions,
  SerplySearchOptions,
  SearXNGOptions,
  TavilySearchOptions,
  DuckDuckGoOptions,
  ExaSearchOptions,
  PerplexitySearchOptions,
  BraveSearchOptions,
  CrwSearchOptions,
  YouSearchOptions,
} from "./SearchProviderOptions";

// Exported so the per-workspace agent settings can offer the same engines
// without duplicating the list (their API keys stay instance-wide).
export const SEARCH_PROVIDERS = [
  {
    name: "DuckDuckGo",
    value: "duckduckgo-engine",
    logo: DuckDuckGoIcon,
    options: () => <DuckDuckGoOptions />,
    description: "Free and privacy-focused web search using DuckDuckGo.",
  },
  {
    name: "Brave Search",
    value: "brave-search",
    logo: BraveSearchIcon,
    options: (settings) => <BraveSearchOptions settings={settings} />,
    description: "Web search powered by the Brave Search API.",
  },
  {
    name: "SerpApi",
    value: "serpapi",
    logo: SerpApiIcon,
    options: (settings) => <SerpApiOptions settings={settings} />,
    description:
      "Scrape Google and several other search engines with SerpApi. 250 free searches every month, and then paid.",
  },
  {
    name: "SearchApi",
    value: "searchapi",
    logo: SearchApiIcon,
    options: (settings) => <SearchApiOptions settings={settings} />,
    description:
      "SearchApi delivers structured data from multiple search engines. Free for 100 queries, but then paid. ",
  },
  {
    name: "Serper.dev",
    value: "serper-dot-dev",
    logo: SerperDotDevIcon,
    options: (settings) => <SerperDotDevOptions settings={settings} />,
    description:
      "Serper.dev web-search. Free account with a 2,500 calls, but then paid.",
  },
  {
    name: "Bing Search",
    value: "bing-search",
    logo: BingSearchIcon,
    options: (settings) => <BingSearchOptions settings={settings} />,
    description: "Web search powered by the Bing Search API (paid service).",
  },
  {
    name: "Baidu Search",
    value: "baidu-search",
    logo: BaiduSearchIcon,
    options: (settings) => <BaiduSearchOptions settings={settings} />,
    description:
      "Web search powered by Baidu Search for stronger zh-CN retrieval.",
  },
  {
    name: "Serply.io",
    value: "serply-engine",
    logo: SerplySearchIcon,
    options: (settings) => <SerplySearchOptions settings={settings} />,
    description:
      "Serply.io web-search. Free account with a 100 calls/month forever.",
  },
  {
    name: "SearXNG",
    value: "searxng-engine",
    logo: SearXNGSearchIcon,
    options: (settings) => <SearXNGOptions settings={settings} />,
    description:
      "Free, open-source, internet meta-search engine with no tracking.",
  },
  {
    name: "Tavily Search",
    value: "tavily-search",
    logo: TavilySearchIcon,
    options: (settings) => <TavilySearchOptions settings={settings} />,
    description:
      "Tavily Search API. Offers a free tier with 1000 queries per month.",
  },
  {
    name: "Exa Search",
    value: "exa-search",
    logo: ExaIcon,
    options: (settings) => <ExaSearchOptions settings={settings} />,
    description:
      "One of the best web search APIs for AI agents with real-time results and full page contents.",
  },
  {
    name: "Perplexity Search",
    value: "perplexity-search",
    logo: PerplexitySearchIcon,
    options: (settings) => <PerplexitySearchOptions settings={settings} />,
    description: "AI-powered web search using the Perplexity Search API.",
  },
  {
    name: "fastCRW Search",
    value: "crw-search",
    logo: CrwSearchIcon,
    options: (settings) => <CrwSearchOptions settings={settings} />,
    description: "Open-source, self-hostable Firecrawl/Tavily alternative.",
  },
  {
    name: "You.com Search",
    value: "you-search",
    logo: YouSearchIcon,
    options: (settings) => <YouSearchOptions settings={settings} />,
    description: "LLM-ready web search. Optional API key for higher limits.",
  },
];

export default function AgentWebSearchSelection({
  skill,
  title,
  description,
  settings,
  toggleSkill,
  enabled = false,
  setHasChanges,
}) {
  const { t } = useTranslation();
  const searchInputRef = useRef(null);
  const [filteredResults, setFilteredResults] = useState([]);
  const [selectedProvider, setSelectedProvider] = useState("duckduckgo-engine");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMenuOpen, setSearchMenuOpen] = useState(false);

  function updateChoice(selection) {
    setSearchQuery("");
    setSelectedProvider(selection);
    setSearchMenuOpen(false);
    setHasChanges(true);
  }

  function handleXButton() {
    if (searchQuery.length > 0) {
      setSearchQuery("");
      if (searchInputRef.current) searchInputRef.current.value = "";
    } else {
      setSearchMenuOpen(!searchMenuOpen);
    }
  }

  useEffect(() => {
    const filtered = SEARCH_PROVIDERS.filter((provider) =>
      provider.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredResults(filtered);
  }, [searchQuery, selectedProvider]);

  useEffect(() => {
    Admin.systemPreferencesByFields(["agent_search_provider"])
      .then((res) =>
        setSelectedProvider(
          res?.settings?.agent_search_provider ?? "duckduckgo-engine"
        )
      )
      .catch(() => setSelectedProvider("duckduckgo-engine"));
  }, []);

  const selectedSearchProviderObject =
    SEARCH_PROVIDERS.find((provider) => provider.value === selectedProvider) ??
    SEARCH_PROVIDERS[1];

  return (
    <div className="p-2">
      <div className="flex flex-col gap-y-[18px] max-w-[500px]">
        <div className="flex w-full justify-between items-center">
          <div className="flex items-center gap-x-2">
            <ListFilter size={24} color="var(--theme-text-primary)" />
            <label
              htmlFor="name"
              className="text-theme-text-primary text-md font-bold"
            >
              {title}
            </label>
          </div>
          <Toggle
            size="lg"
            enabled={enabled}
            onChange={() => toggleSkill(skill)}
          />
        </div>
        <img
          src={WebSearchImage}
          alt="Web Search"
          className="w-full rounded-md"
        />
        <p className="text-theme-text-secondary/60 text-xs font-medium py-1.5">
          {description}
        </p>
        <div hidden={!enabled}>
          <input
            type="hidden"
            name="system::agent_search_provider"
            value={selectedProvider}
          />
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
                      src={selectedSearchProviderObject.logo}
                      alt={`${selectedSearchProviderObject.name} logo`}
                      className="w-10 h-10 rounded-md"
                    />
                    <div className="flex flex-col text-left">
                      <div className="text-sm font-semibold text-theme-text-primary">
                        {selectedSearchProviderObject.name}
                      </div>
                      <div className="mt-1 text-xs text-description font-normal">
                        {selectedSearchProviderObject.description}
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
                  name="web-provider-search"
                  autoComplete="off"
                  placeholder={t("ui.search-web-search-providers")}
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
                {filteredResults.map((provider) => {
                  return (
                    <SearchProviderItem
                      provider={provider}
                      key={provider.name}
                      checked={selectedProvider === provider.value}
                      onClick={() => updateChoice(provider.value)}
                    />
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>
          <div className="mt-4 flex flex-col gap-y-1">
            {selectedSearchProviderObject.options(settings)}
          </div>
        </div>
      </div>
    </div>
  );
}

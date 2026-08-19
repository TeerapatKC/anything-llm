import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
const SerpApiEngines = [
  { name: "Google Search", value: "google" },
  { name: "Google Images", value: "google_images_light" },
  { name: "Google Jobs", value: "google_jobs" },
  { name: "Google Maps", value: "google_maps" },
  { name: "Google News", value: "google_news_light" },
  { name: "Google Patents", value: "google_patents" },
  { name: "Google Scholar", value: "google_scholar" },
  { name: "Google Shopping", value: "google_shopping_light" },
  { name: "Amazon", value: "amazon" },
  { name: "Baidu", value: "baidu" },
];
export function SerpApiOptions({ settings }) {
  return (
    <>
      <p className="text-sm text-theme-text-secondary my-2">
        Get a free API key{" "}
        <a
          href="https://serpapi.com/"
          target="_blank"
          rel="noreferrer"
          className="text-blue-300 underline"
        >
          from SerpApi.
        </a>
      </p>
      <div className="flex gap-x-4">
        <div className="flex flex-col w-60">
          <Label className="block mb-3">API Key</Label>
          <Input
            type="password"
            name="env::AgentSerpApiKey"
            placeholder="SerpApi API Key"
            defaultValue={settings?.AgentSerpApiKey ? "*".repeat(20) : ""}
            required={true}
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        <div className="flex flex-col w-60">
          <Label className="block mb-3">Engine</Label>
          <Select
            name="env::AgentSerpApiEngine"
            required={true}
            defaultValue={settings?.AgentSerpApiEngine || "google"}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select an option" />
            </SelectTrigger>
            <SelectContent>
              {SerpApiEngines.map(({ name, value }) => (
                <SelectItem key={name} value={value}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {/* <input
            type="text"
            name="env::AgentSerpApiEngine"
            className="border-none bg-theme-settings-input-bg text-theme-text-primary placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
            placeholder="SerpApi engine (Google, Amazon...)"
            defaultValue={settings?.AgentSerpApiEngine || "google"}
            required={true}
            autoComplete="off"
            spellCheck={false}
          /> */}
        </div>
      </div>
    </>
  );
}

const SearchApiEngines = [
  { name: "Google Search", value: "google" },
  { name: "Google Maps", value: "google_maps" },
  { name: "Google Shopping", value: "google_shopping" },
  { name: "Google News", value: "google_news" },
  { name: "Google Jobs", value: "google_jobs" },
  { name: "Google Scholar", value: "google_scholar" },
  { name: "Google Finance", value: "google_finance" },
  { name: "Google Patents", value: "google_patents" },
  { name: "YouTube", value: "youtube" },
  { name: "Bing", value: "bing" },
  { name: "Bing News", value: "bing_news" },
  { name: "Amazon Product Search", value: "amazon_search" },
  { name: "Baidu", value: "baidu" },
];
export function SearchApiOptions({ settings }) {
  return (
    <>
      <p className="text-sm text-theme-text-secondary my-2">
        You can get a free API key{" "}
        <a
          href="https://www.searchapi.io/"
          target="_blank"
          rel="noreferrer"
          className="text-blue-300 underline"
        >
          from SearchApi.
        </a>
      </p>
      <div className="flex gap-x-4">
        <div className="flex flex-col w-60">
          <Label className="block mb-3">API Key</Label>
          <Input
            type="password"
            name="env::AgentSearchApiKey"
            placeholder="SearchApi API Key"
            defaultValue={settings?.AgentSearchApiKey ? "*".repeat(20) : ""}
            required={true}
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        <div className="flex flex-col w-60">
          <Label className="block mb-3">Engine</Label>
          <Select
            name="env::AgentSearchApiEngine"
            required={true}
            defaultValue={settings?.AgentSearchApiEngine || "google"}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select an option" />
            </SelectTrigger>
            <SelectContent>
              {SearchApiEngines.map(({ name, value }) => (
                <SelectItem key={name} value={value}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {/* <input
            type="text"
            name="env::AgentSearchApiEngine"
            className="border-none bg-theme-settings-input-bg text-theme-text-primary placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
            placeholder="SearchApi engine (Google, Bing...)"
            defaultValue={settings?.AgentSearchApiEngine || "google"}
            required={true}
            autoComplete="off"
            spellCheck={false}
          /> */}
        </div>
      </div>
    </>
  );
}

export function SerperDotDevOptions({ settings }) {
  return (
    <>
      <p className="text-sm text-theme-text-secondary my-2">
        You can get a free API key{" "}
        <a
          href="https://serper.dev"
          target="_blank"
          rel="noreferrer"
          className="text-blue-300 underline"
        >
          from Serper.dev.
        </a>
      </p>
      <div className="flex gap-x-4">
        <div className="flex flex-col w-60">
          <Label className="block mb-3">API Key</Label>
          <Input
            type="password"
            name="env::AgentSerperApiKey"
            placeholder="Serper.dev API Key"
            defaultValue={settings?.AgentSerperApiKey ? "*".repeat(20) : ""}
            required={true}
            autoComplete="off"
            spellCheck={false}
          />
        </div>
      </div>
    </>
  );
}

export function BingSearchOptions({ settings }) {
  return (
    <>
      <p className="text-sm text-theme-text-secondary my-2">
        You can get a Bing Web Search API subscription key{" "}
        <a
          href="https://portal.azure.com/"
          target="_blank"
          rel="noreferrer"
          className="text-blue-300 underline"
        >
          from the Azure portal.
        </a>
      </p>
      <div className="flex gap-x-4">
        <div className="flex flex-col w-60">
          <Label className="block mb-3">API Key</Label>
          <Input
            type="password"
            name="env::AgentBingSearchApiKey"
            placeholder="Bing Web Search API Key"
            defaultValue={settings?.AgentBingSearchApiKey ? "*".repeat(20) : ""}
            required={true}
            autoComplete="off"
            spellCheck={false}
          />
        </div>
      </div>
      <p className="text-sm text-theme-text-secondary my-2">
        To set up a Bing Web Search API subscription:
      </p>
      <ol className="list-decimal text-sm text-theme-text-secondary ml-6">
        <li>
          Go to the Azure portal:{" "}
          <a
            href="https://portal.azure.com/"
            target="_blank"
            rel="noreferrer"
            className="text-blue-300 underline"
          >
            https://portal.azure.com/
          </a>
        </li>
        <li>Create a new Azure account or sign in with an existing one.</li>
        <li>
          Navigate to the "Create a resource" section and search for "Grounding
          with Bing Search".
        </li>
        <li>
          Select the "Grounding with Bing Search" resource and create a new
          subscription.
        </li>
        <li>Choose the pricing tier that suits your needs.</li>
        <li>
          Obtain the API key for your Grounding with Bing Search subscription.
        </li>
      </ol>
    </>
  );
}

export function BaiduSearchOptions({ settings }) {
  return (
    <>
      <p className="text-sm text-theme-text-secondary my-2">
        You can get an API key{" "}
        <a
          href="https://cloud.baidu.com/doc/qianfan-api/s/Wmbq4z7e5"
          target="_blank"
          rel="noreferrer"
          className="text-blue-300 underline"
        >
          from Baidu AI Cloud Qianfan.
        </a>
      </p>
      <div className="flex gap-x-4">
        <div className="flex flex-col w-60">
          <Label className="block mb-3">API Key</Label>
          <Input
            type="password"
            name="env::AgentBaiduSearchApiKey"
            placeholder="Baidu Search API Key"
            defaultValue={
              settings?.AgentBaiduSearchApiKey ? "*".repeat(20) : ""
            }
            required={true}
            autoComplete="off"
            spellCheck={false}
          />
        </div>
      </div>
    </>
  );
}

export function SerplySearchOptions({ settings }) {
  return (
    <>
      <p className="text-sm text-theme-text-secondary my-2">
        You can get a free API key{" "}
        <a
          href="https://serply.io"
          target="_blank"
          rel="noreferrer"
          className="text-blue-300 underline"
        >
          from Serply.io.
        </a>
      </p>
      <div className="flex gap-x-4">
        <div className="flex flex-col w-60">
          <Label className="block mb-3">API Key</Label>
          <Input
            type="password"
            name="env::AgentSerplyApiKey"
            placeholder="Serply API Key"
            defaultValue={settings?.AgentSerplyApiKey ? "*".repeat(20) : ""}
            required={true}
            autoComplete="off"
            spellCheck={false}
          />
        </div>
      </div>
    </>
  );
}

export function SearXNGOptions({ settings }) {
  return (
    <div className="flex gap-x-4">
      <div className="flex flex-col w-60">
        <Label className="block mb-3">SearXNG API Base URL</Label>
        <Input
          type="url"
          name="env::AgentSearXNGApiUrl"
          placeholder="SearXNG API Base URL"
          defaultValue={settings?.AgentSearXNGApiUrl}
          required={true}
          autoComplete="off"
          spellCheck={false}
        />
      </div>
    </div>
  );
}

export function TavilySearchOptions({ settings }) {
  return (
    <>
      <p className="text-sm text-theme-text-secondary my-2">
        You can get an API key{" "}
        <a
          href="https://tavily.com/"
          target="_blank"
          rel="noreferrer"
          className="text-blue-300 underline"
        >
          from Tavily.
        </a>
      </p>
      <div className="flex gap-x-4">
        <div className="flex flex-col w-60">
          <Label className="block mb-3">API Key</Label>
          <Input
            type="password"
            name="env::AgentTavilyApiKey"
            placeholder="Tavily API Key"
            defaultValue={settings?.AgentTavilyApiKey ? "*".repeat(20) : ""}
            required={true}
            autoComplete="off"
            spellCheck={false}
          />
        </div>
      </div>
    </>
  );
}

export function CrwSearchOptions({ settings }) {
  return (
    <>
      <p className="text-sm text-theme-text-secondary my-2">
        You can get an API key{" "}
        <a
          href="https://fastcrw.com/"
          target="_blank"
          rel="noreferrer"
          className="text-blue-300 underline"
        >
          from fastCRW.
        </a>
        You can also{" "}
        <a
          href="https://github.com/us/crw"
          target="_blank"
          rel="noreferrer"
          className="text-blue-300 underline"
        >
          self-host.
        </a>
      </p>
      <div className="flex gap-x-4">
        <div className="flex flex-col w-60">
          <Label className="block mb-3">API Key</Label>
          <Input
            type="password"
            name="env::AgentCrwApiKey"
            placeholder="fastCRW API Key"
            defaultValue={settings?.AgentCrwApiKey ? "*".repeat(20) : ""}
            required={true}
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        <div className="flex flex-col w-60">
          <Label className="block mb-3">Base URL (optional)</Label>
          <Input
            type="url"
            name="env::AgentCrwApiUrl"
            placeholder="https://fastcrw.com/api"
            defaultValue={settings?.AgentCrwApiUrl}
            autoComplete="off"
            spellCheck={false}
          />
        </div>
      </div>
    </>
  );
}

export function DuckDuckGoOptions() {
  return (
    <>
      <p className="text-sm text-theme-text-secondary my-2">
        DuckDuckGo is ready to use without any additional configuration.
      </p>
    </>
  );
}

export function ExaSearchOptions({ settings }) {
  return (
    <>
      <p className="text-sm text-theme-text-secondary my-2">
        You can get an API key{" "}
        <a
          href="https://exa.ai"
          target="_blank"
          rel="noreferrer"
          className="text-blue-300 underline"
        >
          from Exa.
        </a>
      </p>
      <div className="flex gap-x-4">
        <div className="flex flex-col w-60">
          <Label className="block mb-3">API Key</Label>
          <Input
            type="password"
            name="env::AgentExaApiKey"
            placeholder="Exa API Key"
            defaultValue={settings?.AgentExaApiKey ? "*".repeat(20) : ""}
            required={true}
            autoComplete="off"
            spellCheck={false}
          />
        </div>
      </div>
    </>
  );
}

export function PerplexitySearchOptions({ settings }) {
  return (
    <>
      <p className="text-sm text-theme-text-secondary my-2">
        You can get an API key{" "}
        <a
          href="https://console.perplexity.ai"
          target="_blank"
          rel="noreferrer"
          className="text-blue-300 underline"
        >
          from Perplexity.
        </a>
      </p>
      <div className="flex gap-x-4">
        <div className="flex flex-col w-60">
          <Label className="block mb-3">API Key</Label>
          <Input
            type="password"
            name="env::AgentPerplexityApiKey"
            placeholder="Perplexity API Key"
            defaultValue={settings?.AgentPerplexityApiKey ? "*".repeat(20) : ""}
            required={true}
            autoComplete="off"
            spellCheck={false}
          />
        </div>
      </div>
    </>
  );
}

export function BraveSearchOptions({ settings }) {
  return (
    <>
      <p className="text-sm text-theme-text-secondary my-2">
        You can get an API key{" "}
        <a
          href="https://brave.com/search/api"
          target="_blank"
          rel="noreferrer"
          className="text-blue-300 underline"
        >
          from Brave.
        </a>
      </p>
      <div className="flex gap-x-4">
        <div className="flex flex-col w-60">
          <Label className="block mb-3">API Key</Label>
          <Input
            type="password"
            name="env::AgentBraveApiKey"
            placeholder="Brave API Key"
            defaultValue={settings?.AgentBraveApiKey ? "*".repeat(20) : ""}
            required={true}
            autoComplete="off"
            spellCheck={false}
          />
        </div>
      </div>
    </>
  );
}

export function YouSearchOptions({ settings }) {
  return (
    <>
      <p className="text-sm text-theme-text-secondary my-2">
        You.com works without an API key (free tier, IP rate-limited). For
        higher limits, get an API key{" "}
        <a
          href="https://you.com/platform"
          target="_blank"
          rel="noreferrer"
          className="text-blue-300 underline"
        >
          from You.com
        </a>
        .
      </p>
      <div className="flex gap-x-4">
        <div className="flex flex-col w-60">
          <Label className="block mb-3">API Key (optional)</Label>
          <Input
            type="password"
            name="env::AgentYouApiKey"
            placeholder="You.com API Key"
            defaultValue={settings?.AgentYouApiKey ? "*".repeat(20) : ""}
            required={false}
            autoComplete="off"
            spellCheck={false}
          />
        </div>
      </div>
    </>
  );
}

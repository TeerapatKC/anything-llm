import { Trans, useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  return (
    <>
      <p className="text-sm text-theme-text-secondary my-2">
        <Trans
          i18nKey="web-search.get-free-key"
          values={{ provider: "SerpApi" }}
          components={{
            a: (
              <a
                href="https://serpapi.com/"
                target="_blank"
                rel="noreferrer"
                className="text-blue-300 underline"
              />
            ),
          }}
        />
      </p>
      <div className="flex gap-x-4">
        <div className="flex flex-col w-60">
          <Label className="block mb-3">{t("provider-options.api-key")}</Label>
          <Input
            type="password"
            name="env::AgentSerpApiKey"
            placeholder={t("web-search.api-key-placeholder", {
              provider: "SerpApi",
            })}
            defaultValue={settings?.AgentSerpApiKey ? "*".repeat(20) : ""}
            required={true}
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        <div className="flex flex-col w-60">
          <Label className="block mb-3">{t("web-search.engine")}</Label>
          <Select
            name="env::AgentSerpApiEngine"
            required={true}
            defaultValue={settings?.AgentSerpApiEngine || "google"}
          >
            <SelectTrigger>
              <SelectValue placeholder={t("provider-options.select-option")} />
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
  const { t } = useTranslation();
  return (
    <>
      <p className="text-sm text-theme-text-secondary my-2">
        <Trans
          i18nKey="web-search.get-free-key"
          values={{ provider: "SearchApi" }}
          components={{
            a: (
              <a
                href="https://www.searchapi.io/"
                target="_blank"
                rel="noreferrer"
                className="text-blue-300 underline"
              />
            ),
          }}
        />
      </p>
      <div className="flex gap-x-4">
        <div className="flex flex-col w-60">
          <Label className="block mb-3">{t("provider-options.api-key")}</Label>
          <Input
            type="password"
            name="env::AgentSearchApiKey"
            placeholder={t("web-search.api-key-placeholder", {
              provider: "SearchApi",
            })}
            defaultValue={settings?.AgentSearchApiKey ? "*".repeat(20) : ""}
            required={true}
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        <div className="flex flex-col w-60">
          <Label className="block mb-3">{t("web-search.engine")}</Label>
          <Select
            name="env::AgentSearchApiEngine"
            required={true}
            defaultValue={settings?.AgentSearchApiEngine || "google"}
          >
            <SelectTrigger>
              <SelectValue placeholder={t("provider-options.select-option")} />
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
  const { t } = useTranslation();
  return (
    <>
      <p className="text-sm text-theme-text-secondary my-2">
        <Trans
          i18nKey="web-search.get-free-key"
          values={{ provider: "Serper.dev" }}
          components={{
            a: (
              <a
                href="https://serper.dev"
                target="_blank"
                rel="noreferrer"
                className="text-blue-300 underline"
              />
            ),
          }}
        />
      </p>
      <div className="flex gap-x-4">
        <div className="flex flex-col w-60">
          <Label className="block mb-3">{t("provider-options.api-key")}</Label>
          <Input
            type="password"
            name="env::AgentSerperApiKey"
            placeholder={t("web-search.api-key-placeholder", {
              provider: "Serper.dev",
            })}
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
  const { t } = useTranslation();
  return (
    <>
      <p className="text-sm text-theme-text-secondary my-2">
        <Trans
          i18nKey="web-search.bing-key"
          components={{
            a: (
              <a
                href="https://portal.azure.com/"
                target="_blank"
                rel="noreferrer"
                className="text-blue-300 underline"
              />
            ),
          }}
        />
      </p>
      <div className="flex gap-x-4">
        <div className="flex flex-col w-60">
          <Label className="block mb-3">{t("provider-options.api-key")}</Label>
          <Input
            type="password"
            name="env::AgentBingSearchApiKey"
            placeholder={t("web-search.api-key-placeholder", {
              provider: "Bing Web Search",
            })}
            defaultValue={settings?.AgentBingSearchApiKey ? "*".repeat(20) : ""}
            required={true}
            autoComplete="off"
            spellCheck={false}
          />
        </div>
      </div>
      <p className="text-sm text-theme-text-secondary my-2">
        {t("web-search.bing-steps-title")}
      </p>
      <ol className="list-decimal text-sm text-theme-text-secondary ml-6">
        <li>
          {t("web-search.bing-step-1")}{" "}
          <a
            href="https://portal.azure.com/"
            target="_blank"
            rel="noreferrer"
            className="text-blue-300 underline"
          >
            https://portal.azure.com/
          </a>
        </li>
        <li>{t("web-search.bing-step-2")}</li>
        <li>{t("web-search.bing-step-3")}</li>
        <li>{t("web-search.bing-step-4")}</li>
        <li>{t("web-search.bing-step-5")}</li>
        <li>{t("web-search.bing-step-6")}</li>
      </ol>
    </>
  );
}

export function BaiduSearchOptions({ settings }) {
  const { t } = useTranslation();
  return (
    <>
      <p className="text-sm text-theme-text-secondary my-2">
        <Trans
          i18nKey="web-search.get-key"
          values={{ provider: "Baidu AI Cloud Qianfan" }}
          components={{
            a: (
              <a
                href="https://cloud.baidu.com/doc/qianfan-api/s/Wmbq4z7e5"
                target="_blank"
                rel="noreferrer"
                className="text-blue-300 underline"
              />
            ),
          }}
        />
      </p>
      <div className="flex gap-x-4">
        <div className="flex flex-col w-60">
          <Label className="block mb-3">{t("provider-options.api-key")}</Label>
          <Input
            type="password"
            name="env::AgentBaiduSearchApiKey"
            placeholder={t("web-search.api-key-placeholder", {
              provider: "Baidu Search",
            })}
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
  const { t } = useTranslation();
  return (
    <>
      <p className="text-sm text-theme-text-secondary my-2">
        <Trans
          i18nKey="web-search.get-free-key"
          values={{ provider: "Serply.io" }}
          components={{
            a: (
              <a
                href="https://serply.io"
                target="_blank"
                rel="noreferrer"
                className="text-blue-300 underline"
              />
            ),
          }}
        />
      </p>
      <div className="flex gap-x-4">
        <div className="flex flex-col w-60">
          <Label className="block mb-3">{t("provider-options.api-key")}</Label>
          <Input
            type="password"
            name="env::AgentSerplyApiKey"
            placeholder={t("web-search.api-key-placeholder", {
              provider: "Serply",
            })}
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
  const { t } = useTranslation();
  return (
    <div className="flex gap-x-4">
      <div className="flex flex-col w-60">
        <Label className="block mb-3">{t("web-search.searxng-base-url")}</Label>
        <Input
          type="url"
          name="env::AgentSearXNGApiUrl"
          placeholder={t("web-search.searxng-base-url")}
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
  const { t } = useTranslation();
  return (
    <>
      <p className="text-sm text-theme-text-secondary my-2">
        <Trans
          i18nKey="web-search.get-key"
          values={{ provider: "Tavily" }}
          components={{
            a: (
              <a
                href="https://tavily.com/"
                target="_blank"
                rel="noreferrer"
                className="text-blue-300 underline"
              />
            ),
          }}
        />
      </p>
      <div className="flex gap-x-4">
        <div className="flex flex-col w-60">
          <Label className="block mb-3">{t("provider-options.api-key")}</Label>
          <Input
            type="password"
            name="env::AgentTavilyApiKey"
            placeholder={t("web-search.api-key-placeholder", {
              provider: "Tavily",
            })}
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
  const { t } = useTranslation();
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
        <Trans
          i18nKey="web-search.crw-self-host"
          components={{
            a: (
              <a
                href="https://github.com/us/crw"
                target="_blank"
                rel="noreferrer"
                className="text-blue-300 underline"
              />
            ),
          }}
        />
      </p>
      <div className="flex gap-x-4">
        <div className="flex flex-col w-60">
          <Label className="block mb-3">{t("provider-options.api-key")}</Label>
          <Input
            type="password"
            name="env::AgentCrwApiKey"
            placeholder={t("web-search.api-key-placeholder", {
              provider: "fastCRW",
            })}
            defaultValue={settings?.AgentCrwApiKey ? "*".repeat(20) : ""}
            required={true}
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        <div className="flex flex-col w-60">
          <Label className="block mb-3">
            {t("web-search.base-url-optional")}
          </Label>
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
  const { t } = useTranslation();
  return (
    <>
      <p className="text-sm text-theme-text-secondary my-2">
        {t("web-search.duckduckgo-ready")}
      </p>
    </>
  );
}

export function ExaSearchOptions({ settings }) {
  const { t } = useTranslation();
  return (
    <>
      <p className="text-sm text-theme-text-secondary my-2">
        <Trans
          i18nKey="web-search.get-key"
          values={{ provider: "Exa" }}
          components={{
            a: (
              <a
                href="https://exa.ai"
                target="_blank"
                rel="noreferrer"
                className="text-blue-300 underline"
              />
            ),
          }}
        />
      </p>
      <div className="flex gap-x-4">
        <div className="flex flex-col w-60">
          <Label className="block mb-3">{t("provider-options.api-key")}</Label>
          <Input
            type="password"
            name="env::AgentExaApiKey"
            placeholder={t("web-search.api-key-placeholder", {
              provider: "Exa",
            })}
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
  const { t } = useTranslation();
  return (
    <>
      <p className="text-sm text-theme-text-secondary my-2">
        <Trans
          i18nKey="web-search.get-key"
          values={{ provider: "Perplexity" }}
          components={{
            a: (
              <a
                href="https://console.perplexity.ai"
                target="_blank"
                rel="noreferrer"
                className="text-blue-300 underline"
              />
            ),
          }}
        />
      </p>
      <div className="flex gap-x-4">
        <div className="flex flex-col w-60">
          <Label className="block mb-3">{t("provider-options.api-key")}</Label>
          <Input
            type="password"
            name="env::AgentPerplexityApiKey"
            placeholder={t("web-search.api-key-placeholder", {
              provider: "Perplexity",
            })}
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
  const { t } = useTranslation();
  return (
    <>
      <p className="text-sm text-theme-text-secondary my-2">
        <Trans
          i18nKey="web-search.get-key"
          values={{ provider: "Brave" }}
          components={{
            a: (
              <a
                href="https://brave.com/search/api"
                target="_blank"
                rel="noreferrer"
                className="text-blue-300 underline"
              />
            ),
          }}
        />
      </p>
      <div className="flex gap-x-4">
        <div className="flex flex-col w-60">
          <Label className="block mb-3">{t("provider-options.api-key")}</Label>
          <Input
            type="password"
            name="env::AgentBraveApiKey"
            placeholder={t("web-search.api-key-placeholder", {
              provider: "Brave",
            })}
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
  const { t } = useTranslation();
  return (
    <>
      <p className="text-sm text-theme-text-secondary my-2">
        <Trans
          i18nKey="web-search.you-notice"
          components={{
            a: (
              <a
                href="https://you.com/platform"
                target="_blank"
                rel="noreferrer"
                className="text-blue-300 underline"
              />
            ),
          }}
        />
      </p>
      <div className="flex gap-x-4">
        <div className="flex flex-col w-60">
          <Label className="block mb-3">
            {t("provider-options.api-key-optional")}
          </Label>
          <Input
            type="password"
            name="env::AgentYouApiKey"
            placeholder={t("web-search.api-key-placeholder", {
              provider: "You.com",
            })}
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

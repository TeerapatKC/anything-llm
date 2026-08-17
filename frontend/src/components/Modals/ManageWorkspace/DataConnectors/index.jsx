import ConnectorImages from "@/components/DataConnectorOption/media";
import { Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import GithubOptions from "./Connectors/Github";
import GitlabOptions from "./Connectors/Gitlab";
import GiteaOptions from "./Connectors/Gitea";
import YoutubeOptions from "./Connectors/Youtube";
import ConfluenceOptions from "./Connectors/Confluence";
import DrupalWikiOptions from "./Connectors/DrupalWiki";
import { useState } from "react";
import ConnectorOption from "./ConnectorOption";
import WebsiteDepthOptions from "./Connectors/WebsiteDepth";
import ObsidianOptions from "./Connectors/Obsidian";
import PaperlessNgxOptions from "./Connectors/PaperlessNgx";
import { Input } from "@/components/ui/input";

export const getDataConnectors = (t) => ({
  github: {
    name: t("connectors.github.name"),
    image: ConnectorImages.github,
    description: t("connectors.github.description"),
    options: <GithubOptions />,
  },
  gitlab: {
    name: t("connectors.gitlab.name"),
    image: ConnectorImages.gitlab,
    description: t("connectors.gitlab.description"),
    options: <GitlabOptions />,
  },
  gitea: {
    name: t("connectors.gitea.name"),
    image: ConnectorImages.gitea,
    description: t("connectors.gitea.description"),
    options: <GiteaOptions />,
  },
  "youtube-transcript": {
    name: t("connectors.youtube.name"),
    image: ConnectorImages.youtube,
    description: t("connectors.youtube.description"),
    options: <YoutubeOptions />,
  },
  "website-depth": {
    name: t("connectors.website-depth.name"),
    image: ConnectorImages.websiteDepth,
    description: t("connectors.website-depth.description"),
    options: <WebsiteDepthOptions />,
  },
  confluence: {
    name: t("connectors.confluence.name"),
    image: ConnectorImages.confluence,
    description: t("connectors.confluence.description"),
    options: <ConfluenceOptions />,
  },
  drupalwiki: {
    name: "Drupal Wiki",
    image: ConnectorImages.drupalwiki,
    description: "Import Drupal Wiki spaces in a single click.",
    options: <DrupalWikiOptions />,
  },
  obsidian: {
    name: "Obsidian",
    image: ConnectorImages.obsidian,
    description: "Import Obsidian vault in a single click.",
    options: <ObsidianOptions />,
  },
  "paperless-ngx": {
    name: "Paperless-ngx",
    image: ConnectorImages.paperlessNgx,
    description: "Import documents from your Paperless-ngx instance.",
    options: <PaperlessNgxOptions />,
  },
});

export default function DataConnectors() {
  const { t } = useTranslation();
  const [selectedConnector, setSelectedConnector] = useState("github");
  const [searchQuery, setSearchQuery] = useState("");
  const DATA_CONNECTORS = getDataConnectors(t);

  const filteredConnectors = Object.keys(DATA_CONNECTORS).filter((slug) =>
    DATA_CONNECTORS[slug].name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-full grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6 items-start">
      <div className="w-full flex flex-col gap-y-3 border border-theme-modal-border rounded-lg p-3 h-[560px]">
        <div className="relative shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-theme-text-secondary" />
          <Input
            variant="settings"
            type="text"
            placeholder={t("connectors.search-placeholder")}
            className="pl-9 h-9"
            autoComplete="off"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-y-1 overflow-y-auto">
          {filteredConnectors.length > 0 ? (
            filteredConnectors.map((slug, index) => (
              <ConnectorOption
                key={index}
                slug={slug}
                selectedConnector={selectedConnector}
                setSelectedConnector={setSelectedConnector}
                image={DATA_CONNECTORS[slug].image}
                name={DATA_CONNECTORS[slug].name}
                description={DATA_CONNECTORS[slug].description}
              />
            ))
          ) : (
            <div className="text-theme-text-secondary text-center mt-4 text-sm">
              {t("connectors.no-connectors")}
            </div>
          )}
        </div>
      </div>
      <div className="w-full text-theme-text-primary h-[560px] overflow-y-auto border border-theme-modal-border rounded-lg p-4">
        {DATA_CONNECTORS[selectedConnector].options}
      </div>
    </div>
  );
}

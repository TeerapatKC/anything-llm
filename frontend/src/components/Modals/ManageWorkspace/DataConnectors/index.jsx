import ConnectorImages from "@/components/DataConnectorOption/media";
import { Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import YoutubeOptions from "./Connectors/Youtube";
import { useState } from "react";
import ConnectorOption from "./ConnectorOption";
import WebsiteDepthOptions from "./Connectors/WebsiteDepth";
import { Input } from "@/components/ui/input";
import useUser from "@/hooks/useUser";
import { WORKSPACE_PERMISSIONS as WS, workspaceCan } from "@/utils/permissions";

export const getDataConnectors = (t, workspace, user) => ({
  ...((workspaceCanAnyConnector(WS.DATA_CONNECTORS_WEB, workspace, user) ||
    workspaceCan(WS.DOCUMENTS_UPLOAD, workspace?.slug, user)) && {
    "website-depth": {
      name: t("connectors.website-depth.name"),
      image: ConnectorImages.websiteDepth,
      description: t("connectors.website-depth.description"),
      options: (
        <WebsiteDepthOptions
          workspace={workspace}
          canCrawl={workspaceCanAnyConnector(
            WS.DATA_CONNECTORS_WEB,
            workspace,
            user
          )}
        />
      ),
    },
  }),
  ...(workspaceCanAnyConnector(WS.DATA_CONNECTORS_YOUTUBE, workspace, user) && {
    "youtube-transcript": {
      name: t("connectors.youtube.name"),
      image: ConnectorImages.youtube,
      description: t("connectors.youtube.description"),
      options: <YoutubeOptions workspace={workspace} />,
    },
  }),
});

function workspaceCanAnyConnector(permission, workspace, user) {
  return (
    workspaceCan(permission, workspace?.slug, user) ||
    workspaceCan(WS.DATA_CONNECTORS, workspace?.slug, user)
  );
}

export default function DataConnectors({ workspace }) {
  const { t } = useTranslation();
  const { user } = useUser();
  const [selectedConnector, setSelectedConnector] = useState("website-depth");
  const [searchQuery, setSearchQuery] = useState("");
  const DATA_CONNECTORS = getDataConnectors(t, workspace, user);
  const activeConnector = DATA_CONNECTORS[selectedConnector]
    ? selectedConnector
    : Object.keys(DATA_CONNECTORS)[0];

  const filteredConnectors = Object.keys(DATA_CONNECTORS).filter((slug) =>
    DATA_CONNECTORS[slug].name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="grid w-full grid-cols-1 items-start gap-4 lg:grid-cols-[280px_1fr] lg:gap-6">
      <div className="flex w-full flex-col gap-y-3 rounded-lg border border-theme-modal-border p-3 lg:h-[560px]">
        <div className="relative shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-theme-text-secondary" />
          <Input
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
            filteredConnectors.map((slug) => (
              <ConnectorOption
                key={slug}
                slug={slug}
                selectedConnector={activeConnector}
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
      <div className="min-w-0 w-full rounded-lg border border-theme-modal-border p-4 text-theme-text-primary lg:h-[560px] lg:overflow-y-auto">
        {DATA_CONNECTORS[activeConnector]?.options}
      </div>
    </div>
  );
}

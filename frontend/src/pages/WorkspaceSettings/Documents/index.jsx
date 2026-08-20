import { useState } from "react";
import { useTranslation } from "react-i18next";
import DocumentSettings from "@/components/Modals/ManageWorkspace/Documents";
import DataConnectors from "@/components/Modals/ManageWorkspace/DataConnectors";
import { EmbeddingProgressProvider } from "@/EmbeddingProgressContext";
import { cn } from "@/lib/utils";
import WorkspaceSettingsSectionHeader from "@/components/layout/WorkspaceSettingsSectionHeader";

export default function WorkspaceDocuments({ workspace }) {
  const { t } = useTranslation();
  const [selectedTab, setSelectedTab] = useState("documents");

  if (!workspace) return null;

  return (
    <div className="flex w-full flex-col gap-y-4 px-1">
      <WorkspaceSettingsSectionHeader
        title="Workspace documents"
        description={`Manage the documents and data sources available to "${workspace.name}".`}
      />
      <div className="inline-flex w-fit items-center gap-x-1 rounded-md bg-muted p-1 text-muted-foreground">
        <SubTabButton
          label={t("connectors.manage.documents")}
          active={selectedTab === "documents"}
          onClick={() => setSelectedTab("documents")}
        />
        <SubTabButton
          label={t("connectors.manage.data-connectors")}
          active={selectedTab === "dataConnectors"}
          onClick={() => setSelectedTab("dataConnectors")}
        />
      </div>

      {selectedTab === "documents" ? (
        <EmbeddingProgressProvider>
          <DocumentSettings workspace={workspace} />
        </EmbeddingProgressProvider>
      ) : (
        <DataConnectors workspace={workspace} />
      )}
    </div>
  );
}

function SubTabButton({ label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-xs font-medium transition-all",
        active
          ? "bg-background text-foreground shadow-xs"
          : "hover:text-foreground"
      )}
    >
      {label}
    </button>
  );
}

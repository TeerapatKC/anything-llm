import { useState } from "react";
import { useTranslation } from "react-i18next";
import DocumentSettings from "@/components/Modals/ManageWorkspace/Documents";
import DataConnectors from "@/components/Modals/ManageWorkspace/DataConnectors";
import { EmbeddingProgressProvider } from "@/EmbeddingProgressContext";
import { cn } from "@/lib/utils";

export default function WorkspaceDocuments({ workspace }) {
  const { t } = useTranslation();
  const [selectedTab, setSelectedTab] = useState("documents");

  if (!workspace) return null;

  return (
    <div>
      <div className="inline-flex items-center gap-x-1 rounded-md bg-muted p-1 text-muted-foreground mb-6">
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

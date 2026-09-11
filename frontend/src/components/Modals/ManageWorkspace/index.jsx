import { useState, useEffect, memo } from "react";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import Workspace from "../../../models/workspace";
import { WORKSPACE_PERMISSIONS as WS, workspaceCan } from "@/utils/permissions";
import System from "../../../models/system";
import useUser from "../../../hooks/useUser";
import DocumentSettings from "./Documents";
import DataConnectors from "./DataConnectors";
import { EmbeddingProgressProvider } from "@/EmbeddingProgressContext";

const noop = () => {};
const ManageWorkspace = ({ hideModal = noop, providedSlug = null }) => {
  const { slug } = useParams();
  const { user } = useUser();
  const [workspace, setWorkspace] = useState(null);
  const [settings, setSettings] = useState({});
  const [selectedTab, setSelectedTab] = useState("documents");

  useEffect(() => {
    async function getSettings() {
      const _settings = await System.keys();
      setSettings(_settings ?? {});
    }
    getSettings();
  }, []);

  useEffect(() => {
    async function fetchWorkspace() {
      const workspace = await Workspace.bySlug(providedSlug ?? slug);
      setWorkspace(workspace);
    }
    fetchWorkspace();
  }, [providedSlug, slug]);

  if (!workspace) return null;

  return (
    <div className="fixed inset-0 z-99 flex h-screen w-screen items-center justify-center overflow-hidden p-2 sm:p-4">
      <div className="backdrop h-full w-full absolute top-0 z-10" />
      <div className="relative z-20 flex h-full max-h-[calc(100vh-1rem)] w-full max-w-[1100px] flex-col transition duration-300 sm:max-h-[calc(100vh-2rem)]">
        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[12px] border-2 border-theme-modal-border bg-theme-bg-secondary shadow">
          <div className="flex shrink-0 items-start justify-between rounded-t border-theme-modal-border p-2">
            <button
              onClick={hideModal}
              type="button"
              className="z-29 text-theme-text-primary bg-transparent rounded-lg text-sm p-1.5 ml-auto inline-flex items-center bg-sidebar-button hover:bg-theme-modal-border hover:border-theme-modal-border/50 border-transparent border"
            >
              <X size={20} className="text-theme-text-primary" />
            </button>
          </div>

          {/* The switcher is only worth showing when there is somewhere else to
              switch to. A private workspace's owner can upload but not attach data
              connectors, so they would otherwise be offered a tab whose every action
              the server refuses. */}
          {workspaceCan(WS.DOCUMENTS_UPLOAD, workspace?.slug, user) &&
            workspaceCan(WS.DATA_CONNECTORS, workspace?.slug, user) && (
              <ModalTabSwitcher
                selectedTab={selectedTab}
                setSelectedTab={setSelectedTab}
              />
            )}

          {selectedTab === "documents" ? (
            <EmbeddingProgressProvider>
              <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3 pb-3 sm:px-8 sm:pb-8">
                <DocumentSettings workspace={workspace} />
              </div>
            </EmbeddingProgressProvider>
          ) : (
            <DataConnectors workspace={workspace} systemSettings={settings} />
          )}
        </div>
      </div>
    </div>
  );
};

export default memo(ManageWorkspace);

const ModalTabSwitcher = ({ selectedTab, setSelectedTab }) => {
  const { t } = useTranslation();
  return (
    <div className="relative z-10 flex w-full shrink-0 justify-center">
      <div className="mt-1 mb-3 flex w-fit justify-center gap-x-1 rounded-lg bg-theme-bg-secondary p-0.5 ring-1 ring-foreground/10">
        <button
          onClick={() => setSelectedTab("documents")}
          className={`border-none px-3 py-1.5 text-xs rounded-md font-semibold hover:bg-theme-modal-border/60 ${
            selectedTab === "documents"
              ? "bg-theme-modal-border font-bold text-theme-text-primary light:bg-[#E0F2FE] light:text-[#026AA2]"
              : "text-white/20 font-medium hover:text-white light:bg-white light:text-[#535862] light:hover:bg-[#E0F2FE]"
          }`}
        >
          {t("connectors.manage.documents")}
        </button>
        <button
          onClick={() => setSelectedTab("dataConnectors")}
          className={`border-none px-3 py-1.5 text-xs rounded-md font-semibold hover:bg-theme-modal-border/60 ${
            selectedTab === "dataConnectors"
              ? "bg-theme-modal-border font-bold text-theme-text-primary light:bg-[#E0F2FE] light:text-[#026AA2]"
              : "text-white/20 font-medium hover:text-white light:bg-white light:text-[#535862] light:hover:bg-[#E0F2FE]"
          }`}
        >
          {t("connectors.manage.data-connectors")}
        </button>
      </div>
    </div>
  );
};

export function useManageWorkspaceModal() {
  const { user } = useUser();
  const [showing, setShowing] = useState(false);

  /**
   * @param {string|null} workspaceSlug - the workspace the modal would manage; uploading
   * is a per-workspace permission, so it has to be checked against that workspace.
   */
  function showModal(workspaceSlug = null) {
    if (workspaceCan(WS.DOCUMENTS_UPLOAD, workspaceSlug, user)) {
      setShowing(true);
    }
  }

  function hideModal() {
    setShowing(false);
  }

  useEffect(() => {
    function onEscape(event) {
      if (!showing || event.key !== "Escape") return;
      setShowing(false);
    }

    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("keydown", onEscape);
    };
  }, [showing]);

  return { showing, showModal, hideModal };
}

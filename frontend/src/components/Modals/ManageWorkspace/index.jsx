import { useState, useEffect, memo } from "react";
import { X } from "@phosphor-icons/react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import Workspace from "../../../models/workspace";
import { WORKSPACE_PERMISSIONS as WS, workspaceCan } from "@/utils/permissions";
import System from "../../../models/system";
import { isMobileOnly } from "react-device-detect";
import useUser from "../../../hooks/useUser";
import DocumentSettings from "./Documents";
import DataConnectors from "./DataConnectors";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { EmbeddingProgressProvider } from "@/EmbeddingProgressContext";
import { Button } from "@/components/ui/button";

const noop = () => {};
const ManageWorkspace = ({ hideModal = noop, providedSlug = null }) => {
  const { t } = useTranslation();
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

  if (isMobileOnly) {
    return (
      <Dialog open={true} onOpenChange={(open) => !open && hideModal()}>
        <DialogContent className="max-w-2xl bg-theme-bg-secondary border-theme-modal-border">
          <DialogHeader className="p-0">
            <DialogTitle className="text-sm font-semibold">
              {t("connectors.manage.editing")} "{workspace.name}"
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 flex-col">
            <p className="text-white">{t("connectors.manage.desktop-only")}</p>
          </div>
          <DialogFooter className="p-0">
            <Button variant="default" onClick={hideModal} type="button">
              {t("connectors.manage.dismiss")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <div className="w-screen h-screen fixed top-0 left-0 flex justify-center items-center z-99">
      <div className="backdrop h-full w-full absolute top-0 z-10" />
      <div className="absolute max-h-full w-fit transition duration-300 z-20 md:overflow-y-auto py-10">
        <div className="relative bg-theme-bg-secondary rounded-[12px] shadow border-2 border-theme-modal-border">
          <div className="flex items-start justify-between p-2 rounded-t border-theme-modal-border relative">
            <button
              onClick={hideModal}
              type="button"
              className="z-29 text-white bg-transparent rounded-lg text-sm p-1.5 ml-auto inline-flex items-center bg-sidebar-button hover:bg-theme-modal-border hover:border-theme-modal-border hover:border-opacity-50 border-transparent border"
            >
              <X size={20} weight="bold" className="text-white" />
            </button>
          </div>

          {workspaceCan(WS.DOCUMENTS_UPLOAD, workspace?.slug, user) && (
            <ModalTabSwitcher
              selectedTab={selectedTab}
              setSelectedTab={setSelectedTab}
            />
          )}

          {selectedTab === "documents" ? (
            <EmbeddingProgressProvider>
              <DocumentSettings workspace={workspace} />
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
    <div className="w-full flex justify-center z-10 relative">
      <div className="gap-x-2 flex justify-center -mt-[68px] mb-10 bg-theme-bg-secondary p-1 rounded-xl shadow border-2 border-theme-modal-border w-fit">
        <button
          onClick={() => setSelectedTab("documents")}
          className={`border-none px-4 py-2 rounded-[8px] font-semibold hover:bg-theme-modal-border hover:bg-opacity-60 ${
            selectedTab === "documents"
              ? "bg-theme-modal-border font-bold text-white light:bg-[#E0F2FE] light:text-[#026AA2]"
              : "text-white/20 font-medium hover:text-white light:bg-white light:text-[#535862] light:hover:bg-[#E0F2FE]"
          }`}
        >
          {t("connectors.manage.documents")}
        </button>
        <button
          onClick={() => setSelectedTab("dataConnectors")}
          className={`border-none px-4 py-2 rounded-[8px] font-semibold hover:bg-theme-modal-border hover:bg-opacity-60 ${
            selectedTab === "dataConnectors"
              ? "bg-theme-modal-border font-bold text-white light:bg-[#E0F2FE] light:text-[#026AA2]"
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

import PreLoader from "@/components/Preloader";
import WorkspaceFileRow from "./WorkspaceFileRow";
import { memo, useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Eye,
  Pin,
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  X,
} from "lucide-react";
import { SEEN_DOC_PIN_ALERT, SEEN_WATCH_ALERT } from "@/utils/constants";
import paths from "@/utils/paths";
import { Link } from "react-router-dom";
import Workspace from "@/models/workspace";
import { useTranslation } from "react-i18next";
import { middleTruncate } from "@/utils/directories";
import { useEmbeddingProgress } from "@/EmbeddingProgressContext";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { PANEL_HEIGHT } from "..";

function WorkspaceDirectory({
  workspace,
  files,
  highlightWorkspace,
  loading,
  loadingMessage,
  setLoadingMessage,
  setLoading,
  fetchKeys,
  hasChanges,
  saveChanges,
  movedItems,
}) {
  const { t } = useTranslation();
  const { embeddingProgressMap, removeQueuedFile } = useEmbeddingProgress();
  const embeddingProgress = embeddingProgressMap[workspace.slug] || null;
  const [selectedItems, setSelectedItems] = useState({});
  const embeddedDocCount = (files?.items ?? []).reduce(
    (sum, folder) => sum + (folder.items?.length ?? 0),
    0
  );

  const toggleSelection = (item) => {
    setSelectedItems((prevSelectedItems) => {
      const newSelectedItems = { ...prevSelectedItems };
      if (newSelectedItems[item.id]) {
        delete newSelectedItems[item.id];
      } else {
        newSelectedItems[item.id] = true;
      }
      return newSelectedItems;
    });
  };

  const toggleSelectAll = () => {
    const allItems = files.items.flatMap((folder) => folder.items);
    const allSelected = allItems.every((item) => selectedItems[item.id]);
    if (allSelected) {
      setSelectedItems({});
    } else {
      const newSelectedItems = {};
      allItems.forEach((item) => {
        newSelectedItems[item.id] = true;
      });
      setSelectedItems(newSelectedItems);
    }
  };

  const removeSelectedItems = async () => {
    setLoading(true);
    setLoadingMessage("Removing selected files from workspace");

    const itemsToRemove = Object.keys(selectedItems).map((itemId) => {
      const folder = files.items.find((f) =>
        f.items.some((i) => i.id === itemId)
      );
      const item = folder.items.find((i) => i.id === itemId);
      return `${folder.name}/${item.name}`;
    });

    try {
      await Workspace.modifyEmbeddings(workspace.slug, {
        adds: [],
        deletes: itemsToRemove,
      });
      await fetchKeys(true);
      setSelectedItems({});
    } catch (error) {
      console.error("Failed to remove documents:", error);
    }

    setLoadingMessage("");
    setLoading(false);
  };

  const handleSaveChanges = (e) => {
    setSelectedItems({});
    saveChanges(e);
  };

  const allSelected =
    Object.keys(selectedItems).length ===
    files.items.reduce((sum, folder) => sum + folder.items.length, 0);

  if (loading) {
    return (
      <div className="w-full flex flex-col gap-y-4">
        <h3 className="text-theme-text-primary text-base font-semibold">
          {workspace.name}
        </h3>
        <div
          className={`relative w-full ${PANEL_HEIGHT} bg-theme-settings-input-bg rounded-lg border border-theme-modal-border`}
        >
          <div className="w-full h-full flex items-center justify-center flex-col gap-y-5">
            <PreLoader />
            <p className="text-theme-text-primary text-sm font-semibold animate-pulse text-center w-1/3">
              {loadingMessage}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (embeddingProgress) {
    return (
      <div className="w-full flex flex-col gap-y-4">
        <h3 className="text-theme-text-primary text-base font-semibold">
          {workspace.name}
        </h3>
        <div
          className={`relative w-full ${PANEL_HEIGHT} bg-theme-settings-input-bg rounded-lg overflow-hidden border border-theme-modal-border`}
        >
          <div className="text-theme-text-primary/80 text-xs grid grid-cols-12 py-2 px-4 border-b border-white/20 light:border-theme-modal-border bg-theme-settings-input-bg sticky top-0 z-10 rounded-t-lg">
            <div className="col-span-8 flex items-center gap-x-2">
              <div className="shrink-0 w-3.5 h-3.5" />
              <p className="text-theme-text-primary">Name</p>
            </div>
            <p className="col-span-4 text-right text-theme-text-primary pr-1">
              Status
            </p>
          </div>
          <div className="overflow-y-auto h-[calc(100%-40px)]">
            {Object.entries(embeddingProgress).map(([filename, fileStatus]) => (
              <EmbeddingFileRow
                key={filename}
                filename={filename}
                status={fileStatus}
                onRemove={
                  fileStatus.status === "pending"
                    ? () => removeQueuedFile(workspace.slug, filename)
                    : null
                }
              />
            ))}
          </div>
        </div>
        {hasChanges && movedItems.length > 0 && (
          <div className="flex items-center justify-between">
            <p className="text-theme-text-secondary text-sm">
              {movedItems.length} additional file(s) ready to embed
            </p>
            <Button type="button" variant="outline" onClick={handleSaveChanges}>
              Add to queue
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="w-full flex flex-col gap-y-4">
        <h3 className="text-theme-text-primary text-base font-semibold">
          {workspace.name}
        </h3>
        <div className={`relative w-full ${PANEL_HEIGHT}`}>
          <div
            className={`absolute inset-0 rounded-lg ${
              highlightWorkspace ? "border-4 border-cyan-300/80 z-[999]" : ""
            }`}
          />
          <div className="relative w-full h-full bg-theme-settings-input-bg rounded-lg overflow-hidden border border-theme-modal-border">
            <div className="text-theme-text-primary/80 text-xs grid grid-cols-12 py-2 px-4 border-b border-white/20 light:border-theme-modal-border bg-theme-settings-input-bg sticky top-0 z-10">
              <div className="col-span-10 flex items-center gap-x-2">
                {!hasChanges &&
                files.items.some((folder) => folder.items.length > 0) ? (
                  <Checkbox
                    checked={allSelected}
                    className="shrink-0 h-3.5 w-3.5 border-white/60 data-[state=checked]:border-white"
                    onClick={toggleSelectAll}
                  />
                ) : (
                  <div className="shrink-0 w-3.5 h-3.5" />
                )}
                <p className="text-theme-text-primary">Name</p>
              </div>
              {embeddedDocCount > 0 && (
                <p className="col-span-2 text-right text-theme-text-secondary pr-2">
                  {t(`connectors.directory.total-documents`, {
                    count: embeddedDocCount,
                  })}
                </p>
              )}
            </div>
            <div className="overflow-y-auto h-[calc(100%-40px)]">
              {files.items.some((folder) => folder.items.length > 0) ||
              movedItems.length > 0 ? (
                <RenderFileRows
                  files={files}
                  movedItems={movedItems}
                  workspace={workspace}
                >
                  {({ item, folder }) => (
                    <WorkspaceFileRow
                      key={item.id}
                      item={item}
                      folderName={folder.name}
                      workspace={workspace}
                      setLoading={setLoading}
                      setLoadingMessage={setLoadingMessage}
                      fetchKeys={fetchKeys}
                      hasChanges={hasChanges}
                      movedItems={movedItems}
                      selected={selectedItems[item.id]}
                      toggleSelection={() => toggleSelection(item)}
                      disableSelection={hasChanges}
                      setSelectedItems={setSelectedItems}
                    />
                  )}
                </RenderFileRows>
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <p className="text-theme-text-secondary text-sm font-medium">
                    {t("connectors.directory.no_docs")}
                  </p>
                </div>
              )}
            </div>

            {Object.keys(selectedItems).length > 0 && !hasChanges && (
              <div className="absolute bottom-3 left-0 right-0 flex justify-center pointer-events-none">
                <div className="mx-auto flex items-center gap-x-1.5 bg-theme-bg-secondary border border-theme-modal-border rounded-lg py-1 px-1.5 pointer-events-auto shadow-lg">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 px-2.5 text-xs"
                    onClick={toggleSelectAll}
                  >
                    {allSelected
                      ? t("connectors.directory.deselect_all")
                      : t("connectors.directory.select_all")}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 px-2.5 text-xs"
                    onClick={removeSelectedItems}
                  >
                    {t("connectors.directory.remove_selected")}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
        {hasChanges && (
          <div className="flex items-center justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={(e) => handleSaveChanges(e)}
            >
              {t("connectors.directory.save_embed")}
            </Button>
          </div>
        )}
      </div>
      <PinAlert />
      <DocumentWatchAlert />
    </>
  );
}

const PinAlert = memo(() => {
  const { t } = useTranslation();
  const [showAlert, setShowAlert] = useState(false);
  function dismissAlert() {
    setShowAlert(false);
    window.localStorage.setItem(SEEN_DOC_PIN_ALERT, "1");
    window.removeEventListener(handlePinEvent);
  }

  function handlePinEvent() {
    if (!!window?.localStorage?.getItem(SEEN_DOC_PIN_ALERT)) return;
    setShowAlert(true);
  }

  useEffect(() => {
    if (!window || !!window?.localStorage?.getItem(SEEN_DOC_PIN_ALERT)) return;
    window?.addEventListener("pinned_document", handlePinEvent);
  }, []);

  return (
    <Dialog open={showAlert} onOpenChange={(open) => !open && dismissAlert()}>
      <DialogContent className="max-w-2xl bg-theme-bg-secondary border-theme-modal-border">
        <DialogHeader className="p-0">
          <div className="flex items-center gap-2">
            <Pin className="text-theme-text-primary w-5 h-5" />
            <DialogTitle className="text-sm font-semibold">
              {t("connectors.pinning.what_pinning")}
            </DialogTitle>
          </div>
        </DialogHeader>
        <div className="space-y-2 flex-col">
          <div className="w-full text-white text-md flex flex-col gap-y-2">
            <p>
              <span
                dangerouslySetInnerHTML={{
                  __html: t("connectors.pinning.pin_explained_block1"),
                }}
              />
            </p>
            <p>
              <span
                dangerouslySetInnerHTML={{
                  __html: t("connectors.pinning.pin_explained_block2"),
                }}
              />
            </p>
            <p>{t("connectors.pinning.pin_explained_block3")}</p>
          </div>
        </div>
        <DialogFooter className="p-0">
          <Button variant="default" onClick={dismissAlert}>
            {t("connectors.pinning.accept")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

const DocumentWatchAlert = memo(() => {
  const { t } = useTranslation();
  const [showAlert, setShowAlert] = useState(false);
  function dismissAlert() {
    setShowAlert(false);
    window.localStorage.setItem(SEEN_WATCH_ALERT, "1");
    window.removeEventListener(handlePinEvent);
  }

  function handlePinEvent() {
    if (!!window?.localStorage?.getItem(SEEN_WATCH_ALERT)) return;
    setShowAlert(true);
  }

  useEffect(() => {
    if (!window || !!window?.localStorage?.getItem(SEEN_WATCH_ALERT)) return;
    window?.addEventListener("watch_document_for_changes", handlePinEvent);
  }, []);

  return (
    <Dialog open={showAlert} onOpenChange={(open) => !open && dismissAlert()}>
      <DialogContent className="max-w-2xl bg-theme-bg-secondary border-theme-modal-border">
        <DialogHeader className="p-0">
          <div className="flex items-center gap-2">
            <Eye className="text-theme-text-primary w-5 h-5" />
            <DialogTitle className="text-sm font-semibold">
              {t("connectors.watching.what_watching")}
            </DialogTitle>
          </div>
        </DialogHeader>
        <div className="space-y-2 flex-col">
          <div className="w-full text-white text-md flex flex-col gap-y-2">
            <p>
              <span
                dangerouslySetInnerHTML={{
                  __html: t("connectors.watching.watch_explained_block1"),
                }}
              />
            </p>
            <p>{t("connectors.watching.watch_explained_block2")}</p>
            <p>
              {t("connectors.watching.watch_explained_block3_start")}
              <Link
                to={paths.experimental.liveDocumentSync.manage()}
                className="text-blue-600 underline"
              >
                {t("connectors.watching.watch_explained_block3_link")}
              </Link>
              {t("connectors.watching.watch_explained_block3_end")}
            </p>
          </div>
        </div>
        <DialogFooter className="p-0">
          <Button variant="default" onClick={dismissAlert}>
            {t("connectors.watching.accept")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

function RenderFileRows({ files, movedItems, children, workspace }) {
  function sortMovedItemsAndFiles(a, b) {
    const aIsMovedItem = movedItems.some((movedItem) => movedItem.id === a.id);
    const bIsMovedItem = movedItems.some((movedItem) => movedItem.id === b.id);
    if (aIsMovedItem && !bIsMovedItem) return -1;
    if (!aIsMovedItem && bIsMovedItem) return 1;

    // Sort pinned items to the top
    const aIsPinned = a.pinnedWorkspaces?.includes(workspace.id);
    const bIsPinned = b.pinnedWorkspaces?.includes(workspace.id);
    if (aIsPinned && !bIsPinned) return -1;
    if (!aIsPinned && bIsPinned) return 1;

    return 0;
  }

  return files.items
    .flatMap((folder) => folder.items)
    .sort(sortMovedItemsAndFiles)
    .map((item) => {
      const folder = files.items.find((f) => f.items.includes(item));
      return children({ item, folder });
    });
}

/**
 * @param {string} filename
 */
const getDisplayName = (filename) => {
  const base = filename.split("/").pop() || filename;
  return base.replace(
    /-[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\.json$/,
    ""
  );
};

const STATUS_STYLES = {
  pending: {
    icon: (
      <Clock className="h-4 w-4 text-slate-100 light:text-slate-900/40 shrink-0" />
    ),
    textColor: "text-slate-100 light:text-slate-900/70",
    label: "Queued",
  },
  embedding: {
    icon: (
      <Loader2 className="h-4 w-4 text-slate-100 light:text-slate-900/40 animate-spin shrink-0" />
    ),
    textColor: "text-slate-100 light:text-slate-900/70",
    label: "Embedding",
  },
  complete: {
    icon: (
      <CheckCircle2 className="h-4 w-4 text-green-400 light:text-green-600 shrink-0" />
    ),
    textColor: "text-green-400 light:text-green-600",
    label: "Complete",
  },
  failed: {
    icon: (
      <XCircle className="h-4 w-4 text-red-400 light:text-red-600 shrink-0" />
    ),
    textColor: "text-red-400 light:text-red-600",
    label: "Failed",
  },
};

function EmbeddingFileRow({ filename, status: fileStatus, onRemove }) {
  const { status, chunksProcessed = 0, totalChunks = 0 } = fileStatus;
  const displayName = getDisplayName(filename);
  const isEmbedding = status === "embedding";
  const pct =
    isEmbedding && totalChunks > 0
      ? Math.round((chunksProcessed / totalChunks) * 100)
      : 0;

  return (
    <div className="text-slate-100 light:text-slate-900 text-xs grid grid-cols-12 py-2 pl-3.5 pr-3.5 h-[34px] items-center border-b border-white/5">
      <div className="col-span-7 flex items-center gap-x-2 overflow-hidden">
        {STATUS_STYLES[status]?.icon || STATUS_STYLES.pending.icon}
        <p
          className={`whitespace-nowrap overflow-hidden text-ellipsis ${
            status === "failed" ? "text-red-400" : ""
          }`}
          title={displayName}
        >
          {middleTruncate(displayName, 40)}
        </p>
      </div>
      <div className="col-span-5 flex justify-end items-center gap-x-2">
        {isEmbedding ? (
          <div className="flex items-center gap-x-2 w-full justify-end">
            <div className="w-20 h-[1.5px] bg-white/10 light:bg-sky-900/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-white light:bg-sky-400 rounded-full transition-all duration-300"
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="text-xs whitespace-nowrap w-8 text-right">{pct}%</p>
          </div>
        ) : (
          <div className="flex items-center gap-x-2">
            <p
              className={`text-xs italic whitespace-nowrap flex gap-2 justify-center items-center ${STATUS_STYLES[status]?.textColor}`}
            >
              {STATUS_STYLES[status]?.label || "Queued"}
            </p>
            {onRemove && (
              <button
                onClick={onRemove}
                className="border-none hover:bg-white/10 light:hover:bg-sky-900/10 rounded p-0.5 transition-colors"
                title="Remove from queue"
              >
                <X className="h-3.5 w-3.5 text-slate-100 light:text-slate-900/40 hover:text-slate-100 light:hover:text-slate-900" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(WorkspaceDirectory);

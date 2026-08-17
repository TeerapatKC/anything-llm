import UploadFile from "../UploadFile";
import PreLoader from "@/components/Preloader";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import FolderRow from "./FolderRow";
import System from "@/models/system";
import { Loader2, Search, Plus, Trash2, FolderInput } from "lucide-react";
import Document from "@/models/document";
import showToast from "@/utils/toast";
import FolderSelectionPopup from "./FolderSelectionPopup";
import { useModal } from "@/hooks/useModal";
import NewFolderModal from "./NewFolderModal";
import debounce from "lodash.debounce";
import ContextMenu from "./ContextMenu";
import useUploadQueue from "../hooks/useUploadQueue";
import { getFilesFromUploadEvent } from "@/utils/folderUpload";
import ConfirmDialog from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PANEL_HEIGHT } from "..";

const NO_FILES = [];

export default function Directory({
  picker,
  workspace,
  hiddenPaths,
  setHighlightWorkspace,
  moveToWorkspace,
}) {
  const { t } = useTranslation();
  const [confirm, setConfirm] = useState(null);
  const [showFolderSelection, setShowFolderSelection] = useState(false);
  const [contextMenu, setContextMenu] = useState({
    visible: false,
    x: 0,
    y: 0,
  });
  const {
    isOpen: isFolderModalOpen,
    openModal: openFolderModal,
    closeModal: closeFolderModal,
  } = useModal();

  const {
    status,
    busyMessage,
    folders,
    contents,
    expanded,
    searchResults,
    searching,
    hasSelection,
    selectedFolderNames,
    isFileSelected,
    folderSelectionState,
    refresh,
    search,
    syncAfterUpload,
    toggleExpanded,
    prefetchFolder,
    loadMore,
    toggleFile,
    toggleFolder,
    selectAll,
    clearSelection,
    resolveSelection,
    removeFiles,
    addFolder,
    setBusy,
  } = picker;

  /**
   * One flattened view model per visible folder. Search replaces the folder
   * list with the backend's matches (always open); otherwise rows are driven
   * by the lazily-fetched pages held in the picker.
   */
  const rows = useMemo(() => {
    const hide = (folderName, files) =>
      hiddenPaths?.size
        ? files.filter((f) => !hiddenPaths.has(`${folderName}/${f.name}`))
        : files;

    if (searchResults) {
      return searchResults.map((folder) => {
        const files = hide(folder.name, folder.items ?? []);
        return {
          item: folder,
          files,
          expanded: true,
          loading: false,
          hasMore: false,
          totalCount: files.length,
          // The badge counts matches, not the folder's size - showing "(200)"
          // next to three visible rows reads as a bug.
          displayCount: files.length,
        };
      });
    }

    return folders.map((folder) => {
      const entry = contents[folder.name];
      const files = entry ? hide(folder.name, entry.items) : NO_FILES;
      const hasMore = entry?.hasMore ?? false;
      // totalCount is the server's raw count and drives "Load more (x of y)".
      const totalCount = entry?.totalCount ?? folder.fileCount ?? 0;
      return {
        item: folder,
        files,
        expanded: expanded.has(folder.name),
        loading: entry?.status === "loading",
        hasMore,
        totalCount,
        // Once a folder is fully fetched we know exactly how many rows it can
        // show - embedded files are filtered out of the page, so a folder with
        // everything embedded must read as empty rather than still claiming
        // its on-disk count.
        displayCount:
          entry?.status === "loaded" && !hasMore ? files.length : totalCount,
      };
    });
  }, [folders, contents, expanded, searchResults, hiddenPaths]);

  const totalDocCount = useMemo(
    () => folders.reduce((acc, folder) => acc + (folder.fileCount ?? 0), 0),
    [folders]
  );

  // While searching, the library-wide total is misleading next to a filtered
  // list, so the header reports how many matches are on screen instead.
  const searchResultCount = useMemo(
    () =>
      searchResults ? rows.reduce((acc, row) => acc + row.files.length, 0) : 0,
    [searchResults, rows]
  );

  /* --------------------------------- search -------------------------------- */

  const handleSearch = useMemo(
    () => debounce((event) => search(event.target.value), 400),
    [search]
  );
  useEffect(() => () => handleSearch.cancel(), [handleSearch]);

  /* -------------------------------- mutations ------------------------------ */

  const deleteFiles = async (event) => {
    event.stopPropagation();
    setConfirm({
      title: t("connectors.directory.delete-confirmation"),
      confirmText: t("common.delete", "Delete"),
      variant: "destructive",
      onConfirm: deleteSelectedFiles,
    });
  };

  const deleteSelectedFiles = async () => {
    const selected = await resolveSelection();
    const toRemove = selected.map((file) => `${file.folderName}/${file.name}`);
    const foldersToRemove = selectedFolderNames.filter(
      (name) => name !== "custom-documents"
    );

    setBusy(
      t("connectors.directory.removing-message", {
        count: toRemove.length,
        folderCount: foldersToRemove.length,
      })
    );
    try {
      if (toRemove.length > 0) await System.deleteDocuments(toRemove);
      for (const folderName of foldersToRemove)
        await System.deleteFolder(folderName);
      removeFiles(selected.map((file) => file.id));
      clearSelection();
      await refresh();
    } catch (error) {
      console.error("Failed to delete files and folders:", error);
      showToast(`Failed to delete: ${error.message}`, "error");
    } finally {
      setBusy(null);
    }
  };

  const moveToFolder = async (folder) => {
    setShowFolderSelection(false);
    const toMove = await resolveSelection();
    if (toMove.length === 0) return;

    setBusy(`Moving ${toMove.length} documents. Please wait.`);
    const { success, message } = await Document.moveToFolder(
      toMove,
      folder.name
    );
    if (!success) {
      showToast(`Error moving files: ${message}`, "error");
      setBusy(null);
      return;
    }

    // A partial success returns a message explaining which files were skipped.
    if (message) showToast(message, "info");
    else
      showToast(
        t("connectors.directory.move-success", { count: toMove.length }),
        "success"
      );

    clearSelection();
    await refresh();
    setBusy(null);
  };

  /**
   * Dropping files onto a folder row uploads them straight into that folder,
   * so the user does not have to upload and then move. Progress is reported
   * in the shared uploader below the picker.
   */
  const uploadQueue = useUploadQueue();
  const { enqueueIntoFolder } = uploadQueue;
  const handleFolderDrop = useCallback(
    async (folderName, event) => {
      // Must be called before anything awaits: a drop's DataTransferItems are
      // only readable while the drop event is being dispatched.
      const dropped = await getFilesFromUploadEvent(event.nativeEvent ?? event);
      const { queued, skipped } = enqueueIntoFolder(dropped, folderName);

      if (queued === 0)
        return showToast(
          skipped > 0
            ? `Drop files onto ${folderName}, not folders - a folder can only be dropped on the uploader below.`
            : "Nothing in that drop could be uploaded.",
          "warning"
        );

      // The progress list lives in the uploader below the picker, which may be
      // scrolled out of view - confirm the drop landed so it does not look
      // like nothing happened.
      showToast(`Uploading ${queued} file(s) to ${folderName}`, "info");
      if (skipped > 0)
        showToast(
          `${skipped} file(s) inside folders were skipped - drop a folder on the uploader below to add it as its own folder.`,
          "warning"
        );
    },
    [enqueueIntoFolder]
  );

  const handleFolderCreated = useCallback(
    (name) => {
      addFolder(name);
      closeFolderModal();
    },
    [addFolder, closeFolderModal]
  );

  const handleContextMenu = (event) => {
    event.preventDefault();
    setContextMenu({ visible: true, x: event.clientX, y: event.clientY });
  };
  const closeContextMenu = useCallback(
    () => setContextMenu({ visible: false, x: 0, y: 0 }),
    []
  );

  return (
    <>
      <div
        className="w-full flex flex-col gap-y-4"
        onContextMenu={handleContextMenu}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-theme-text-primary text-base font-semibold">
            {t("connectors.directory.my-documents")}
          </h3>
          <div className="flex items-center gap-x-2">
            <div className="relative">
              <Input
                variant="settings"
                type="search"
                placeholder={t("connectors.directory.search-document")}
                onChange={handleSearch}
                className="pl-9 w-[200px] h-9"
              />
              {searching ? (
                <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-theme-text-secondary" />
              ) : (
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-theme-text-secondary" />
              )}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={openFolderModal}
              className="gap-x-1.5"
            >
              <Plus className="h-4 w-4" />
              {t("connectors.directory.new-folder")}
            </Button>
          </div>
        </div>

        <div
          className={`relative w-full ${PANEL_HEIGHT} bg-theme-settings-input-bg rounded-lg overflow-hidden border border-theme-modal-border`}
        >
          <div className="absolute top-0 left-0 right-0 z-10 rounded-t-lg text-theme-text-primary text-xs grid grid-cols-12 py-2 px-4 border-b border-white/20 light:border-theme-modal-border bg-theme-settings-input-bg">
            <p className="col-span-6">Name</p>
            {searchResults ? (
              <p className="col-span-6 text-right text-theme-text-secondary">
                {t(`connectors.directory.search-results`, {
                  count: searchResultCount,
                })}
              </p>
            ) : (
              totalDocCount > 0 && (
                <p className="col-span-6 text-right text-theme-text-secondary">
                  {t(`connectors.directory.total-documents`, {
                    count: totalDocCount,
                  })}
                </p>
              )
            )}
          </div>

          <div className="overflow-y-auto h-full pt-8">
            {status === "initializing" ? (
              <div className="w-full h-full flex items-center justify-center flex-col gap-y-5">
                <PreLoader />
              </div>
            ) : rows.length > 0 ? (
              rows.map((row) => (
                <FolderRow
                  key={row.item.name}
                  item={row.item}
                  files={row.files}
                  expanded={row.expanded}
                  loading={row.loading}
                  hasMore={row.hasMore}
                  totalCount={row.totalCount}
                  displayCount={row.displayCount}
                  selectionState={folderSelectionState(
                    row.item.name,
                    row.files
                  )}
                  isFileSelected={(id) => isFileSelected(row.item.name, id)}
                  onToggleExpanded={toggleExpanded}
                  onToggleFolder={(folder) => toggleFolder(folder, row.files)}
                  onToggleFile={toggleFile}
                  onPrefetch={prefetchFolder}
                  onLoadMore={loadMore}
                  acceptsDrops={uploadQueue.ready}
                  onDropFiles={handleFolderDrop}
                />
              ))
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <p className="text-theme-text-secondary text-sm font-medium">
                  {t("connectors.directory.no-documents")}
                </p>
              </div>
            )}
          </div>

          {/* Non-blocking status strip - mutations never blank the tree. */}
          {!!busyMessage && (
            <div className="absolute top-8 left-0 right-0 z-20 flex items-center justify-center gap-x-2 bg-theme-bg-secondary/95 border-b border-theme-modal-border py-1.5">
              <Loader2 className="h-3 w-3 animate-spin" />
              <p className="text-theme-text-primary text-xs font-medium">
                {busyMessage}
              </p>
            </div>
          )}

          {hasSelection && (
            <div className="absolute bottom-3 left-0 right-0 flex justify-center pointer-events-none">
              <div className="mx-auto flex items-center gap-x-1.5 bg-theme-bg-secondary border border-theme-modal-border rounded-lg py-1 px-1.5 pointer-events-auto shadow-lg">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 px-2.5 text-xs"
                  onClick={moveToWorkspace}
                  onMouseEnter={() => setHighlightWorkspace(true)}
                  onMouseLeave={() => setHighlightWorkspace(false)}
                >
                  {t("connectors.directory.move-workspace")}
                </Button>
                <div className="relative">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setShowFolderSelection(!showFolderSelection)}
                  >
                    <FolderInput className="h-4 w-4" />
                  </Button>
                  {showFolderSelection && (
                    <FolderSelectionPopup
                      folders={folders}
                      onSelect={moveToFolder}
                      onClose={() => setShowFolderSelection(false)}
                    />
                  )}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={deleteFiles}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
        <UploadFile
          workspace={workspace}
          queue={uploadQueue}
          onUploadComplete={syncAfterUpload}
          onLinkScraped={syncAfterUpload}
        />
      </div>
      {isFolderModalOpen && (
        <div className="bg-black/60 backdrop-blur-sm fixed top-0 left-0 outline-none w-screen h-screen flex items-center justify-center z-30">
          <NewFolderModal
            closeModal={closeFolderModal}
            onCreated={handleFolderCreated}
          />
        </div>
      )}
      <ContextMenu
        contextMenu={contextMenu}
        closeContextMenu={closeContextMenu}
        allSelected={
          hasSelection && selectedFolderNames.length === folders.length
        }
        onSelectAll={selectAll}
        onClearSelection={clearSelection}
      />
      <ConfirmDialog config={confirm} onClose={() => setConfirm(null)} />
    </>
  );
}

import UploadFile from "../UploadFile";
import { Spinner } from "@/components/ui/spinner";
import PreLoader from "@/components/Preloader";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import FolderRow from "./FolderRow";
import System from "@/models/system";
import { Search, Plus, Trash2, FolderInput, UploadCloud } from "lucide-react";
import Document from "@/models/document";
import showToast from "@/utils/toast";
import FolderSelectionPopup from "./FolderSelectionPopup";
import {
  DropdownMenu,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useModal } from "@/hooks/useModal";
import NewFolderModal from "./NewFolderModal";
import RenameFolderModal from "./RenameFolderModal";
import FolderVisibilityModal from "./FolderVisibilityModal";
import debounce from "lodash.debounce";
import ContextMenu from "./ContextMenu";
import useUploadQueue from "../hooks/useUploadQueue";
import { getFilesFromUploadEvent } from "@/utils/folderUpload";
import {
  DEFAULT_DOCUMENTS_FOLDER,
  folderDisplayName,
} from "@/utils/directories";
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
  const [contextMenu, setContextMenu] = useState({
    visible: false,
    x: 0,
    y: 0,
    // The folder the right-click landed on, if any - null for a right-click
    // on the panel's empty space.
    folderName: null,
  });
  const [renamingFolder, setRenamingFolder] = useState(null);
  const [visibilityFolder, setVisibilityFolder] = useState(null);
  // Lit while a drag carrying files is anywhere over the document panel, which
  // is the only drop target now - there is no separate uploader card to aim at.
  const [isDropTarget, setIsDropTarget] = useState(false);
  // The folder row the drag is currently over, so the panel can name where the
  // files will actually land instead of just saying "drop here".
  const [dragFolder, setDragFolder] = useState(null);
  const fileInputRef = useRef(null);
  // Which folder the open file picker is uploading into; null means the drop
  // is untargeted and lands in custom-documents.
  const uploadFolderRef = useRef(null);
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

  /**
   * The folders this selection can actually remove. The default folder is
   * never one of them - the server refuses to delete it - so it is dropped
   * here too rather than offered and then silently skipped.
   */
  const removableSelectedFolders = useMemo(
    () =>
      selectedFolderNames.filter((name) => name !== DEFAULT_DOCUMENTS_FOLDER),
    [selectedFolderNames]
  );

  const deleteFiles = async (event) => {
    event.stopPropagation();
    setConfirm({
      // Selecting only the default folder deletes its files and nothing else,
      // so the prompt must not promise to remove folders as well.
      title:
        removableSelectedFolders.length > 0
          ? t("connectors.directory.delete-confirmation")
          : t("connectors.directory.delete-confirmation-files"),
      confirmText: t("common.delete", "Delete"),
      variant: "destructive",
      onConfirm: deleteSelectedFiles,
    });
  };

  const deleteSelectedFiles = async () => {
    const selected = await resolveSelection();
    const toRemove = selected.map((file) => `${file.folderName}/${file.name}`);
    const foldersToRemove = removableSelectedFolders;

    setBusy(
      foldersToRemove.length > 0
        ? t("connectors.directory.removing-message", {
            count: toRemove.length,
            folderCount: foldersToRemove.length,
          })
        : t("connectors.directory.removing-message-files", {
            count: toRemove.length,
          })
    );
    try {
      if (toRemove.length > 0) await System.deleteDocuments(toRemove);
      for (const folderName of foldersToRemove) {
        // The server refuses protected and missing folders. Say so - the
        // refresh below would otherwise just put the folder back with no
        // explanation for why the delete did nothing.
        const { success, message } = await System.deleteFolder(folderName);
        if (!success)
          showToast(
            `Could not remove ${folderName}: ${message ?? "unknown error"}`,
            "error"
          );
      }
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

  const uploadQueue = useUploadQueue();
  const { enqueueDrop, enqueueIntoFolder } = uploadQueue;

  /**
   * Queue files for one named folder, whichever way the user picked them -
   * a drop onto that folder's row or its own upload button. Both land in the
   * same place, so both report it the same way.
   * @param {File[]} files
   * @param {string} folderName
   */
  const queueIntoFolder = useCallback(
    (files, folderName) => {
      const { queued, skipped } = enqueueIntoFolder(files, folderName);
      const label = folderDisplayName(folderName);

      if (queued === 0)
        return showToast(
          skipped > 0
            ? `Only files can go into ${label} - drop a folder on the empty area of the list to add it as its own folder.`
            : "Nothing in that drop could be uploaded.",
          "warning"
        );

      // The progress list sits below the panel and may be scrolled out of
      // view - confirm the upload started so it does not look like nothing
      // happened.
      showToast(`Uploading ${queued} file(s) to ${label}`, "info");
      if (skipped > 0)
        showToast(
          `${skipped} file(s) inside folders were skipped - drop a folder on the empty area of the list to add it as its own folder.`,
          "warning"
        );
    },
    [enqueueIntoFolder]
  );

  /**
   * Dropping files onto a folder row uploads them straight into that folder,
   * so the user does not have to upload and then move.
   */
  const handleFolderDrop = useCallback(
    async (folderName, event) => {
      // Must be called before anything awaits: a drop's DataTransferItems are
      // only readable while the drop event is being dispatched.
      const dropped = await getFilesFromUploadEvent(event.nativeEvent ?? event);
      queueIntoFolder(dropped, folderName);
    },
    [queueIntoFolder]
  );

  /** Opens the file picker aimed at one folder. */
  const openUploadFor = useCallback((folderName = null) => {
    uploadFolderRef.current = folderName;
    fileInputRef.current?.click();
  }, []);

  /* ------------------------------ panel drops ----------------------------- */

  // Only react to drags carrying files - dragging text or a link over the
  // panel should not make it look like it will accept the drop.
  const dragHasFiles = (event) =>
    Array.from(event.dataTransfer?.types ?? []).includes("Files");

  /**
   * The panel's drag handlers run in the capture phase because FolderRow stops
   * propagation on its own: a bubble-phase listener here would go dark the
   * moment the cursor crossed a folder row, making the panel flicker between
   * "will accept this" and "will not" as the user moves across it.
   */
  const handlePanelDragEnter = (event) => {
    if (!uploadQueue.ready || !dragHasFiles(event)) return;
    setIsDropTarget(true);
  };

  const handlePanelDragLeave = (event) => {
    // dragleave also fires when moving onto a child, so ignore any leave that
    // lands somewhere still inside the panel.
    if (event.currentTarget.contains(event.relatedTarget)) return;
    setIsDropTarget(false);
    setDragFolder(null);
  };

  // Bubble phase: a drag over a folder row is that row's to handle, and it
  // calls preventDefault itself.
  const handlePanelDragOver = (event) => {
    if (!uploadQueue.ready || !dragHasFiles(event)) return;
    // Both required, or the browser refuses the drop and opens the file.
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  };

  /**
   * An untargeted drop - anywhere in the panel that is not a folder row.
   * Loose files land in custom-documents and a dropped folder becomes a folder
   * of its own, the same as the old uploader card below the panel did.
   */
  const handlePanelDrop = async (event) => {
    if (!uploadQueue.ready || !dragHasFiles(event)) return;
    event.preventDefault();
    // Must be called before anything awaits: a drop's DataTransferItems are
    // only readable while the drop event is being dispatched.
    const dropped = await getFilesFromUploadEvent(event.nativeEvent ?? event);
    if (dropped.length === 0)
      return showToast("Nothing in that drop could be uploaded.", "warning");
    enqueueDrop(dropped);
  };

  /** Files chosen through a folder's upload button, or the empty-state prompt. */
  const handleFilesPicked = async (event) => {
    const input = event.target;
    const folderName = uploadFolderRef.current;
    const picked = await getFilesFromUploadEvent(event.nativeEvent ?? event);
    // Reset first or picking the same file twice in a row fires no change.
    input.value = "";
    uploadFolderRef.current = null;
    if (picked.length === 0) return;
    if (folderName) queueIntoFolder(picked, folderName);
    else enqueueDrop(picked);
  };

  const handleFolderCreated = useCallback(
    (name) => {
      // Shown immediately so the new folder does not blink in, then re-fetched:
      // the optimistic row carries no visibility, and without the refresh it
      // would sit there unbadged as though it were shared.
      addFolder(name);
      closeFolderModal();
      refresh();
    },
    [addFolder, closeFolderModal, refresh]
  );

  const handleContextMenu = (event, folderName = null) => {
    event.preventDefault();
    setContextMenu({
      visible: true,
      x: event.clientX,
      y: event.clientY,
      folderName,
    });
  };
  const closeContextMenu = useCallback(
    () => setContextMenu({ visible: false, x: 0, y: 0, folderName: null }),
    []
  );

  const openRenameFolder = useCallback(
    (folderName) => {
      closeContextMenu();
      setRenamingFolder(folderName);
    },
    [closeContextMenu]
  );

  const openFolderVisibility = useCallback(
    (folderName) => {
      closeContextMenu();
      // The row carries the current level, so the modal opens on it rather
      // than defaulting to something the folder is not.
      const current = folders.find((folder) => folder.name === folderName);
      setVisibilityFolder({
        name: folderName,
        visibility: current?.visibility ?? "shared",
      });
    },
    [closeContextMenu, folders]
  );

  /** A folder that just became private may no longer be ours to list. */
  const handleVisibilityChanged = useCallback(async () => {
    setVisibilityFolder(null);
    clearSelection();
    await refresh();
  }, [clearSelection, refresh]);

  /**
   * A rename changes the name every page, expansion and selection in the
   * picker is keyed by, so re-hydrate rather than patch - and drop the
   * selection, which may name files under the old folder.
   */
  const handleFolderRenamed = useCallback(
    async (from, to) => {
      setRenamingFolder(null);
      clearSelection();
      setBusy(`Renaming ${from} to ${to}. Please wait.`);
      try {
        await refresh();
        showToast(`Renamed ${from} to ${to}`, "success");
      } finally {
        setBusy(null);
      }
    },
    [clearSelection, refresh, setBusy]
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
                type="search"
                placeholder={t("connectors.directory.search-document")}
                onChange={handleSearch}
                className="pl-9 w-[200px] h-9"
              />
              {searching ? (
                <Spinner
                  size="xs"
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-text-secondary"
                />
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
            {/* One hidden input for every upload button in the panel - the
                folder it is aimed at is held in uploadFolderRef. */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              hidden
              onChange={handleFilesPicked}
            />
          </div>
        </div>

        <div
          onDragEnterCapture={handlePanelDragEnter}
          onDragLeaveCapture={handlePanelDragLeave}
          onDragOver={handlePanelDragOver}
          // Capture, so the highlight clears even for a drop a folder row
          // handled and stopped.
          onDropCapture={() => {
            setIsDropTarget(false);
            setDragFolder(null);
          }}
          onDrop={handlePanelDrop}
          className={`relative w-full ${PANEL_HEIGHT} bg-theme-settings-input-bg rounded-lg overflow-hidden border transition-colors ${
            isDropTarget
              ? "border-sky-400 outline-dashed outline-2 -outline-offset-2 outline-sky-400"
              : "border-theme-modal-border"
          }`}
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
                  onUploadClick={openUploadFor}
                  onDragTargetChange={setDragFolder}
                  onContextMenu={handleContextMenu}
                />
              ))
            ) : searchResults ? (
              <div className="w-full h-full flex items-center justify-center">
                <p className="text-theme-text-secondary text-sm font-medium">
                  {t("connectors.directory.no-documents")}
                </p>
              </div>
            ) : (
              // An empty library has nothing to look at, so the panel becomes
              // the upload prompt itself rather than reading as a dead end.
              <button
                type="button"
                disabled={!uploadQueue.ready}
                onClick={() => openUploadFor(null)}
                className="w-full h-full flex flex-col items-center justify-center gap-y-1 disabled:cursor-not-allowed"
              >
                <UploadCloud className="w-8 h-8 text-theme-text-secondary" />
                <p className="text-theme-text-primary/80 text-sm font-semibold">
                  {uploadQueue.ready
                    ? t("connectors.upload.click-upload")
                    : t("connectors.upload.processor-offline")}
                </p>
                <p className="text-theme-text-secondary text-xs font-medium px-6 text-center">
                  {uploadQueue.ready
                    ? t("connectors.upload.file-types")
                    : t("connectors.upload.processor-offline-desc")}
                </p>
              </button>
            )}
          </div>

          {/* pointer-events-none: the strip sits over the panel and must not
              swallow the drop it is describing. */}
          {isDropTarget && (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex items-center justify-center gap-x-2 border-t border-sky-400/40 bg-theme-bg-secondary/95 py-2">
              <UploadCloud className="h-4 w-4 text-theme-text-primary" />
              <p className="text-theme-text-primary text-xs font-medium">
                {/* Name the destination while the drag is still in the air -
                    the whole point of per-folder targets is that the user can
                    see where the files are about to go. */}
                {dragFolder
                  ? t("connectors.upload.upload-into", {
                      folder: folderDisplayName(dragFolder),
                    })
                  : t("connectors.upload.drop-here", {
                      folder: folderDisplayName(DEFAULT_DOCUMENTS_FOLDER),
                    })}
              </p>
            </div>
          )}

          {/* Non-blocking status strip - mutations never blank the tree. */}
          {!!busyMessage && (
            <div className="absolute top-8 left-0 right-0 z-20 flex items-center justify-center gap-x-2 bg-theme-bg-secondary/95 border-b border-theme-modal-border py-1.5">
              <Spinner size="xs" />
              <p className="text-theme-text-primary text-xs font-medium">
                {busyMessage}
              </p>
            </div>
          )}

          {hasSelection && (
            <div className="absolute bottom-3 left-0 right-0 flex justify-center pointer-events-none">
              <div className="pointer-events-auto mx-auto flex items-center gap-x-1.5 rounded-lg bg-popover px-1.5 py-1 shadow-md ring-1 ring-foreground/10">
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
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        aria-label={t("connectors.directory.move-workspace")}
                      />
                    }
                  >
                    <FolderInput className="h-4 w-4" />
                  </DropdownMenuTrigger>
                  <FolderSelectionPopup
                    folders={folders}
                    onSelect={moveToFolder}
                  />
                </DropdownMenu>
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
        <div className="bg-black/60 backdrop-blur-xs fixed top-0 left-0 outline-none w-screen h-screen flex items-center justify-center z-30">
          <NewFolderModal
            closeModal={closeFolderModal}
            onCreated={handleFolderCreated}
            workspaceSlug={workspace?.slug ?? null}
          />
        </div>
      )}
      {visibilityFolder && (
        <FolderVisibilityModal
          folder={visibilityFolder}
          workspaceSlug={workspace?.slug ?? null}
          closeModal={() => setVisibilityFolder(null)}
          onChanged={handleVisibilityChanged}
        />
      )}
      {renamingFolder && (
        <RenameFolderModal
          folderName={renamingFolder}
          closeModal={() => setRenamingFolder(null)}
          onRenamed={handleFolderRenamed}
        />
      )}
      <ContextMenu
        contextMenu={contextMenu}
        closeContextMenu={closeContextMenu}
        allSelected={
          hasSelection && selectedFolderNames.length === folders.length
        }
        onSelectAll={selectAll}
        onClearSelection={clearSelection}
        onRenameFolder={openRenameFolder}
        onChangeVisibility={openFolderVisibility}
      />
      <ConfirmDialog config={confirm} onClose={() => setConfirm(null)} />
    </>
  );
}

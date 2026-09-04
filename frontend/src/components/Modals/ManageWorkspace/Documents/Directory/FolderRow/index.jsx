import { useState } from "react";
import { Spinner } from "@/components/ui/spinner";
import FileRow from "../FileRow";
import {
  ChevronDown,
  Folder,
  FolderOpen,
  Lock,
  Upload,
  Users,
} from "lucide-react";
import { folderDisplayName, middleTruncate } from "@/utils/directories";
import { useTranslation } from "react-i18next";
import { TableCell, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";

/**
 * A folder in the document picker. Purely presentational - every piece of
 * state (which files are loaded, whether it is open, what is selected) is
 * owned by `useDocumentPicker` so the row can never drift out of sync with
 * the rest of the picker.
 *
 * @param {object} props
 * @param {{name: string, fileCount: number}} props.item folder shell
 * @param {Array<object>} props.files files currently fetched for this folder
 * @param {boolean} props.expanded
 * @param {boolean} props.loading a page request is in flight
 * @param {boolean} props.hasMore more pages remain on the server
 * @param {number} props.totalCount server-side count, shown in "Load more"
 * @param {number} props.displayCount the badge next to the folder name; the
 * caller resolves this because it differs by context (matches while searching,
 * listable rows once fully fetched, the raw count before that)
 * @param {'none'|'some'|'all'} props.selectionState folder checkbox tri-state
 * @param {(id: string) => boolean} props.isFileSelected
 * @param {boolean} props.acceptsDrops whether files can be dropped onto this
 * row right now (false while the document processor is offline)
 * @param {(folderName: string, event: React.DragEvent) => void} props.onDropFiles
 * @param {(folderName: string) => void} props.onUploadClick opens a file picker
 * that uploads into this folder
 * @param {(folderName: string|null) => void} props.onDragTargetChange reports
 * this row becoming (or ceasing to be) the folder a drag would land in, so the
 * panel can name the destination while the drag is in flight
 * @param {(event: React.MouseEvent, folderName: string) => void} props.onContextMenu
 * opens the picker's context menu with this folder as its subject
 */
export default function FolderRow({
  item,
  files = [],
  expanded = false,
  loading = false,
  hasMore = false,
  totalCount = 0,
  displayCount = 0,
  selectionState = "none",
  isFileSelected,
  onToggleExpanded,
  onToggleFolder,
  onToggleFile,
  onPrefetch,
  onLoadMore,
  acceptsDrops = false,
  onDropFiles,
  onUploadClick,
  onDragTargetChange,
  onContextMenu,
}) {
  const { t } = useTranslation();
  const [isDropTarget, setIsDropTarget] = useState(false);
  const selected = selectionState === "all";
  const partial = selectionState === "some";
  // Every value sent to the server stays item.name - this is display only.
  const label = folderDisplayName(item.name);

  // Only react to drags carrying files - dragging text or a link over the
  // picker should not light every folder up.
  const dragHasFiles = (event) =>
    Array.from(event.dataTransfer?.types ?? []).includes("Files");

  const handleDragOver = (event) => {
    if (!acceptsDrops || !dragHasFiles(event)) return;
    // Both required, or the browser refuses the drop and opens the file.
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "copy";
    if (!isDropTarget) {
      setIsDropTarget(true);
      onDragTargetChange?.(item.name);
    }
  };

  const handleDragLeave = (event) => {
    // dragleave also fires when moving onto a child element, so ignore any
    // leave that lands somewhere still inside this row.
    if (event.currentTarget.contains(event.relatedTarget)) return;
    setIsDropTarget(false);
    onDragTargetChange?.(null);
  };

  const handleDrop = (event) => {
    setIsDropTarget(false);
    onDragTargetChange?.(null);
    if (!acceptsDrops || !dragHasFiles(event)) return;
    // preventDefault stops the browser from navigating to the dropped file;
    // stopPropagation keeps the drop from also being handled as an untargeted
    // one by anything above this row.
    event.preventDefault();
    event.stopPropagation();
    onDropFiles(item.name, event);
  };

  return (
    <>
      {/* Clicking the row opens the folder. Selection is the checkbox's job -
          a whole-row click is too easy to hit by accident for something that
          can stage hundreds of files for embedding. */}
      <TableRow
        onClick={() => onToggleExpanded(item.name)}
        onMouseEnter={() => onPrefetch(item.name)}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        // Stops the picker's own handler from also firing and opening the menu
        // with no folder attached.
        onContextMenu={(event) => {
          event.stopPropagation();
          onContextMenu(event, item.name);
        }}
        className={`grid grid-cols-12 py-2 pl-3.5 pr-8 hover:bg-theme-file-picker-hover cursor-pointer file-row ${
          selected || partial ? "selected light:text-white text-white!" : ""
        } ${
          isDropTarget
            ? "outline-dashed outline-2 -outline-offset-2 outline-sky-400 bg-sky-400/10"
            : ""
        }`}
      >
        <div
          className={`col-span-6 flex gap-x-2 items-center ${
            selected || partial ? "text-white!" : "text-theme-text-primary"
          }`}
        >
          <Checkbox
            checked={partial ? "indeterminate" : selected}
            className="shrink-0 h-3.5 w-3.5 border-white/60 data-[state=checked]:border-white data-[state=indeterminate]:border-white"
            onClick={(event) => {
              event.stopPropagation();
              onToggleFolder(item);
            }}
          />
          {/* No handler of its own - the row click already expands. */}
          <ChevronDown
            className={`h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${
              expanded ? "" : "-rotate-90"
            }`}
          />
          {expanded ? (
            <FolderOpen className="shrink-0 h-3.5 w-3.5 mr-[3px]" />
          ) : (
            <Folder className="shrink-0 h-3.5 w-3.5 mr-[3px]" />
          )}
          {/* The title carries the folder's real on-disk name, which is what
              the relabelled default folder is actually called. */}
          <p
            className="whitespace-nowrap overflow-show max-w-[400px]"
            title={item.name}
          >
            {middleTruncate(label, 35)}
          </p>
          <VisibilityBadge visibility={item.visibility} />
          {displayCount > 0 && (
            <span
              className={`text-theme-text-secondary text-[10px] font-medium ml-1.5 shrink-0 ${
                selected || partial ? "light:text-white!" : ""
              }`}
            >
              ({displayCount})
            </span>
          )}
          {loading && files.length > 0 && (
            <Spinner size="xs" className="ml-1 shrink-0" />
          )}
        </div>
        {/* Uploading is per-folder so the destination is never in question -
            this button and a drop onto this row put files in the same place.
            Always rendered rather than revealed on hover: it is the only
            pointer-driven way to upload, so it has to be findable. */}
        <div className="col-span-6 flex items-center justify-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={!acceptsDrops}
            aria-label={t("connectors.upload.upload-into", {
              folder: label,
            })}
            title={t("connectors.upload.upload-into", { folder: label })}
            onClick={(event) => {
              // The row click expands the folder; uploading should not.
              event.stopPropagation();
              onUploadClick(item.name);
            }}
            className="h-6 gap-x-1.5 px-2 text-xs text-theme-text-secondary hover:text-theme-text-primary"
          >
            <Upload className="h-3.5 w-3.5" />
            {t("connectors.upload.upload-files")}
          </Button>
        </div>
      </TableRow>
      {expanded && loading && files.length === 0 && (
        <TableRow className="text-theme-text-secondary py-2 pl-8 pr-8">
          <TableCell className="flex items-center gap-x-2 pl-8">
            <Spinner size="xs" />
            <span>{t("common.loading")}...</span>
          </TableCell>
        </TableRow>
      )}
      {expanded &&
        files.map((file) => (
          <FileRow
            key={file.id}
            item={file}
            selected={isFileSelected(file.id)}
            folderName={item.name}
            toggleSelection={onToggleFile}
          />
        ))}
      {expanded && hasMore && (
        <TableRow className="text-theme-text-secondary py-1 pl-8 pr-8">
          <TableCell className="py-1 pl-8">
            <Button
              variant="ghost"
              size="sm"
              onClick={(event) => {
                event.stopPropagation();
                onLoadMore(item.name);
              }}
              disabled={loading}
            >
              {loading
                ? `${t("common.loading")}...`
                : `Load more (${files.length} of ${totalCount})`}
            </Button>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

/**
 * Marks how far a folder reaches. `shared` gets no badge on purpose: it is the
 * level a folder with no ownership row falls back to, so badging it would put a
 * mark on every folder that predates visibility and imply a choice was made.
 */
function VisibilityBadge({ visibility }) {
  const { t } = useTranslation();
  if (visibility !== "private" && visibility !== "workspace") return null;

  const Icon = visibility === "private" ? Lock : Users;
  return (
    <span
      title={t(`connectors.directory.visibility.${visibility}`)}
      className="flex shrink-0 items-center gap-x-1 rounded-full bg-theme-bg-primary px-1.5 py-0.5 text-[10px] font-medium text-theme-text-secondary"
    >
      <Icon className="h-2.5 w-2.5" />
      {t(`connectors.directory.visibility.${visibility}`)}
    </span>
  );
}

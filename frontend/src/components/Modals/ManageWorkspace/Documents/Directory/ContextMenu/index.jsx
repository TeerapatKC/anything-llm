import { CheckSquare, FolderPen, Share2, Square, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { DEFAULT_DOCUMENTS_FOLDER } from "@/utils/directories";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * Right-click menu for the document picker.
 *
 * `DropdownMenu` anchors to its trigger, so the trigger here is a zero-size
 * element parked at the pointer coordinates — that buys the portal, the
 * dismiss-on-outside-click and the keyboard handling for free instead of
 * hand-rolling them again.
 *
 * `contextMenu.folderName` is set when the right-click landed on a folder row,
 * which is what makes the folder-specific entries meaningful - a right-click
 * anywhere else in the picker has no folder to act on.
 *
 * @param {{contextMenu: {visible: boolean, x: number, y: number, folderName: string|null}, closeContextMenu: function, allSelected: boolean, onSelectAll: function, onClearSelection: function, onRenameFolder: function}} props
 */
export default function ContextMenu({
  contextMenu,
  closeContextMenu,
  allSelected,
  onSelectAll,
  onClearSelection,
  onRenameFolder,
  onChangeVisibility,
}) {
  const { t } = useTranslation();
  const toggleSelectAll = () =>
    allSelected ? onClearSelection() : onSelectAll();
  // The default folder is the uploader's destination and the server refuses to
  // rename it, so it does not get the entry.
  const renameableFolder =
    contextMenu.folderName &&
    contextMenu.folderName !== DEFAULT_DOCUMENTS_FOLDER
      ? contextMenu.folderName
      : null;

  return (
    <DropdownMenu
      open={contextMenu.visible}
      onOpenChange={(open) => !open && closeContextMenu()}
    >
      <DropdownMenuTrigger
        render={<span aria-hidden="true" />}
        style={{
          position: "fixed",
          top: contextMenu.y,
          left: contextMenu.x,
          width: 0,
          height: 0,
        }}
      />
      <DropdownMenuContent align="start" className="min-w-[160px]">
        {renameableFolder && (
          <>
            <DropdownMenuItem onClick={() => onRenameFolder(renameableFolder)}>
              <FolderPen />
              {t("connectors.directory.rename-folder")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onChangeVisibility(renameableFolder)}
            >
              <Share2 />
              {t("connectors.directory.change-visibility")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem onClick={toggleSelectAll}>
          {allSelected ? <Square /> : <CheckSquare />}
          {allSelected ? "Unselect All" : "Select All"}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={closeContextMenu}>
          <X />
          Cancel
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

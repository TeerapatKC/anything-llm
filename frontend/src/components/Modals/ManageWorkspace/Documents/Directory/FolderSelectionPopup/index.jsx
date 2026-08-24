import { middleTruncate } from "@/utils/directories";
import {
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

/**
 * Folder picker for the "move to folder" action. Rendered inside the caller's
 * `DropdownMenu` so the popup is portalled above the file tree instead of being
 * clipped by it.
 * @param {{folders: {name: string}[], onSelect: function}} props
 */
export default function FolderSelectionPopup({ folders, onSelect }) {
  return (
    <DropdownMenuContent
      side="top"
      align="start"
      className="max-h-40 w-auto min-w-32"
    >
      {folders.map((folder) => (
        <DropdownMenuItem
          key={folder.name}
          onClick={() => onSelect(folder)}
          className="text-xs whitespace-nowrap"
        >
          {middleTruncate(folder.name, 25)}
        </DropdownMenuItem>
      ))}
    </DropdownMenuContent>
  );
}

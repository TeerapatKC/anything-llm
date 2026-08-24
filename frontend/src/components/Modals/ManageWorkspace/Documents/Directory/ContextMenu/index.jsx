import { CheckSquare, Square, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
 * @param {{contextMenu: {visible: boolean, x: number, y: number}, closeContextMenu: function, allSelected: boolean, onSelectAll: function, onClearSelection: function}} props
 */
export default function ContextMenu({
  contextMenu,
  closeContextMenu,
  allSelected,
  onSelectAll,
  onClearSelection,
}) {
  const toggleSelectAll = () =>
    allSelected ? onClearSelection() : onSelectAll();

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

import { useRef, useEffect } from "react";
import { CheckSquare, Square, X } from "lucide-react";

export default function ContextMenu({
  contextMenu,
  closeContextMenu,
  allSelected,
  onSelectAll,
  onClearSelection,
}) {
  const contextMenuRef = useRef(null);

  useEffect(() => {
    if (!contextMenu.visible) return;
    const handleClickOutside = (event) => {
      if (
        contextMenuRef.current &&
        !contextMenuRef.current.contains(event.target)
      ) {
        closeContextMenu();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [contextMenu.visible, closeContextMenu]);

  if (!contextMenu.visible) return null;

  const toggleSelectAll = () => {
    allSelected ? onClearSelection() : onSelectAll();
    closeContextMenu();
  };

  return (
    <div
      ref={contextMenuRef}
      style={{
        position: "fixed",
        top: `${contextMenu.y}px`,
        left: `${contextMenu.x}px`,
        zIndex: 1000,
      }}
      className="min-w-[160px] bg-theme-bg-secondary border border-theme-modal-border rounded-md shadow-lg py-1"
    >
      <button
        onClick={toggleSelectAll}
        className="flex items-center gap-x-2 w-full text-left px-3 py-1.5 text-sm text-theme-text-primary hover:bg-theme-file-picker-hover"
      >
        {allSelected ? (
          <Square className="h-3.5 w-3.5" />
        ) : (
          <CheckSquare className="h-3.5 w-3.5" />
        )}
        {allSelected ? "Unselect All" : "Select All"}
      </button>
      <button
        onClick={closeContextMenu}
        className="flex items-center gap-x-2 w-full text-left px-3 py-1.5 text-sm text-theme-text-primary hover:bg-theme-file-picker-hover"
      >
        <X className="h-3.5 w-3.5" />
        Cancel
      </button>
    </div>
  );
}

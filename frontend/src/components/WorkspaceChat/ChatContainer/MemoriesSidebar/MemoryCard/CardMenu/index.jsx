import { useTranslation } from "react-i18next";
import { ArrowLeftRight, Pencil, Trash2 } from "lucide-react";
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

/**
 * Actions for a memory card. Rendered inside the card's `DropdownMenu`, which
 * portals the popup out of the sidebar so no scrollable parent can clip it.
 * @param {Object} props
 * @param {boolean} props.isWorkspace
 * @param {boolean} props.canMove - hide the move option when the target scope is full
 * @param {function} props.onEdit
 * @param {function} props.onMove
 * @param {function} props.onDelete
 */
export default function CardMenu({
  isWorkspace,
  canMove,
  onEdit,
  onMove,
  onDelete,
}) {
  const { t } = useTranslation();

  return (
    <DropdownMenuContent align="end" className="w-[175px]">
      <DropdownMenuItem onClick={onEdit}>
        <Pencil />
        {t("chat_window.memories.menu.edit")}
      </DropdownMenuItem>
      {canMove && (
        <DropdownMenuItem onClick={onMove}>
          <ArrowLeftRight />
          {isWorkspace
            ? t("chat_window.memories.menu.move_to_global")
            : t("chat_window.memories.menu.move_to_workspace")}
        </DropdownMenuItem>
      )}
      <DropdownMenuSeparator />
      <DropdownMenuItem variant="destructive" onClick={onDelete}>
        <Trash2 />
        {t("chat_window.memories.menu.delete")}
      </DropdownMenuItem>
    </DropdownMenuContent>
  );
}

import { useRef, useState } from "react";
import System from "@/models/system";
import showToast from "@/utils/toast";
import { useModal } from "@/hooks/useModal";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import EditVariableModal from "./EditVariableModal";
import { titleCase } from "text-case";
import truncate from "truncate";
import { Pencil, Trash2 } from "lucide-react";
import { TableCell, TableHead, TableRow } from "@/components/ui/table";
import ConfirmDialog from "@/components/ConfirmDialog";
import TableRowActions from "@/components/lib/TableRowActions";
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

/**
 * A row component for displaying a system prompt variable
 * @param {{id: number|null, key: string, value: string, description: string, type: string}} variable - The system prompt variable to display
 * @param {Function} onRefresh - A function to call when the variable is refreshed
 * @returns {JSX.Element} A JSX element for displaying the variable
 */
export default function VariableRow({ variable, onRefresh }) {
  const rowRef = useRef(null);
  const { isOpen, openModal, closeModal } = useModal();
  const [confirm, setConfirm] = useState(null);

  const handleDelete = async () => {
    if (!variable.id) return;
    setConfirm({
      title: `Delete the variable "${variable.key}"?`,
      description: "This action is irreversible.",
      confirmText: "Delete",
      variant: "destructive",
      onConfirm: deleteVariable,
    });
  };

  const deleteVariable = async () => {
    try {
      await System.promptVariables.delete(variable.id);
      rowRef?.current?.remove();
      showToast("Variable deleted successfully", "success", { clear: true });
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error("Error deleting variable:", error);
      showToast("Failed to delete variable", "error", { clear: true });
    }
  };

  const getTypeColorTheme = (type) => {
    switch (type) {
      case "system":
        return {
          bg: "bg-blue-600/20",
          text: "text-blue-400 light:text-blue-800",
        };
      case "user":
        return {
          bg: "bg-green-600/20",
          text: "text-green-400 light:text-green-800",
        };
      case "workspace":
        return {
          bg: "bg-cyan-600/20",
          text: "text-cyan-400 light:text-cyan-800",
        };
      default:
        return {
          bg: "bg-yellow-600/20",
          text: "text-yellow-400 light:text-yellow-800",
        };
    }
  };

  const colorTheme = getTypeColorTheme(variable.type);

  return (
    <>
      <TableRow ref={rowRef}>
        <TableHead scope="row">{variable.key}</TableHead>
        <TableCell>
          {typeof variable.value === "function"
            ? variable.value()
            : truncate(variable.value, 50)}
        </TableCell>
        <TableCell>{truncate(variable.description || "-", 50)}</TableCell>
        <TableCell>
          <span
            className={`rounded-full ${colorTheme.bg} px-2 py-0.5 text-xs leading-5 font-semibold ${colorTheme.text} shadow-xs`}
          >
            {titleCase(variable?.type ?? "static")}
          </span>
        </TableCell>
        <TableCell className="text-right">
          <TableRowActions>
            {variable.type === "static" && (
              <>
                <DropdownMenuItem onClick={openModal}>
                  <Pencil />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={handleDelete}>
                  <Trash2 />
                  Delete
                </DropdownMenuItem>
              </>
            )}
          </TableRowActions>
        </TableCell>
      </TableRow>
      <Dialog
        open={isOpen}
        onOpenChange={(open) => (open ? openModal() : closeModal())}
      >
        <DialogContent>
          <EditVariableModal
            variable={variable}
            closeModal={closeModal}
            onRefresh={onRefresh}
          />
        </DialogContent>
      </Dialog>
      <ConfirmDialog config={confirm} onClose={() => setConfirm(null)} />
    </>
  );
}

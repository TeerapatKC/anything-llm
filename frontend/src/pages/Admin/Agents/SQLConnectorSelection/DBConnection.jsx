import PostgreSQLLogo from "./icons/postgresql.png";
import MySQLLogo from "./icons/mysql.png";
import MSSQLLogo from "./icons/mssql.png";
import { PencilSimple, X } from "@phosphor-icons/react";
import { useState } from "react";
import { useModal } from "@/hooks/useModal";
import EditSQLConnection from "./SQLConnectionModal";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import ConfirmDialog from "@/components/ConfirmDialog";

export const DB_LOGOS = {
  postgresql: PostgreSQLLogo,
  mysql: MySQLLogo,
  "sql-server": MSSQLLogo,
};

export default function DBConnection({
  connection,
  onRemove,
  onUpdate,
  setHasChanges,
  connections = [],
}) {
  const { database_id, engine } = connection;
  const { isOpen, openModal, closeModal } = useModal();
  const [confirm, setConfirm] = useState(null);

  function removeConfirmation() {
    setConfirm({
      title: `Delete ${database_id}?`,
      description:
        "It will be removed from the list of available SQL connections. This cannot be undone.",
      confirmText: "Delete",
      variant: "destructive",
      onConfirm: () => onRemove(database_id),
    });
  }

  return (
    <div className="flex gap-x-4 items-center">
      <img
        src={DB_LOGOS?.[engine] ?? null}
        alt={`${engine} logo`}
        className="w-10 h-10 rounded-md"
      />
      <div className="flex w-full items-center justify-between">
        <div className="flex flex-col">
          <div className="text-sm font-semibold text-white">{database_id}</div>
          <div className="mt-1 text-xs text-description">{engine}</div>
        </div>
        <div className="flex gap-x-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="border-none text-theme-text-secondary hover:text-theme-text-primary transition-colors duration-200 p-1 rounded"
                onClick={openModal}
              >
                <PencilSimple size={18} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[250px] text-xs">
              Edit SQL connection
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={removeConfirmation}
                className="border-none text-theme-text-secondary hover:text-red-500"
              >
                <X size={18} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[250px] text-xs">
              Delete SQL connection
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
      <EditSQLConnection
        isOpen={isOpen}
        closeModal={closeModal}
        existingConnection={connection}
        onSubmit={onUpdate}
        setHasChanges={setHasChanges}
        connections={connections}
      />
      <ConfirmDialog config={confirm} onClose={() => setConfirm(null)} />
    </div>
  );
}

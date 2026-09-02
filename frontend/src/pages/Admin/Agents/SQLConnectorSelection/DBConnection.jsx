import PostgreSQLLogo from "./icons/postgresql.png";
import { useTranslation } from "react-i18next";
import MySQLLogo from "./icons/mysql.png";
import MSSQLLogo from "./icons/mssql.png";
import { Pencil, Settings, Trash2 } from "lucide-react";
import { useState } from "react";
import { useModal } from "@/hooks/useModal";
import EditSQLConnection from "./SQLConnectionModal";
import ConnectionWorkspaceVisibility from "./ConnectionWorkspaceVisibility";
import Toggle from "@/components/lib/Toggle";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ConfirmDialog from "@/components/ConfirmDialog";

export const DB_LOGOS = {
  postgresql: PostgreSQLLogo,
  mysql: MySQLLogo,
  "sql-server": MSSQLLogo,
};

function ManageConnectionMenu({ onEdit, onDelete }) {
  const { t } = useTranslation();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t("sql-connector.manage.aria-label")}
          />
        }
      >
        <Settings />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuItem onClick={onEdit}>
          <Pencil />
          {t("sql-connector.manage.edit")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={onDelete}>
          <Trash2 />
          {t("sql-connector.manage.delete")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * The detail panel for one selected SQL connection. Mirrors `FlowPanel`
 * exactly - icon/name header with an on/off switch and a manage menu, a
 * caption line, then which workspaces can use it.
 */
export default function DBConnection({
  connection,
  onRemove,
  onUpdate,
  onToggleActive,
  setHasChanges,
  connections = [],
}) {
  const { t } = useTranslation();
  const { database_id, engine, active } = connection;
  const isActive = active !== false;
  const { isOpen, openModal, closeModal } = useModal();
  const [confirm, setConfirm] = useState(null);
  const [toggling, setToggling] = useState(false);

  function removeConfirmation() {
    setConfirm({
      title: t("sql-connector.manage.delete-title", { name: database_id }),
      description: t("sql-connector.manage.delete-description"),
      confirmText: t("sql-connector.manage.delete-confirm"),
      variant: "destructive",
      onConfirm: () => onRemove(database_id),
    });
  }

  async function handleToggleActive() {
    setToggling(true);
    await onToggleActive(database_id, !isActive);
    setToggling(false);
  }

  return (
    <>
      <div className="p-2">
        <div className="flex flex-col gap-y-[18px] max-w-[500px]">
          <div className="flex w-full justify-between items-center">
            <div className="flex items-center gap-x-2">
              <img
                src={DB_LOGOS?.[engine] ?? null}
                alt={`${engine} logo`}
                className="h-7 w-7 rounded"
              />
              <label
                htmlFor="name"
                className="text-theme-text-primary text-md font-bold"
              >
                {database_id}
              </label>
            </div>
            <div className="flex items-center gap-x-2">
              <Toggle
                size="lg"
                enabled={isActive}
                disabled={toggling}
                onChange={handleToggleActive}
              />
              <ManageConnectionMenu
                onEdit={openModal}
                onDelete={removeConfirmation}
              />
            </div>
          </div>
          <p className="text-theme-text-primary/60 text-xs font-medium py-1.5">
            {engine}
          </p>
          <ConnectionWorkspaceVisibility databaseId={database_id} />
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
    </>
  );
}

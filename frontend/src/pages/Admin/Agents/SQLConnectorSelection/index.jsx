import React, { useEffect, useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Spinner } from "@/components/ui/spinner";
import DBConnection from "./DBConnection";
import ConnectionsList from "./ConnectionsList";
import { Database, Plus } from "lucide-react";
import NewSQLConnection from "./SQLConnectionModal";
import { useModal } from "@/hooks/useModal";
import Admin from "@/models/admin";
import System from "@/models/system";
import showToast from "@/utils/toast";
import Toggle from "@/components/lib/Toggle";

/**
 * The SQL Connector admin screen - a two-pane layout matching Agent Flow's:
 * a list of connections on the left, the selected one's full detail (its own
 * on/off switch, edit/delete, and workspace visibility) on the right.
 */
export default function AgentSQLConnectorSelection({
  skill,
  toggleSkill,
  enabled = false,
  setHasChanges,
  hasChanges = false,
}) {
  const { t } = useTranslation();
  const { isOpen, openModal, closeModal } = useModal();
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const prevHasChanges = useRef(hasChanges);

  const liveConnections = connections.filter(
    (conn) => conn.action !== "remove"
  );
  const selectedConnection = liveConnections.find(
    (conn) => conn.database_id === selectedId
  );

  // Load connections on mount
  useEffect(() => {
    setLoading(true);
    Admin.systemPreferencesByFields(["agent_sql_connections"])
      .then((res) => {
        const list = res?.settings?.agent_sql_connections ?? [];
        setConnections(list);
        setSelectedId((prev) => prev ?? list[0]?.database_id ?? null);
      })
      .catch(() => setConnections([]))
      .finally(() => setLoading(false));
  }, []);

  // Refresh connections from backend when save completes (hasChanges: true -> false)
  // This ensures we get clean data without stale action properties
  useEffect(() => {
    if (prevHasChanges.current === true && hasChanges === false) {
      Admin.systemPreferencesByFields(["agent_sql_connections"])
        .then((res) =>
          setConnections(res?.settings?.agent_sql_connections ?? [])
        )
        .catch(() => {});
    }
    prevHasChanges.current = hasChanges;
  }, [hasChanges]);

  /**
   * Marks a connection for removal by adding action: "remove".
   * The connection stays in the array (for undo capability) until saved.
   * @param {string} databaseId - The database_id of the connection to remove
   */
  function handleRemoveConnection(databaseId) {
    setHasChanges(true);
    setConnections((prev) =>
      prev.map((conn) => {
        if (conn.database_id === databaseId)
          return { ...conn, action: "remove" };
        return conn;
      })
    );
    setSelectedId((prev) => {
      if (prev !== databaseId) return prev;
      const remaining = liveConnections.filter(
        (conn) => conn.database_id !== databaseId
      );
      return remaining[0]?.database_id ?? null;
    });
  }

  /**
   * Updates an existing connection by replacing it in the local state.
   * This removes the old connection (by originalDatabaseId) and adds the updated version.
   *
   * Note: The old connection is removed from local state immediately, but the backend
   * handles the actual update logic when saved. See mergeConnections in server/models/systemSettings.js
   *
   * @param {Object} updatedConnection - The updated connection data
   * @param {string} updatedConnection.originalDatabaseId - The original database_id before the update
   * @param {string} updatedConnection.database_id - The new database_id
   * @param {string} updatedConnection.action - Should be "update"
   */
  function handleUpdateConnection(updatedConnection) {
    setHasChanges(true);
    setConnections((prev) =>
      prev.map((conn) =>
        conn.database_id === updatedConnection.originalDatabaseId
          ? updatedConnection
          : conn
      )
    );
    setSelectedId((prev) =>
      prev === updatedConnection.originalDatabaseId
        ? updatedConnection.database_id
        : prev
    );
  }
  /**
   * Adds a new connection to the local state with action: "add".
   * The backend will validate and deduplicate when saved.
   * @param {Object} newConnection - The new connection data with action: "add"
   */
  function handleAddConnection(newConnection) {
    setHasChanges(true);
    setConnections((prev) => [...prev, newConnection]);
    setSelectedId(newConnection.database_id);
  }

  /**
   * Turns a connection on/off. Takes effect immediately (its own endpoint,
   * separate from the batched "Save changes" flow the rest of this form uses)
   * so switching a database off doesn't require a page-wide save.
   * @param {string} databaseId
   * @param {boolean} nextActive
   */
  async function handleToggleActive(databaseId, nextActive) {
    const { success, error } = await System.toggleSQLConnection(
      databaseId,
      nextActive
    );
    if (!success) {
      showToast(error || t("sql-connector.toggle-failed"), "error", {
        clear: true,
      });
      return;
    }
    setConnections((prev) =>
      prev.map((conn) =>
        conn.database_id === databaseId ? { ...conn, active: nextActive } : conn
      )
    );
  }

  return (
    <>
      <div className="flex min-h-0 flex-1 gap-6">
        {/* Connections list */}
        <div className="flex min-h-0 w-[400px] shrink-0 flex-col overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
          <div className="flex-none border-b border-theme-sidebar-border bg-sidebar-accent/40 px-5 py-4">
            <h2 className="text-base font-semibold text-theme-text-primary">
              {t("sql-connector.title")}
            </h2>
            <p className="mt-1 text-sm text-theme-text-secondary">
              {t("sql-connector.list-description")}
            </p>
          </div>

          <div className="thin-scrollbar min-h-0 flex-1 overflow-y-auto p-3">
            <div className="space-y-4">
              <div className="text-theme-text-primary flex items-center justify-between gap-x-2">
                <div className="flex items-center gap-x-2">
                  <Database size={24} />
                  <p className="text-lg font-medium">
                    {t("sql-connector.connections-heading")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={openModal}
                  className="text-cta-button flex items-center gap-x-1 hover:underline"
                >
                  <Plus size={16} />
                  <p className="text-sm">{t("sql-connector.new-connection")}</p>
                </button>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-theme-bg-secondary px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-theme-text-primary">
                    {t("sql-connector.enable-title")}
                  </p>
                  <p className="text-xs text-theme-text-secondary">
                    {t("sql-connector.enable-description")}
                  </p>
                </div>
                <Toggle
                  size="lg"
                  enabled={enabled}
                  onChange={() => toggleSkill(skill)}
                />
              </div>

              <input
                name="system::agent_sql_connections"
                type="hidden"
                value={JSON.stringify(connections)}
              />

              {!enabled ? (
                <p className="text-sm text-theme-text-secondary">
                  {t("sql-connector.enable-first")}
                </p>
              ) : loading ? (
                <div className="flex items-center justify-center py-4">
                  <Spinner size="lg" className="text-theme-text-primary" />
                </div>
              ) : (
                <ConnectionsList
                  connections={liveConnections}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                />
              )}
            </div>
          </div>
        </div>

        {/* Selected connection detail */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="thin-scrollbar min-h-0 flex-1 overflow-y-auto overflow-x-visible rounded-xl bg-card ring-1 ring-foreground/10 p-5 text-theme-text-primary">
            {enabled && selectedConnection ? (
              <DBConnection
                key={selectedConnection.database_id}
                connection={selectedConnection}
                onRemove={handleRemoveConnection}
                onUpdate={handleUpdateConnection}
                onToggleActive={handleToggleActive}
                setHasChanges={setHasChanges}
                connections={connections}
              />
            ) : (
              <div className="flex h-full min-h-64 flex-col items-center justify-center px-6 text-center text-theme-text-secondary">
                <span className="mb-3 flex size-12 items-center justify-center rounded-xl bg-muted/40">
                  <Database size={24} />
                </span>
                <h2 className="font-medium text-theme-text-primary">
                  {enabled
                    ? t("sql-connector.select-connection")
                    : t("sql-connector.connector-off")}
                </h2>
                <p className="mt-1 max-w-sm text-sm">
                  {enabled
                    ? t("sql-connector.select-connection-description")
                    : t("sql-connector.connector-off-description")}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
      <NewSQLConnection
        isOpen={isOpen}
        closeModal={closeModal}
        setHasChanges={setHasChanges}
        onSubmit={handleAddConnection}
        connections={connections}
      />
    </>
  );
}

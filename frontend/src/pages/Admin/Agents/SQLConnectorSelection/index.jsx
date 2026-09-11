import React, { useCallback, useEffect, useState } from "react";
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
}) {
  const { t } = useTranslation();
  const { isOpen, openModal, closeModal } = useModal();
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [connectionVersion, setConnectionVersion] = useState(0);

  const liveConnections = connections.filter(
    (conn) => conn.action !== "remove"
  );
  const selectedConnection = liveConnections.find(
    (conn) => conn.database_id === selectedId
  );

  const fetchConnections = useCallback(async (preferredId = null) => {
    setLoading(true);
    try {
      const res = await Admin.systemPreferencesByFields([
        "agent_sql_connections",
      ]);
      const list = res?.settings?.agent_sql_connections ?? [];
      setConnections(list);
      setSelectedId((current) => {
        const requested = preferredId ?? current;
        return list.some((item) => item.database_id === requested)
          ? requested
          : (list[0]?.database_id ?? null);
      });
    } catch {
      setConnections([]);
      setSelectedId(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  async function persistConnection(update, preferredId = null) {
    const { success, error } = await Admin.updateSystemPreferences({
      agent_sql_connections: JSON.stringify([update]),
    });
    if (!success) {
      showToast(error || t("sql-connector.save-failed"), "error", {
        clear: true,
      });
      return false;
    }
    await fetchConnections(preferredId);
    // Remount the detail panel after every credential write so workspace visibility
    // is fetched immediately from the backend as part of the completed save.
    setConnectionVersion((version) => version + 1);
    showToast(t("sql-connector.saved"), "success", { clear: true });
    return true;
  }

  /**
   * Removes a connection immediately and refreshes the persisted list.
   * @param {string} databaseId - The database_id of the connection to remove
   */
  async function handleRemoveConnection(databaseId) {
    return persistConnection({ database_id: databaseId, action: "remove" });
  }

  /**
   * Updates an existing connection immediately.
   *
   * @param {Object} updatedConnection - The updated connection data
   * @param {string} updatedConnection.originalDatabaseId - The original database_id before the update
   * @param {string} updatedConnection.database_id - The new database_id
   * @param {string} updatedConnection.action - Should be "update"
   */
  async function handleUpdateConnection(updatedConnection) {
    return persistConnection(updatedConnection, updatedConnection.database_id);
  }
  /**
   * Adds a new connection immediately.
   * @param {Object} newConnection - The new connection data with action: "add"
   */
  async function handleAddConnection(newConnection) {
    return persistConnection(newConnection, newConnection.database_id);
  }

  /**
   * Turns a connection on/off immediately through its dedicated endpoint.
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
      <div className="flex w-full flex-col gap-4 min-[1100px]:min-h-0 min-[1100px]:flex-1 min-[1100px]:flex-row min-[1100px]:gap-6">
        {/* Connections list */}
        <div className="flex w-full flex-col overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10 min-[1100px]:min-h-0 min-[1100px]:w-[400px] min-[1100px]:shrink-0">
          <div className="flex-none border-b border-theme-sidebar-border bg-sidebar-accent/40 px-5 py-4">
            <h2 className="text-base font-semibold text-theme-text-primary">
              {t("sql-connector.title")}
            </h2>
            <p className="mt-1 text-sm text-theme-text-secondary">
              {t("sql-connector.list-description")}
            </p>
          </div>

          <div className="thin-scrollbar p-3 min-[1100px]:min-h-0 min-[1100px]:flex-1 min-[1100px]:overflow-y-auto">
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
        <div className="flex w-full flex-col min-[1100px]:min-w-0 min-[1100px]:flex-1">
          <div className="thin-scrollbar min-h-64 overflow-x-visible rounded-xl bg-card p-4 text-theme-text-primary ring-1 ring-foreground/10 [overflow-anchor:none] min-[1100px]:min-h-0 min-[1100px]:flex-1 min-[1100px]:overflow-y-auto min-[1100px]:p-5">
            {enabled && selectedConnection ? (
              <DBConnection
                key={`${selectedConnection.database_id}:${connectionVersion}`}
                connection={selectedConnection}
                onRemove={handleRemoveConnection}
                onUpdate={handleUpdateConnection}
                onToggleActive={handleToggleActive}
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
        onSubmit={handleAddConnection}
        connections={connections}
      />
    </>
  );
}

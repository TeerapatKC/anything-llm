import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Building2 } from "lucide-react";
import System from "@/models/system";
import showToast from "@/utils/toast";
import Toggle from "@/components/lib/Toggle";
import { Button } from "@/components/ui/button";

/**
 * Lets a super admin choose exactly which workspaces' agents can see and query
 * one SQL connection. Reuses the same per-workspace `agentSkillConfig.activeSqlConnections`
 * storage each workspace's own Agent Skills screen already writes to - this is
 * just a connection-centric view over the same data, mirroring how Agent Flow
 * visibility works.
 *
 * Each toggle saves itself immediately (like the connection's own on/off switch
 * above it) rather than requiring a separate "Save visibility" click - this used
 * to be its own batched save, distinct from the page's main Save button, so a
 * visibility-only change needed both buttons clicked to actually stick.
 */
export default function ConnectionWorkspaceVisibility({ databaseId }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [workspaces, setWorkspaces] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());

  useEffect(() => {
    async function fetchWorkspaces() {
      setLoading(true);
      const { success, workspaces: list } =
        await System.getSQLConnectionWorkspaces(databaseId);
      setWorkspaces(success ? list : []);
      setSelectedIds(
        new Set(success ? list.filter((w) => w.enabled).map((w) => w.id) : [])
      );
      setLoading(false);
    }
    fetchWorkspaces();
  }, [databaseId]);

  /**
   * Persists the given set of workspace ids as this connection's full
   * visibility list, optimistically applying it first and rolling back on
   * failure.
   * @param {Set<number>} nextIds
   */
  async function persist(nextIds) {
    const prevIds = selectedIds;
    setSelectedIds(nextIds);
    setSaving(true);
    const { success, error } = await System.updateSQLConnectionWorkspaces(
      databaseId,
      Array.from(nextIds)
    );
    setSaving(false);
    if (!success) {
      setSelectedIds(prevIds);
      showToast(error || t("sql-connector.visibility.failed"), "error", {
        clear: true,
      });
      return;
    }
    setWorkspaces((prev) =>
      prev.map((w) => ({ ...w, enabled: nextIds.has(w.id) }))
    );
  }

  function toggleWorkspace(id, enabled) {
    const next = new Set(selectedIds);
    if (enabled) next.add(id);
    else next.delete(id);
    persist(next);
  }

  const allSelected =
    workspaces.length > 0 && selectedIds.size === workspaces.length;

  function toggleSelectAll() {
    persist(allSelected ? new Set() : new Set(workspaces.map((w) => w.id)));
  }

  return (
    <div
      className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10"
      // These toggles save themselves immediately, but their underlying
      // <input> still sits inside the page's big settings <form>, which has
      // its own onChange listener that flags the whole page "unsaved" on any
      // field change. Stop it here so a self-saving toggle doesn't also pop
      // up the page-level Save bar for a change that's already persisted.
      onChange={(e) => e.stopPropagation()}
    >
      <div className="flex items-center gap-2 border-b border-theme-sidebar-border bg-sidebar-accent/40 px-4 py-3">
        <Building2 size={17} className="text-theme-text-secondary" />
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-theme-text-primary">
            {t("sql-connector.visibility.title")}
          </h3>
          <p className="mt-0.5 text-xs text-theme-text-secondary">
            {t("sql-connector.visibility.description")}
          </p>
        </div>
        {workspaces.length > 0 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={saving}
            onClick={toggleSelectAll}
          >
            {allSelected
              ? t("sql-connector.visibility.clear-all")
              : t("sql-connector.visibility.select-all")}
          </Button>
        )}
      </div>

      {loading ? (
        <p className="px-4 py-3 text-xs text-theme-text-secondary">
          {t("sql-connector.visibility.loading")}
        </p>
      ) : workspaces.length === 0 ? (
        <p className="px-4 py-3 text-xs text-theme-text-primary/40">
          {t("sql-connector.visibility.empty")}
        </p>
      ) : (
        <div className="thin-scrollbar flex max-h-[320px] flex-col gap-y-2 overflow-y-auto p-3">
          {workspaces.map((ws) => (
            <div
              key={ws.id}
              className="rounded-lg bg-muted/10 ring-1 ring-foreground/10 p-3"
            >
              <Toggle
                size="md"
                variant="horizontal"
                label={ws.name}
                enabled={selectedIds.has(ws.id)}
                disabled={saving}
                onChange={(checked) => toggleWorkspace(ws.id, checked)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

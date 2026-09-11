import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Building2 } from "lucide-react";
import System from "@/models/system";
import showToast from "@/utils/toast";
import Toggle from "@/components/lib/Toggle";
import { Button } from "@/components/ui/button";

/**
 * Lets a super admin choose exactly which workspaces' agents can use the tools on one
 * instance-wide MCP server. Reuses the same per-workspace
 * `agentSkillConfig.activeMcpServers` storage each workspace's own Agent Skills screen
 * writes to - this is just a server-centric view over the same data, mirroring how SQL
 * connection and agent flow visibility work.
 *
 * Each toggle saves itself immediately rather than waiting on a separate "save
 * visibility" click, for the same reason as the SQL screen: a visibility-only change
 * that needs a second button is a change people lose.
 *
 * A server one workspace owns has no panel here at all. It is visible to exactly that
 * workspace by construction, and there is nothing to hand out.
 */
export default function ServerWorkspaceVisibility({ serverName, scope }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [workspaces, setWorkspaces] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const workspaceOwned = scope === "workspace";

  useEffect(() => {
    async function fetchWorkspaces() {
      if (workspaceOwned) return setLoading(false);
      setLoading(true);
      const { success, workspaces: list } =
        await System.getMCPServerWorkspaces(serverName);
      setWorkspaces(success ? list : []);
      setSelectedIds(
        new Set(success ? list.filter((w) => w.enabled).map((w) => w.id) : [])
      );
      setLoading(false);
    }
    fetchWorkspaces();
  }, [serverName, workspaceOwned]);

  /**
   * Persists the given set of workspace ids as this server's full visibility list,
   * optimistically applying it first and rolling back on failure.
   * @param {Set<number>} nextIds
   */
  async function persist(nextIds) {
    const prevIds = selectedIds;
    setSelectedIds(nextIds);
    setSaving(true);
    const { success, error } = await System.updateMCPServerWorkspaces(
      serverName,
      Array.from(nextIds)
    );
    setSaving(false);
    if (!success) {
      setSelectedIds(prevIds);
      showToast(error || t("mcp-servers.visibility.failed"), "error", {
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
      // These toggles save themselves immediately, but their underlying <input> may
      // still sit inside a page-level settings <form> that flags itself "unsaved" on
      // any field change. Stop it here so a self-saving toggle doesn't also pop up a
      // Save bar for a change that is already persisted.
      onChange={(e) => e.stopPropagation()}
    >
      <div className="flex items-center gap-2 border-b border-theme-sidebar-border bg-sidebar-accent/40 px-4 py-3">
        <Building2 size={17} className="text-theme-text-secondary" />
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-theme-text-primary">
            {t("mcp-servers.visibility.title")}
          </h3>
          <p className="mt-0.5 text-xs text-theme-text-secondary">
            {t("mcp-servers.visibility.description")}
          </p>
        </div>
        {!workspaceOwned && workspaces.length > 0 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={saving}
            onClick={toggleSelectAll}
          >
            {allSelected
              ? t("mcp-servers.visibility.clear-all")
              : t("mcp-servers.visibility.select-all")}
          </Button>
        )}
      </div>

      {workspaceOwned ? (
        <p className="px-4 py-3 text-xs text-theme-text-secondary">
          {t("mcp-servers.visibility.workspace-owned")}
        </p>
      ) : loading ? (
        <p className="px-4 py-3 text-xs text-theme-text-secondary">
          {t("mcp-servers.visibility.loading")}
        </p>
      ) : workspaces.length === 0 ? (
        <p className="px-4 py-3 text-xs text-theme-text-primary/40">
          {t("mcp-servers.visibility.empty")}
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

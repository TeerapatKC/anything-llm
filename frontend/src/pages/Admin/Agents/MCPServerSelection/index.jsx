import React, { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, RotateCw, Server } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import ConfirmDialog from "@/components/ConfirmDialog";
import MCPServers from "@/models/mcpServers";
import showToast from "@/utils/toast";
import { MCPServersList } from "../MCPServers";
import ServerPanel from "../MCPServers/ServerPanel";
import AddServerModal from "../MCPServers/AddServerModal";

/**
 * The MCP Servers admin screen - a two-pane layout matching the SQL Connector's:
 * a list of servers on the left, the selected one's full detail (its start/stop
 * switch, edit/delete, per-tool switches, and workspace visibility) on the right.
 *
 * This used to be a section inside the Agent Skills page. It is its own screen for the
 * same reason the SQL Connector became one: what is configured here is an instance-wide
 * credential pointed at an outside service, and deciding which workspaces may use it is
 * a job of its own rather than a footnote under the skill list.
 */
export default function AgentMCPServerSelection() {
  const { t } = useTranslation();
  const [servers, setServers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedName, setSelectedName] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [showAddServer, setShowAddServer] = useState(false);

  const selectedServer = servers.find((server) => server.name === selectedName);

  const fetchServers = useCallback(async (preferredName = null) => {
    setLoading(true);
    const { servers: list = [] } = await MCPServers.listServers();
    setServers(list);
    setSelectedName((current) => {
      const requested = preferredName ?? current;
      return list.some((server) => server.name === requested)
        ? requested
        : (list[0]?.name ?? null);
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchServers();
  }, [fetchServers]);

  /** Restart every server and reload the tools each one advertises. */
  function refreshServers() {
    setConfirm({
      title: t("mcp-servers.refresh-title"),
      description: t("mcp-servers.refresh-description"),
      confirmText: t("mcp-servers.refresh-confirm"),
      variant: "default",
      onConfirm: async () => {
        setLoading(true);
        const { servers: list = [], success } = await MCPServers.forceReload();
        if (!success && list.length === 0)
          showToast(t("mcp-servers.refresh-failed"), "error", { clear: true });
        setServers(list);
        setLoading(false);
      },
    });
  }

  function handleCreated(server, warning) {
    if (server) {
      setServers((current) => [
        ...current.filter((item) => item.name !== server.name),
        server,
      ]);
      setSelectedName(server.name);
    }
    showToast(
      warning || t("mcp-servers.created"),
      warning ? "warning" : "success",
      { clear: true }
    );
  }

  /** Reflect a start/stop without refetching the whole list. */
  function toggleServer(name) {
    setServers((prev) =>
      prev.map((server) =>
        server.name === name ? { ...server, running: !server.running } : server
      )
    );
  }

  function handleDelete(name) {
    setSelectedName(null);
    setServers((prev) => prev.filter((server) => server.name !== name));
  }

  function handleUpdated(updatedServer, previousName) {
    setServers((prev) =>
      prev.map((server) =>
        server.name === previousName ? updatedServer : server
      )
    );
    setSelectedName(updatedServer.name);
  }

  async function handleToolToggle(serverName, toolName, enabled) {
    const { success, error, suppressedTools } = await MCPServers.toggleTool(
      serverName,
      toolName,
      enabled
    );
    if (!success) {
      showToast(error || t("agent-panel.toggle-tool-failed"), "error", {
        clear: true,
      });
      return;
    }
    setServers((prev) =>
      prev.map((server) =>
        server.name === serverName
          ? {
              ...server,
              config: {
                ...server.config,
                nexusai: { ...server.config?.nexusai, suppressedTools },
              },
            }
          : server
      )
    );
  }

  return (
    <>
      <div className="flex w-full flex-col gap-4 min-[1100px]:min-h-0 min-[1100px]:flex-1 min-[1100px]:flex-row min-[1100px]:gap-6">
        {/* Server list */}
        <div className="flex w-full flex-col overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10 min-[1100px]:min-h-0 min-[1100px]:w-[400px] min-[1100px]:shrink-0">
          <div className="flex-none border-b border-theme-sidebar-border bg-sidebar-accent/40 px-5 py-4">
            <h2 className="text-base font-semibold text-theme-text-primary">
              {t("mcp-servers.title")}
            </h2>
            <p className="mt-1 text-sm text-theme-text-secondary">
              {t("mcp-servers.list-description")}
            </p>
          </div>

          <div className="thin-scrollbar p-3 min-[1100px]:min-h-0 min-[1100px]:flex-1 min-[1100px]:overflow-y-auto">
            <div className="space-y-4">
              <div className="text-theme-text-primary flex items-center justify-between gap-x-2">
                <div className="flex items-center gap-x-2">
                  <Server size={24} />
                  <p className="text-lg font-medium">
                    {t("mcp-servers.servers-heading")}
                  </p>
                </div>
                <div className="flex items-center gap-x-3">
                  <button
                    type="button"
                    onClick={() => setShowAddServer(true)}
                    className="text-cta-button flex items-center gap-x-1 hover:underline"
                  >
                    <Plus size={16} />
                    <p className="text-sm">{t("mcp-servers.new-server")}</p>
                  </button>
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={refreshServers}
                          disabled={loading}
                          aria-label={t("common.refresh")}
                        />
                      }
                    >
                      <RotateCw
                        size={16}
                        className={loading ? "animate-spin" : ""}
                      />
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      {loading
                        ? `${t("common.loading")}...`
                        : t("common.refresh")}
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-4">
                  <Spinner size="lg" className="text-theme-text-primary" />
                </div>
              ) : servers.length === 0 ? (
                <p className="text-theme-text-secondary text-center text-xs">
                  {t("mcp-servers.empty-list")}
                </p>
              ) : (
                <MCPServersList
                  servers={servers}
                  selectedServer={selectedServer}
                  handleClick={(server) => setSelectedName(server.name)}
                />
              )}
            </div>
          </div>
        </div>

        {/* Selected server detail */}
        <div className="flex w-full flex-col min-[1100px]:min-w-0 min-[1100px]:flex-1">
          <div className="thin-scrollbar min-h-64 overflow-x-visible rounded-xl bg-card p-4 text-theme-text-primary ring-1 ring-foreground/10 [overflow-anchor:none] min-[1100px]:min-h-0 min-[1100px]:flex-1 min-[1100px]:overflow-y-auto min-[1100px]:p-5">
            {selectedServer ? (
              <ServerPanel
                key={selectedServer.name}
                server={selectedServer}
                toggleServer={toggleServer}
                onDelete={handleDelete}
                onUpdated={handleUpdated}
                onToggleTool={handleToolToggle}
                showWorkspaceVisibility
              />
            ) : (
              <div className="flex h-full min-h-64 flex-col items-center justify-center px-6 text-center text-theme-text-secondary">
                <span className="mb-3 flex size-12 items-center justify-center rounded-xl bg-muted/40">
                  <Server size={24} />
                </span>
                <h2 className="font-medium text-theme-text-primary">
                  {t("mcp-servers.select-server")}
                </h2>
                <p className="mt-1 max-w-sm text-sm">
                  {t("mcp-servers.select-server-description")}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <Dialog open={showAddServer} onOpenChange={setShowAddServer}>
        <DialogContent size="md">
          <AddServerModal
            closeModal={() => setShowAddServer(false)}
            onSaved={handleCreated}
          />
        </DialogContent>
      </Dialog>
      <ConfirmDialog config={confirm} onClose={() => setConfirm(null)} />
    </>
  );
}

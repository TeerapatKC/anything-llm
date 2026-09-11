import React, { useState } from "react";
import showToast from "@/utils/toast";
import {
  ChevronDown,
  Pencil,
  Play,
  Settings,
  Square,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import MCPLogo from "@/media/agents/mcp-logo.svg";
import { titleCase } from "text-case";
import MCPServers from "@/models/mcpServers";
import { SimpleToggleSwitch } from "@/components/lib/Toggle";
import { useTranslation, Trans } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ConfirmDialog from "@/components/ConfirmDialog";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import AddServerModal from "./AddServerModal";
import ServerWorkspaceVisibility from "./ServerWorkspaceVisibility";

function ManageServerMenu({ server, toggleServer, onDelete, onEdit }) {
  const { t } = useTranslation();
  const [running, setRunning] = useState(server.running);
  const [confirm, setConfirm] = useState(null);

  async function deleteServer() {
    setConfirm({
      title: "Delete this MCP server?",
      description:
        "It will be removed from your config file and you will need to add it back manually.",
      confirmText: "Delete server",
      variant: "destructive",
      onConfirm: async () => {
        const { success, error } = await MCPServers.deleteServer(server.name);
        if (success) {
          showToast("MCP server deleted successfully.", "success");
          onDelete(server.name);
        } else {
          showToast(error || "Failed to delete MCP server.", "error");
        }
      },
    });
  }

  async function handleToggleServer() {
    setConfirm({
      title: running ? "Stop this MCP server?" : "Start this MCP server?",
      description:
        "It will be started automatically when you next start the server.",
      confirmText: running ? "Stop server" : "Start server",
      variant: running ? "destructive" : "default",
      onConfirm: toggleServerNow,
    });
  }

  async function toggleServerNow() {
    const { success, error } = await MCPServers.toggleServer(server.name);
    if (success) {
      const newState = !running;
      setRunning(newState);
      toggleServer(server.name);
      showToast(
        `MCP server ${server.name} ${newState ? "started" : "stopped"} successfully.`,
        "success",
        { clear: true }
      );
    } else {
      showToast(error || "Failed to toggle MCP server.", "error", {
        clear: true,
      });
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="icon-sm" aria-label="Manage server" />
          }
        >
          <Settings />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-44">
          {server.config?.url && (
            <DropdownMenuItem onClick={onEdit}>
              <Pencil />
              Edit server
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={handleToggleServer}>
            {running ? <Square /> : <Play />}
            {running ? t("agent.mcp.stop-server") : t("agent.mcp.start-server")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={deleteServer}>
            <Trash2 />
            {t("agent.mcp.delete-server")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ConfirmDialog config={confirm} onClose={() => setConfirm(null)} />
    </>
  );
}

export default function ServerPanel({
  server,
  toggleServer,
  onDelete,
  onUpdated,
  onToggleTool,
  showWorkspaceVisibility = false,
}) {
  const { t } = useTranslation();
  const [showEditServer, setShowEditServer] = useState(false);
  const suppressedTools = server.config?.nexusai?.suppressedTools || [];
  const enabledToolCount = server.tools.filter(
    (tool) => !suppressedTools.includes(tool.name)
  ).length;

  return (
    <>
      <div className="w-full min-w-0 max-w-full overflow-hidden p-2">
        <div className="flex w-full min-w-0 max-w-[800px] flex-col gap-y-[18px]">
          <ToolCountWarningBanner
            server={server}
            enabledToolCount={enabledToolCount}
          />
          <div className="flex w-full justify-between">
            <div className="flex items-center gap-x-2">
              <img src={MCPLogo} className="w-6 h-6 light:invert" />
              <label
                htmlFor="name"
                className="text-theme-text-primary text-md font-bold"
              >
                {titleCase(server.name.replace(/[_-]/g, " "))}
              </label>
              <span className="rounded-full bg-muted/40 px-2 py-0.5 text-[11px] font-medium text-theme-text-secondary">
                {server.scope === "workspace"
                  ? t("mcp-servers.workspace-owned")
                  : t("mcp-servers.shared")}
              </span>
              {server.tools.length > 0 && (
                <p className="text-theme-text-secondary text-sm">
                  {enabledToolCount}/{server.tools.length}{" "}
                  {t("agent.mcp.tools-enabled")}
                </p>
              )}
            </div>
            <ManageServerMenu
              key={server.name}
              server={server}
              toggleServer={toggleServer}
              onDelete={onDelete}
              onEdit={() => setShowEditServer(true)}
            />
          </div>
          <RenderServerConfig config={server.config} />
          <RenderServerStatus server={server} />
          <RenderServerTools
            serverName={server.name}
            tools={server.tools}
            suppressedTools={suppressedTools}
            onToggleTool={onToggleTool}
          />
          {showWorkspaceVisibility && (
            <ServerWorkspaceVisibility
              serverName={server.name}
              scope={server.scope}
            />
          )}
        </div>
      </div>
      <Dialog
        open={showEditServer}
        onOpenChange={(open) => setShowEditServer(open)}
      >
        <DialogContent size="md">
          <AddServerModal
            server={server}
            closeModal={() => setShowEditServer(false)}
            onSaved={(updatedServer) => {
              onUpdated(updatedServer, server.name);
              showToast(
                "MCP server updated and connected successfully.",
                "success",
                {
                  clear: true,
                }
              );
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

function ToolCountWarningBanner({ server, enabledToolCount }) {
  if (server.tools.length <= 10) return null;
  if (enabledToolCount <= 10) return null;

  return (
    <div className="flex items-center gap-x-2 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
      <TriangleAlert className="h-5 w-5 text-yellow-500 shrink-0 fill-current" />
      <p className="text-yellow-500 text-sm">
        <Trans
          i18nKey={`agent.mcp.tool-count-warning`}
          values={{ count: enabledToolCount }}
          components={{ b: <b />, br: <br /> }}
        />
      </p>
    </div>
  );
}

function RenderServerConfig({ config = null }) {
  const { t } = useTranslation();
  if (!config) return null;
  if (config.url) {
    return (
      <div className="flex flex-col gap-y-2">
        <p className="text-theme-text-primary text-sm">Remote endpoint</p>
        <div className="bg-theme-bg-primary rounded-lg p-4">
          <p className="text-theme-text-secondary text-sm text-left break-all">
            <span className="font-bold">Transport:</span>{" "}
            {config.type === "sse" ? "SSE" : "Streamable HTTP"}
          </p>
          <p className="text-theme-text-secondary text-sm text-left break-all">
            <span className="font-bold">URL:</span> {config.url}
          </p>
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-y-2">
      <p className="text-theme-text-primary text-sm">
        {t("agent.mcp.startup-command")}
      </p>
      <div className="bg-theme-bg-primary rounded-lg p-4">
        <p className="text-theme-text-secondary text-sm text-left">
          <span className="font-bold">{t("agent.mcp.command")}:</span>{" "}
          {config.command}
        </p>
        <p className="text-theme-text-secondary text-sm text-left">
          <span className="font-bold">{t("agent.mcp.arguments")}:</span>{" "}
          {config.args ? config.args.join(" ") : t("common.none")}
        </p>
      </div>
    </div>
  );
}

function RenderServerStatus({ server }) {
  const { t } = useTranslation();
  if (server.running || !server.error) return null;
  return (
    <div className="flex flex-col gap-y-2">
      <p className="text-theme-text-primary text-sm">
        {t("agent.mcp.not-running-warning")}
      </p>
      <div className="bg-theme-bg-primary rounded-lg p-4">
        <p className="text-red-500 text-sm font-mono">{server.error}</p>
      </div>
    </div>
  );
}

function RenderServerTools({
  serverName,
  tools = [],
  suppressedTools = [],
  onToggleTool,
}) {
  const { t } = useTranslation();
  if (tools.length === 0) return null;
  return (
    <div className="flex w-full min-w-0 flex-col gap-y-2 overflow-hidden">
      <h3 className="text-sm font-semibold text-theme-text-primary">
        {t("mcp-servers.tools-heading")}
      </h3>
      <div className="flex w-full min-w-0 flex-col gap-y-2">
        {tools.map((tool) => (
          <ServerTool
            key={tool.name}
            serverName={serverName}
            tool={tool}
            enabled={!suppressedTools.includes(tool.name)}
            onToggle={onToggleTool}
          />
        ))}
      </div>
    </div>
  );
}

function ServerTool({ serverName, tool, enabled, onToggle }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <button
      type="button"
      onClick={() => setOpen(!open)}
      className={`flex w-full min-w-0 max-w-full flex-col gap-y-2 overflow-hidden rounded-lg border px-4 py-2 ${
        enabled
          ? "border-theme-text-secondary"
          : "border-theme-text-secondary/50 opacity-60"
      }`}
    >
      <div className="flex w-full min-w-0 items-center justify-between">
        <div className="flex min-w-0 flex-1 items-center gap-x-2 overflow-hidden">
          <SimpleToggleSwitch
            size="md"
            enabled={enabled}
            onChange={(newEnabled) =>
              onToggle?.(serverName, tool.name, newEnabled)
            }
          />
          <p className="max-w-[45%] shrink-0 truncate text-left font-mono text-sm font-bold text-theme-text-primary">
            {tool.name}
          </p>
          {!open && (
            <p className="min-w-0 flex-1 truncate text-left text-sm text-theme-text-secondary">
              {tool.description}
            </p>
          )}
        </div>
        <div className="ml-2 flex shrink-0 items-center gap-x-3">
          <div
            className={`border-none text-theme-text-secondary hover:text-cta-button transition-transform duration-200 ${
              open ? "rotate-180" : ""
            }`}
          >
            <ChevronDown size={16} />
          </div>
        </div>
      </div>
      {open && (
        <div className="flex w-full min-w-0 flex-col gap-y-2 overflow-hidden">
          <div className="flex flex-col gap-y-2">
            <p className="break-words text-left text-sm text-theme-text-secondary [overflow-wrap:anywhere]">
              {tool.description}
            </p>
          </div>
          <div className="flex flex-col gap-y-2">
            <p className="text-theme-text-primary text-sm text-left">
              {t("agent.mcp.tool-call-arguments")}
            </p>
            <div className="flex flex-col gap-y-2">
              {Object.entries(tool.inputSchema?.properties || {}).map(
                ([key, value]) => (
                  <div key={key} className="flex items-center gap-x-2">
                    <p className="text-theme-text-secondary text-sm text-left font-bold">
                      {key}
                      {tool.inputSchema?.required?.includes(key) && (
                        <sup className="text-red-500">*</sup>
                      )}
                    </p>
                    <p className="text-theme-text-secondary text-sm text-left">
                      {value.type}
                    </p>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      )}
    </button>
  );
}

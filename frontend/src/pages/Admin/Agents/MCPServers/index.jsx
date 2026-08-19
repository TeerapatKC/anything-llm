import { useState, useEffect } from "react";
import { titleCase } from "text-case";
import { BookOpenText, RotateCw, TriangleAlert } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import MCPLogo from "@/media/agents/mcp-logo.svg";
import MCPServers from "@/models/mcpServers";
import showToast from "@/utils/toast";
import { useTranslation } from "react-i18next";
import ConfirmDialog from "@/components/ConfirmDialog";

export function MCPServerHeader({
  setMcpServers,
  setSelectedMcpServer,
  children,
}) {
  const { t } = useTranslation();
  const [loadingMcpServers, setLoadingMcpServers] = useState(false);
  const [confirm, setConfirm] = useState(null);
  useEffect(() => {
    async function fetchMCPServers() {
      setLoadingMcpServers(true);
      const { servers = [] } = await MCPServers.listServers();
      setMcpServers(servers);
      setLoadingMcpServers(false);
    }
    fetchMCPServers();
  }, []);

  // Refresh the list of MCP servers
  const refreshMCPServers = () => {
    setConfirm({
      title: "Refresh the list of MCP servers?",
      description: "This will restart all MCP servers and reload their tools.",
      confirmText: "Refresh",
      variant: "default",
      onConfirm: () => {
        setLoadingMcpServers(true);
        MCPServers.forceReload()
          .then(({ servers = [] }) => {
            setSelectedMcpServer(null);
            setMcpServers(servers);
          })
          .catch((err) => {
            console.error(err);
            showToast(`Failed to refresh MCP servers.`, "error", {
              clear: true,
            });
          })
          .finally(() => {
            setLoadingMcpServers(false);
          });
      },
    });
  };

  return (
    <>
      <div className="text-theme-text-primary flex items-center justify-between gap-x-2 mt-4">
        <div className="flex items-center gap-x-2">
          <img src={MCPLogo} className="w-6 h-6 light:invert" alt="MCP Logo" />
          <p className="text-lg font-medium">{t("agent.mcp.title")}</p>
        </div>
        <div className="flex items-center gap-x-3">
          <a
            href="https://docs.anythingllm.com/mcp-compatibility/overview"
            target="_blank"
            rel="noopener noreferrer"
            className="border-none text-theme-text-secondary hover:text-cta-button"
          >
            <BookOpenText size={16} />
          </a>
          <button
            type="button"
            onClick={refreshMCPServers}
            disabled={loadingMcpServers}
            className="border-none text-theme-text-secondary hover:text-cta-button flex items-center gap-x-1"
          >
            <RotateCw
              size={16}
              className={loadingMcpServers ? "animate-spin" : ""}
            />
            <p className="text-sm">
              {loadingMcpServers
                ? `${t("common.loading")}...`
                : t("common.refresh")}
            </p>
          </button>
        </div>
      </div>
      {children({ loadingMcpServers })}
      <ConfirmDialog config={confirm} onClose={() => setConfirm(null)} />
    </>
  );
}

export function MCPServersList({
  isLoading = false,
  servers = [],
  selectedServer,
  handleClick,
}) {
  const { t } = useTranslation();
  if (isLoading) {
    return (
      <div className="text-theme-text-secondary text-center text-xs flex flex-col gap-y-2">
        <p>{t("agent.mcp.loading-from-config")}...</p>
        <a
          href="https://docs.anythingllm.com/mcp-compatibility/overview"
          target="_blank"
          rel="noopener noreferrer"
          className="text-theme-text-secondary underline hover:text-cta-button"
        >
          {t("agent.mcp.learn-more")}
        </a>
      </div>
    );
  }

  if (servers.length === 0) {
    return (
      <div className="text-theme-text-secondary text-center text-xs flex flex-col gap-y-2">
        <p>{t("agent.mcp.no-servers-found")}</p>
        <a
          href="https://docs.anythingllm.com/mcp-compatibility/overview"
          target="_blank"
          rel="noopener noreferrer"
          className="text-theme-text-secondary underline hover:text-cta-button"
        >
          {t("agent.mcp.learn-more")}
        </a>
      </div>
    );
  }

  return (
    <div className="bg-theme-bg-secondary text-theme-text-primary rounded-xl w-full md:min-w-[360px]">
      {servers.map((server, index) => (
        <MCPServerItem
          key={server.name}
          server={server}
          isFirst={index === 0}
          isLast={index === servers.length - 1}
          isSelected={selectedServer?.name === server.name}
          handleClick={() => handleClick?.(server)}
        />
      ))}
    </div>
  );
}

function MCPServerItem({ server, isFirst, isLast, isSelected, handleClick }) {
  const { t } = useTranslation();
  const suppressedTools = server.config?.anythingllm?.suppressedTools || [];
  const enabledToolCount = server.tools.length - suppressedTools.length;
  const showWarning = enabledToolCount > 10;
  const running = server.running;

  return (
    <div
      className={`py-3 px-4 flex items-center justify-between ${
        isFirst ? "rounded-t-xl" : ""
      } ${
        isLast ? "rounded-b-xl" : "border-b border-theme-sidebar-border"
      } cursor-pointer transition-all duration-300 hover:bg-theme-bg-primary ${
        isSelected ? "bg-white/10 light:bg-theme-bg-sidebar" : ""
      }`}
      onClick={handleClick}
    >
      <div className="flex items-center gap-x-2 text-sm font-light">
        {showWarning && (
          <Tooltip>
            <TooltipTrigger asChild>
              <TriangleAlert className="h-4 w-4 text-yellow-500" />
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-[250px] text-xs">
              {t("agent.mcp.tool-warning")}
            </TooltipContent>
          </Tooltip>
        )}
        {titleCase(server.name.replace(/[_-]/g, " "))}
      </div>
      <div className="flex items-center gap-x-2">
        <div
          className={`text-sm text-theme-text-secondary font-medium ${running ? "text-green-500" : "text-red-500"}`}
        >
          {running ? t("common.on") : t("common.stopped")}
        </div>
      </div>
    </div>
  );
}

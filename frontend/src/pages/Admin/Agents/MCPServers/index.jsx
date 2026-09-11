import { titleCase } from "text-case";
import { TriangleAlert } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTranslation } from "react-i18next";

/**
 * The MCP server list (left pane of the MCP Servers screen). Styled to match the SQL
 * Connector's `ConnectionsList` - same row chrome, same status word and chevron on the
 * right - so the two screens read as one family.
 */
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
      </div>
    );
  }

  if (servers.length === 0) {
    return (
      <div className="text-theme-text-secondary text-center text-xs flex flex-col gap-y-2">
        <p>{t("agent.mcp.no-servers-found")}</p>
      </div>
    );
  }

  return (
    <div className="bg-theme-bg-secondary text-theme-text-primary rounded-xl w-full">
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
  const suppressedTools = server.config?.nexusai?.suppressedTools || [];
  const enabledToolCount = server.tools.length - suppressedTools.length;
  const showWarning = enabledToolCount > 10;
  const running = server.running;

  return (
    <div
      className={`py-3 px-4 flex items-center justify-between ${
        isFirst ? "rounded-t-xl" : ""
      } ${
        isLast ? "rounded-b-xl" : "border-b border-theme-sidebar-border"
      } cursor-pointer transition-colors duration-150 ease-out motion-reduce:transition-none hover:bg-theme-bg-primary ${
        isSelected ? "bg-white/10 light:bg-theme-bg-sidebar" : ""
      }`}
      onClick={handleClick}
    >
      <div className="flex min-w-0 items-center gap-x-2 text-sm font-light">
        {showWarning && (
          <Tooltip>
            <TooltipTrigger
              render={
                <TriangleAlert className="h-4 w-4 shrink-0 text-yellow-500" />
              }
            ></TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-[250px] text-xs">
              {t("agent.mcp.tool-warning")}
            </TooltipContent>
          </Tooltip>
        )}
        <span className="truncate">
          {titleCase(server.name.replace(/[_-]/g, " "))}
        </span>
        {/* Which pool a server came from decides who may edit it, so it is worth a
            glance rather than a click. */}
        {server.scope === "workspace" && (
          <span className="shrink-0 rounded-full bg-muted/40 px-2 py-0.5 text-[11px] font-medium text-theme-text-secondary">
            {t("mcp-servers.workspace-owned")}
          </span>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-x-2">
        <div
          className={`text-sm font-medium ${running ? "text-green-500" : "text-red-500"}`}
        >
          {running ? t("common.on") : t("common.stopped")}
        </div>
      </div>
    </div>
  );
}

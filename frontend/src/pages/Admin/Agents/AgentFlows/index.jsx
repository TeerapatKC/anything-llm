import { useTranslation } from "react-i18next";
import React from "react";
import { ChevronRight } from "lucide-react";

export default function AgentFlowsList({
  flows = [],
  selectedFlow,
  handleClick,
  activeFlowIds = [],
}) {
  const { t } = useTranslation();
  if (flows.length === 0) {
    return (
      <div className="text-theme-text-secondary text-center text-xs flex flex-col gap-y-2">
        <p>{t("ui.no-agent-flows")}</p>
      </div>
    );
  }

  return (
    <div className="min-w-0 w-full rounded-xl bg-theme-bg-secondary text-theme-text-primary">
      {flows.map((flow, index) => (
        <div
          key={flow.uuid}
          className={`py-3 px-4 flex items-center justify-between ${
            index === 0 ? "rounded-t-xl" : ""
          } ${
            index === flows.length - 1
              ? "rounded-b-xl"
              : "border-b border-theme-sidebar-border"
          } cursor-pointer transition-all duration-300 hover:bg-theme-bg-primary ${
            selectedFlow?.uuid === flow.uuid
              ? "bg-white/10 light:bg-theme-bg-sidebar"
              : ""
          }`}
          onClick={() => handleClick?.(flow)}
        >
          <div className="flex min-w-0 flex-1 items-center gap-x-2">
            <span className="truncate text-sm font-light">{flow.name}</span>
            {flow.scope === "workspace" && (
              // Built inside a workspace. Listed here so an operator can audit it, but
              // it belongs to that workspace and cannot be shared with others.
              <span className="shrink-0 rounded-full border border-theme-sidebar-border px-2 py-0.5 text-[10px] uppercase tracking-wide text-theme-text-secondary">
                {t("agent-flow.workspace-owned")}
              </span>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-x-2">
            <div className="text-sm text-theme-text-secondary font-medium">
              {activeFlowIds.includes(flow.uuid)
                ? t("agent-flow.on")
                : t("agent-flow.off")}
            </div>
            <ChevronRight size={14} className="text-theme-text-secondary" />
          </div>
        </div>
      ))}
    </div>
  );
}

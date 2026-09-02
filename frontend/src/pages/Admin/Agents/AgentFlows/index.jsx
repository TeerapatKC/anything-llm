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
        <a
          href="https://docs.anythingllm.com/agent-flows/getting-started"
          target="_blank"
          className="text-theme-text-secondary underline hover:text-cta-button"
          rel="noreferrer"
        >
          Learn more about Agent Flows.
        </a>
      </div>
    );
  }

  return (
    <div className="bg-theme-bg-secondary text-theme-text-primary rounded-xl w-full md:min-w-[360px]">
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
          <div className="text-sm font-light">{flow.name}</div>
          <div className="flex items-center gap-x-2">
            <div className="text-sm text-theme-text-secondary font-medium">
              {activeFlowIds.includes(flow.uuid) ? "On" : "Off"}
            </div>
            <ChevronRight size={14} className="text-theme-text-secondary" />
          </div>
        </div>
      ))}
    </div>
  );
}

import { ChevronDown, ChevronLeft, ChevronUp, Plus } from "lucide-react";
import NexusInfinityLogo from "@/media/logo/nexus-ai-infinity.png";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import paths from "@/utils/paths";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTranslation } from "react-i18next";

export default function HeaderMenu({
  agentName,
  availableFlows = [],
  onNewFlow,
  onSaveFlow,
}) {
  // Same slug-presence check the builder makes - keeps "back" and the flow switcher
  // inside the workspace when that is where the builder was opened from.
  const { flowId = null, slug = null } = useParams();
  const [showDropdown, setShowDropdown] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();
  // Workspace flows are managed from the Agent Configuration screen, so that is where
  // leaving the builder returns to - there is no separate flows tab.
  const exitPath = slug
    ? paths.workspace.settings.agentConfig(slug)
    : paths.settings.agentFlow();
  const editPath = (uuid) =>
    slug
      ? paths.workspace.agents.editFlow(slug, uuid)
      : paths.agents.editAgent(uuid);
  const hasOtherFlows =
    availableFlows.filter((flow) => flow.uuid !== flowId).length > 0;

  return (
    <div className="absolute top-4 left-4 right-4">
      <div className="flex justify-between items-start max-w-[1700px] mx-auto">
        <div className="flex items-center gap-x-2">
          <button
            onClick={() => navigate(exitPath)}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-theme-settings-input-bg border border-theme-sidebar-border hover:bg-theme-action-menu-bg transition-colors duration-300"
          >
            <ChevronLeft className="w-5 h-5 text-theme-text-primary" />
          </button>
          <div className="flex items-center bg-theme-settings-input-bg rounded-md border border-theme-sidebar-border pointer-events-auto">
            <button
              onClick={() => navigate(exitPath)}
              className="border-t-transparent! border-l-transparent! border-b-transparent! flex items-center gap-x-2 px-4 py-2 border-r border-theme-sidebar-border hover:bg-theme-action-menu-bg transition-colors duration-300"
            >
              <img
                src={NexusInfinityLogo}
                alt="logo"
                className="w-[20px] light:invert"
              />
              <span className="text-theme-text-primary text-sm uppercase tracking-widest">
                {t("agent-builder.header.builder")}
              </span>
            </button>
            <DropdownMenu open={showDropdown} onOpenChange={setShowDropdown}>
              <DropdownMenuTrigger
                disabled={!hasOtherFlows}
                className="flex min-w-[200px] max-w-[300px] items-center justify-between gap-x-1 border-none px-4 py-2 text-sm text-theme-text-primary transition-colors duration-300 enabled:hover:bg-theme-action-menu-bg"
                onClick={() => {
                  if (!agentName && !hasOtherFlows) {
                    const agentNameInput = document.getElementById(
                      "agent-flow-name-input"
                    );
                    if (agentNameInput) agentNameInput.focus();
                  }
                }}
              >
                <span
                  className={`text-sm font-medium truncate ${!!agentName ? "text-theme-text-primary " : "text-theme-text-secondary"}`}
                >
                  {agentName || t("agent-builder.header.untitled-flow")}
                </span>
                {hasOtherFlows && (
                  <div className="ml-2 flex shrink-0 flex-col">
                    <ChevronUp size={10} />
                    <ChevronDown size={10} />
                  </div>
                )}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="max-w-[350px]">
                {availableFlows
                  .filter((flow) => flow.uuid !== flowId)
                  .map((flow, index) => (
                    <DropdownMenuItem
                      key={flow?.uuid || `flow-${index}`}
                      onClick={() => navigate(editPath(flow.uuid))}
                    >
                      <span className="block truncate">
                        {flow?.name || t("agent-builder.header.untitled-flow")}
                      </span>
                    </DropdownMenuItem>
                  ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="flex flex-col gap-y-1 items-end">
          <div className="flex items-center gap-x-[15px]">
            <button
              onClick={onNewFlow}
              className="flex items-center gap-x-2 text-theme-text-primary text-sm font-medium px-3 py-2 rounded-lg border border-white bg-theme-settings-input-bg hover:bg-theme-action-menu-bg transition-colors duration-300"
            >
              <Plus className="w-4 h-4" />
              {t("agent-builder.header.new-flow")}
            </button>
            <button
              onClick={onSaveFlow}
              className="border-none bg-primary-button hover:opacity-80 text-black light:text-white px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 flex items-center justify-center gap-2"
            >
              {t("agent-builder.header.save")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

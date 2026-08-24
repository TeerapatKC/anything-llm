import { ChevronDown, ChevronLeft, ChevronUp, Plus } from "lucide-react";
import AnythingInfinityLogo from "@/media/logo/anything-llm-infinity.png";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import paths from "@/utils/paths";
import { Link } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function HeaderMenu({
  agentName,
  availableFlows = [],
  onNewFlow,
  onSaveFlow,
  onPublishFlow,
}) {
  const { flowId = null } = useParams();
  const [showDropdown, setShowDropdown] = useState(false);
  const navigate = useNavigate();
  const hasOtherFlows =
    availableFlows.filter((flow) => flow.uuid !== flowId).length > 0;

  return (
    <div className="absolute top-[56px] left-4 right-4">
      <div className="flex justify-between items-start max-w-[1700px] mx-auto">
        <div className="flex items-center gap-x-2">
          <button
            onClick={() => navigate(paths.settings.agentSkills())}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-theme-settings-input-bg border border-theme-sidebar-border hover:bg-theme-action-menu-bg transition-colors duration-300"
          >
            <ChevronLeft className="w-5 h-5 text-theme-text-primary" />
          </button>
          <div className="flex items-center bg-theme-settings-input-bg rounded-md border border-theme-sidebar-border pointer-events-auto">
            <button
              onClick={() => navigate(paths.settings.agentSkills())}
              className="border-t-transparent! border-l-transparent! border-b-transparent! flex items-center gap-x-2 px-4 py-2 border-r border-theme-sidebar-border hover:bg-theme-action-menu-bg transition-colors duration-300"
            >
              <img
                src={AnythingInfinityLogo}
                alt="logo"
                className="w-[20px] light:invert"
              />
              <span className="text-theme-text-primary text-sm uppercase tracking-widest">
                Builder
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
                  {agentName || "Untitled Flow"}
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
                      onClick={() =>
                        navigate(paths.agents.editAgent(flow.uuid))
                      }
                    >
                      <span className="block truncate">
                        {flow?.name || "Untitled Flow"}
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
              New Flow
            </button>
            <button
              onClick={onPublishFlow}
              className="px-3 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 border border-theme-sidebar-border bg-theme-bg-primary text-theme-text-primary hover:bg-theme-action-menu-bg transition-all duration-300"
            >
              Publish
            </button>
            <button
              onClick={onSaveFlow}
              className="border-none bg-primary-button hover:opacity-80 text-black light:text-white px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 flex items-center justify-center gap-2"
            >
              Save
            </button>
          </div>
          <Link
            to="https://docs.anythingllm.com/agent-flows/overview"
            className="text-theme-text-secondary text-sm hover:underline hover:text-cta-button flex items-center gap-x-1 w-fit float-right"
          >
            view documentation &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}

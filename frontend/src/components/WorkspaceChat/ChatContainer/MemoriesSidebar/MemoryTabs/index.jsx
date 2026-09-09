import { Globe2, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useMemoriesContext, LIMITS } from "../MemoriesContext";

export default function MemoryTabs() {
  const { workspace, activeTab, setActiveTab, memories, openCreateModal } =
    useMemoriesContext();
  const { t } = useTranslation();
  const workspaceName =
    workspace?.name || t("chat_window.memories.tab_workspace");
  const workspaceCount = memories.workspace.length;
  const globalCount = memories.global.length;
  const atLimit =
    activeTab === "workspace"
      ? workspaceCount >= LIMITS.workspace
      : globalCount >= LIMITS.global;

  return (
    <div className="flex items-center justify-between shrink-0 gap-2">
      <div className="flex items-center gap-1 min-w-0">
        <Tooltip>
          <TooltipTrigger
            render={
              <button
                type="button"
                onClick={() => setActiveTab("workspace")}
                className={`flex items-center gap-0.5 h-6 px-3 rounded-full border cursor-pointer text-xs font-medium uppercase tracking-[1.2px] whitespace-nowrap transition-colors min-w-0 shrink ${
                  activeTab === "workspace"
                    ? "border-zinc-600 bg-zinc-800 light:border-slate-300 light:bg-slate-300"
                    : "border-zinc-700 bg-transparent hover:border-zinc-600 hover:bg-zinc-800/50 light:border-slate-300 light:hover:bg-slate-200"
                }`}
              />
            }
          >
            <span className="text-zinc-200 light:text-slate-800 truncate max-w-[140px]">
              {workspaceName}
            </span>
            <span className="text-zinc-400 light:text-slate-600 font-normal">
              ({workspaceCount}/{LIMITS.workspace})
            </span>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-[250px] text-xs">
            {workspaceName}
          </TooltipContent>
        </Tooltip>
        <button
          type="button"
          onClick={() => setActiveTab("global")}
          className={`flex items-center gap-1 h-6 px-2.5 rounded-md border cursor-pointer text-xs font-medium uppercase tracking-[1.2px] whitespace-nowrap transition-colors shrink-0 ${
            activeTab === "global"
              ? "border-sky-400/50 bg-sky-400/15"
              : "border-sky-400/30 bg-sky-400/5 hover:bg-sky-400/10"
          }`}
        >
          <Globe2 size={12} className="text-sky-400 light:text-sky-700" />
          <span className="text-sky-400 light:text-sky-700">
            {t("chat_window.memories.tab_global")}
          </span>
          <span className="text-sky-300/70 light:text-sky-700/70 font-normal">
            ({globalCount}/{LIMITS.global})
          </span>
        </button>
      </div>
      <button
        type="button"
        onClick={openCreateModal}
        disabled={atLimit}
        className="mr-1 flex items-center justify-center size-6 rounded-lg border-none bg-transparent cursor-pointer text-zinc-50 light:text-slate-900 hover:bg-zinc-800 light:hover:bg-slate-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
      >
        <Plus size={16} />
      </button>
    </div>
  );
}

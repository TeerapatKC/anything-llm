import React, { useState } from "react";
import AgentFlows from "@/models/agentFlows";
import showToast from "@/utils/toast";
import { Pencil, Settings, Trash2, Workflow } from "lucide-react";
import { useNavigate } from "react-router-dom";
import paths from "@/utils/paths";
import Toggle from "@/components/lib/Toggle";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ConfirmDialog from "@/components/ConfirmDialog";

function ManageFlowMenu({ flow, onDelete }) {
  const [confirm, setConfirm] = useState(null);
  const navigate = useNavigate();

  async function deleteFlow() {
    setConfirm({
      title: "Delete this flow?",
      description: "This action cannot be undone.",
      confirmText: "Delete flow",
      variant: "destructive",
      onConfirm: async () => {
        const { success, error } = await AgentFlows.deleteFlow(flow.uuid);
        if (success) {
          showToast("Flow deleted successfully.", "success");
          onDelete(flow.uuid);
        } else {
          showToast(error || "Failed to delete flow.", "error");
        }
      },
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="icon-sm" aria-label="Manage flow" />
          }
        >
          <Settings />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem
            onClick={() => navigate(paths.agents.editAgent(flow.uuid))}
          >
            <Pencil />
            Edit flow
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={deleteFlow}>
            <Trash2 />
            Delete flow
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ConfirmDialog config={confirm} onClose={() => setConfirm(null)} />
    </>
  );
}

export default function FlowPanel({ flow, toggleFlow, enabled, onDelete }) {
  const handleToggle = async () => {
    try {
      const { success, error } = await AgentFlows.toggleFlow(
        flow.uuid,
        !enabled
      );
      if (!success) throw new Error(error);
      toggleFlow(flow.uuid);
    } catch (error) {
      console.error("Failed to toggle flow:", error);
      showToast("Failed to toggle flow", "error", { clear: true });
    }
  };

  return (
    <>
      <div className="p-2">
        <div className="flex flex-col gap-y-[18px] max-w-[500px]">
          <div className="flex w-full justify-between items-center">
            <div className="flex items-center gap-x-2">
              <Workflow size={24} className="text-theme-text-primary" />
              <label
                htmlFor="name"
                className="text-theme-text-primary text-md font-bold"
              >
                {flow.name}
              </label>
            </div>
            <div className="flex items-center gap-x-2">
              <Toggle size="lg" enabled={enabled} onChange={handleToggle} />
              <ManageFlowMenu flow={flow} onDelete={onDelete} />
            </div>
          </div>
          <p className="whitespace-pre-wrap text-theme-text-primary/60 text-xs font-medium py-1.5">
            {flow.description || "No description provided"}
          </p>
        </div>
      </div>
    </>
  );
}

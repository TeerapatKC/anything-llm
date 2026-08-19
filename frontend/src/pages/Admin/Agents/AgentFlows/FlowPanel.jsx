import React, { useState, useEffect, useRef } from "react";
import AgentFlows from "@/models/agentFlows";
import showToast from "@/utils/toast";
import { Settings, Workflow } from "lucide-react";
import { useNavigate } from "react-router-dom";
import paths from "@/utils/paths";
import Toggle from "@/components/lib/Toggle";
import { Button } from "@/components/ui/button";
import ConfirmDialog from "@/components/ConfirmDialog";

function ManageFlowMenu({ flow, onDelete }) {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const menuRef = useRef(null);
  const navigate = useNavigate();

  async function deleteFlow() {
    setOpen(false);
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

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="p-1.5 rounded-lg text-theme-text-primary hover:bg-theme-action-menu-item-hover transition-colors duration-300"
      >
        <Settings className="h-5 w-5" />
      </button>
      {open && (
        <div className="absolute min-w-[140px] top-full right-0 mt-1 border-[1.5px] border-white/40 rounded-lg bg-theme-action-menu-bg flex flex-col shadow-[0_4px_14px_rgba(0,0,0,0.25)] text-theme-text-primary z-99 md:z-10">
          <Button
            variant="menuItem"
            type="button"
            onClick={() => navigate(paths.agents.editAgent(flow.uuid))}
          >
            <span className="text-sm whitespace-nowrap">Edit Flow</span>
          </Button>
          <Button variant="menuItem" type="button" onClick={deleteFlow}>
            <span className="text-sm whitespace-nowrap">Delete Flow</span>
          </Button>
        </div>
      )}
      <ConfirmDialog config={confirm} onClose={() => setConfirm(null)} />
    </div>
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
          <p className="whitespace-pre-wrap text-theme-text-primary text-opacity-60 text-xs font-medium py-1.5">
            {flow.description || "No description provided"}
          </p>
        </div>
      </div>
    </>
  );
}

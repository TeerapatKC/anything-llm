import React, { useEffect, useState } from "react";
import AgentFlows from "@/models/agentFlows";
import showToast from "@/utils/toast";
import { Building2, Pencil, Settings, Trash2, Workflow } from "lucide-react";
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
          <FlowWorkspaceVisibility flowUuid={flow.uuid} />
        </div>
      </div>
    </>
  );
}

/**
 * Lets a super admin choose exactly which workspaces' agents can see and run
 * this flow. Reuses the same per-workspace `agentSkillConfig.activeFlows`
 * storage that each workspace's own Agent Skills screen already writes to -
 * this is just a flow-centric view over the same data.
 */
function FlowWorkspaceVisibility({ flowUuid }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [workspaces, setWorkspaces] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    async function fetchWorkspaces() {
      setLoading(true);
      const { success, workspaces: list } =
        await AgentFlows.getFlowWorkspaces(flowUuid);
      setWorkspaces(success ? list : []);
      setSelectedIds(
        new Set(success ? list.filter((w) => w.enabled).map((w) => w.id) : [])
      );
      setHasChanges(false);
      setLoading(false);
    }
    fetchWorkspaces();
  }, [flowUuid]);

  function toggleWorkspace(id, enabled) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (enabled) next.add(id);
      else next.delete(id);
      return next;
    });
    setHasChanges(true);
  }

  const allSelected =
    workspaces.length > 0 && selectedIds.size === workspaces.length;

  function toggleSelectAll() {
    setSelectedIds(
      allSelected ? new Set() : new Set(workspaces.map((w) => w.id))
    );
    setHasChanges(true);
  }

  async function handleSave() {
    setSaving(true);
    const { success, error } = await AgentFlows.updateFlowWorkspaces(
      flowUuid,
      Array.from(selectedIds)
    );
    if (success) {
      showToast("Workspace visibility updated.", "success", { clear: true });
      setWorkspaces((prev) =>
        prev.map((w) => ({ ...w, enabled: selectedIds.has(w.id) }))
      );
      setHasChanges(false);
    } else {
      showToast(error || "Failed to update workspace visibility.", "error", {
        clear: true,
      });
    }
    setSaving(false);
  }

  return (
    <div className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
      <div className="flex items-center gap-2 border-b border-theme-sidebar-border bg-sidebar-accent/40 px-4 py-3">
        <Building2 size={17} className="text-theme-text-secondary" />
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-theme-text-primary">
            Visible to workspaces
          </h3>
          <p className="mt-0.5 text-xs text-theme-text-secondary">
            Choose which workspaces&apos; agents can use this flow.
          </p>
        </div>
        {workspaces.length > 0 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={toggleSelectAll}
          >
            {allSelected ? "Clear all" : "Select all"}
          </Button>
        )}
      </div>

      {loading ? (
        <p className="px-4 py-3 text-xs text-theme-text-secondary">
          Loading workspaces...
        </p>
      ) : workspaces.length === 0 ? (
        <p className="px-4 py-3 text-xs text-theme-text-primary/40">
          No workspaces on this instance yet.
        </p>
      ) : (
        <div className="thin-scrollbar flex max-h-[320px] flex-col gap-y-2 overflow-y-auto p-3">
          {workspaces.map((ws) => (
            <div
              key={ws.id}
              className="rounded-lg bg-muted/10 ring-1 ring-foreground/10 p-3"
            >
              <Toggle
                size="md"
                variant="horizontal"
                label={ws.name}
                enabled={selectedIds.has(ws.id)}
                onChange={(checked) => toggleWorkspace(ws.id, checked)}
              />
            </div>
          ))}
        </div>
      )}

      {hasChanges && (
        <div className="flex items-center gap-x-2 border-t border-theme-sidebar-border p-3">
          <Button type="button" size="sm" onClick={handleSave}>
            {saving ? "Saving..." : "Save visibility"}
          </Button>
        </div>
      )}
    </div>
  );
}

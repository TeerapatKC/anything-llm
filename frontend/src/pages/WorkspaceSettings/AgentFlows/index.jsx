import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Pencil, Plus, Trash2, Workflow } from "lucide-react";
import AgentFlows from "@/models/agentFlows";
import paths from "@/utils/paths";
import showToast from "@/utils/toast";
import Toggle from "@/components/lib/Toggle";
import { Button } from "@/components/ui/button";
import ConfirmDialog from "@/components/ConfirmDialog";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Agent flows that belong to this workspace.
 *
 * Only flows built here are listed. Instance-wide flows an admin has shared with this
 * workspace are used from the Agent Configuration screen but are deliberately not
 * editable from here - other workspaces depend on them.
 */
export default function WorkspaceAgentFlows({ workspace }) {
  const [flows, setFlows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState(null);
  const navigate = useNavigate();
  const slug = workspace?.slug;

  useEffect(() => {
    async function fetchFlows() {
      if (!slug) return;
      setLoading(true);
      const { flows = [] } = await AgentFlows.workspace.listFlows(slug);
      setFlows(flows);
      setLoading(false);
    }
    fetchFlows();
  }, [slug]);

  if (!slug) return null;

  async function toggleFlow(flow) {
    const active = !flow.active;
    // Optimistic: the row is a switch, and waiting on the round trip makes it feel stuck.
    setFlows((prev) =>
      prev.map((f) => (f.uuid === flow.uuid ? { ...f, active } : f))
    );
    const { success, error } = await AgentFlows.workspace.toggleFlow(
      slug,
      flow.uuid,
      active
    );
    if (!success) {
      setFlows((prev) =>
        prev.map((f) => (f.uuid === flow.uuid ? { ...f, active: !active } : f))
      );
      showToast(error || "Failed to update flow", "error");
    }
  }

  function deleteFlow(flow) {
    setConfirm({
      title: "Delete flow",
      description: `"${flow.name}" will be removed from this workspace. This cannot be undone.`,
      confirmText: "Delete",
      variant: "destructive",
      onConfirm: async () => {
        const { success, error } = await AgentFlows.workspace.deleteFlow(
          slug,
          flow.uuid
        );
        if (!success)
          return showToast(error || "Failed to delete flow", "error");
        setFlows((prev) => prev.filter((f) => f.uuid !== flow.uuid));
        showToast("Flow deleted", "success");
      },
    });
  }

  return (
    <div className="w-full flex flex-col gap-y-6 px-1">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-y-1">
          <p className="text-lg font-semibold text-theme-text-primary">
            Workspace agent flows
          </p>
          <p className="text-xs text-theme-text-secondary max-w-[600px]">
            Flows built here run only in &quot;{workspace.name}&quot;. Enable
            them for the agent from this workspace&apos;s Agent Configuration.
          </p>
        </div>
        <Button
          variant="default"
          className="shrink-0"
          onClick={() => navigate(paths.workspace.agents.builder(slug))}
        >
          <Plus />
          New flow
        </Button>
      </div>

      {loading ? (
        <div className="flex flex-col gap-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      ) : flows.length === 0 ? (
        <div className="flex flex-col items-center gap-y-2 rounded-xl border border-dashed border-theme-sidebar-border py-10 text-center">
          <Workflow size={20} className="text-theme-text-secondary" />
          <p className="text-sm text-theme-text-primary">No flows yet</p>
          <p className="text-xs text-theme-text-secondary max-w-[380px]">
            Build a flow to give this workspace&apos;s agent a repeatable task
            of its own.
          </p>
        </div>
      ) : (
        <div className="bg-theme-bg-secondary text-theme-text-primary rounded-xl w-full">
          {flows.map((flow, index) => (
            <div
              key={flow.uuid}
              className={`flex items-center justify-between gap-4 py-3 px-4 ${
                index === 0 ? "rounded-t-xl" : ""
              } ${
                index === flows.length - 1
                  ? "rounded-b-xl"
                  : "border-b border-theme-sidebar-border"
              }`}
            >
              <div className="flex flex-col min-w-0">
                <p className="text-sm font-medium truncate">{flow.name}</p>
                {flow.description && (
                  <p className="text-xs text-theme-text-secondary truncate">
                    {flow.description}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-x-1 shrink-0">
                <Toggle
                  enabled={flow.active}
                  onChange={() => toggleFlow(flow)}
                />
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Edit flow"
                  onClick={() =>
                    navigate(paths.workspace.agents.editFlow(slug, flow.uuid))
                  }
                >
                  <Pencil />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Delete flow"
                  onClick={() => deleteFlow(flow)}
                >
                  <Trash2 />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog config={confirm} onClose={() => setConfirm(null)} />
    </div>
  );
}

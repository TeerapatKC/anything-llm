import React, { useEffect, useState } from "react";
import AgentFlows from "@/models/agentFlows";
import showToast from "@/utils/toast";
import { Building2, Pencil, Settings, Trash2, Workflow } from "lucide-react";
import { useNavigate } from "react-router-dom";
import paths from "@/utils/paths";
import Toggle, { SimpleToggleSwitch } from "@/components/lib/Toggle";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useTranslation } from "react-i18next";

function ManageFlowMenu({ flow, onDelete }) {
  const [confirm, setConfirm] = useState(null);
  const navigate = useNavigate();
  const { t } = useTranslation();

  async function deleteFlow() {
    setConfirm({
      title: t("agent-flow.delete-title"),
      description: t("agent-flow.delete-description"),
      confirmText: t("agent-flow.delete-confirm"),
      variant: "destructive",
      onConfirm: async () => {
        const { success, error } = await AgentFlows.deleteFlow(flow.uuid);
        if (success) {
          showToast(t("agent-flow.deleted"), "success");
          onDelete(flow.uuid);
        } else {
          showToast(error || t("agent-flow.delete-failed"), "error");
        }
      },
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t("agent-flow.manage")}
            />
          }
        >
          <Settings />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem
            onClick={() => navigate(paths.agents.editAgent(flow.uuid))}
          >
            <Pencil />
            {t("agent-flow.edit")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={deleteFlow}>
            <Trash2 />
            {t("agent-flow.delete")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ConfirmDialog config={confirm} onClose={() => setConfirm(null)} />
    </>
  );
}

export default function FlowPanel({ flow, toggleFlow, enabled, onDelete }) {
  const { t } = useTranslation();
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
      showToast(t("agent-flow.toggle-failed"), "error", { clear: true });
    }
  };

  return (
    <>
      <div className="p-2">
        <div className="flex w-full flex-col gap-y-[18px] min-[1100px]:max-w-[500px]">
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
            {flow.description || t("agent-flow.no-description")}
          </p>
          {/* A workspace-owned flow already belongs to exactly one workspace, so there
              is no sharing decision to offer - the server rejects it too. */}
          {flow.scope === "workspace" ? (
            <p className="text-theme-text-secondary text-xs py-1.5">
              {t("agent-flow.workspace-owned-hint")}
            </p>
          ) : (
            <FlowWorkspaceVisibility flowUuid={flow.uuid} />
          )}
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
  const { t } = useTranslation();
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
      showToast(t("agent-flow.visibility.updated"), "success", {
        clear: true,
      });
      setWorkspaces((prev) =>
        prev.map((w) => ({ ...w, enabled: selectedIds.has(w.id) }))
      );
      setHasChanges(false);
    } else {
      showToast(error || t("agent-flow.visibility.failed"), "error", {
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
            {t("agent-flow.visibility.title")}
          </h3>
          <p className="mt-0.5 text-xs text-theme-text-secondary">
            {t("agent-flow.visibility.description")}
          </p>
        </div>
        {workspaces.length > 0 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={toggleSelectAll}
          >
            {allSelected
              ? t("agent-flow.visibility.clear-all")
              : t("agent-flow.visibility.select-all")}
          </Button>
        )}
      </div>

      {loading ? (
        <p className="px-4 py-3 text-xs text-theme-text-secondary">
          {t("agent-flow.visibility.loading")}
        </p>
      ) : workspaces.length === 0 ? (
        <p className="px-4 py-3 text-xs text-theme-text-primary/40">
          {t("agent-flow.visibility.empty")}
        </p>
      ) : (
        <div className="thin-scrollbar flex max-h-[320px] flex-col gap-y-2 overflow-y-auto p-3">
          {workspaces.map((ws) => (
            <div
              key={ws.id}
              className="rounded-lg bg-muted/10 ring-1 ring-foreground/10 p-3"
            >
              <label className="flex min-h-8 w-full cursor-pointer items-center justify-between gap-4">
                <span className="min-w-0 text-left text-sm font-medium text-foreground">
                  {ws.name}
                </span>
                <SimpleToggleSwitch
                  size="md"
                  enabled={selectedIds.has(ws.id)}
                  onChange={(checked) => toggleWorkspace(ws.id, checked)}
                />
              </label>
            </div>
          ))}
        </div>
      )}

      {hasChanges && (
        <div className="flex items-center gap-x-2 border-t border-theme-sidebar-border p-3">
          <Button type="button" size="sm" onClick={handleSave}>
            {saving
              ? t("agent-flow.visibility.saving")
              : t("agent-flow.visibility.save")}
          </Button>
        </div>
      )}
    </div>
  );
}

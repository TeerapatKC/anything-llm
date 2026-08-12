import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import Workspace from "@/models/workspace";
import System from "@/models/system";
import showToast from "@/utils/toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import Toggle from "@/components/lib/Toggle";
import {
  getDefaultSkills,
  getConfigurableSkills,
  getAppIntegrationSkills,
} from "@/pages/Admin/Agents/skills.jsx";

/**
 * Per-workspace agent skill selection.
 *
 * Agent skills used to be an instance-wide setting only — every workspace shared
 * one list. Each workspace now keeps its own copy; until it is saved for the
 * first time the workspace inherits the instance-wide defaults (the API resolves
 * that for us, so `config` here is always concrete).
 */
export default function AgentSkillSelection({ workspace }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [config, setConfig] = useState(null);
  const [catalog, setCatalog] = useState(null);
  const [systemSettings, setSystemSettings] = useState({});

  useEffect(() => {
    async function fetchSkills() {
      if (!workspace?.slug) return;
      const [skills, settings] = await Promise.all([
        Workspace.agentSkills(workspace.slug),
        System.keys(),
      ]);
      setConfigured(skills?.configured ?? false);
      setConfig(skills?.config ?? null);
      setCatalog(skills?.catalog ?? null);
      setSystemSettings(settings ?? {});
      setLoading(false);
    }
    fetchSkills();
  }, [workspace?.slug]);

  /**
   * Toggle membership of `id` within one of the config's string-array fields.
   * @param {string} field
   * @param {string} id
   * @param {boolean} enabled
   */
  function toggleInList(field, id, enabled) {
    setConfig((prev) => {
      const current = Array.isArray(prev?.[field]) ? prev[field] : [];
      const next = enabled
        ? [...new Set([...current, id])]
        : current.filter((item) => item !== id);
      return { ...prev, [field]: next };
    });
    setHasChanges(true);
  }

  async function handleSave() {
    setSaving(true);
    const { workspace: updated, message } = await Workspace.updateAgentSkills(
      workspace.slug,
      config
    );
    if (updated) {
      showToast("Workspace agent skills updated!", "success", { clear: true });
      setConfigured(true);
      setHasChanges(false);
    } else {
      showToast(`Error: ${message}`, "error", { clear: true });
    }
    setSaving(false);
  }

  async function handleReset() {
    setSaving(true);
    const { workspace: updated, message } = await Workspace.updateAgentSkills(
      workspace.slug,
      null
    );
    if (updated) {
      const skills = await Workspace.agentSkills(workspace.slug);
      setConfig(skills?.config ?? null);
      setConfigured(false);
      setHasChanges(false);
      showToast("Reverted to the instance default skills.", "success", {
        clear: true,
      });
    } else {
      showToast(`Error: ${message}`, "error", { clear: true });
    }
    setSaving(false);
  }

  if (loading) return <LoadingSkeleton />;
  if (!config)
    return (
      <p className="text-white text-opacity-60 text-xs font-medium">
        Could not load agent skills for this workspace.
      </p>
    );

  const isMultiUserMode = systemSettings?.MultiUserMode ?? false;
  const filterByMode = ([_, skillConfig]) => {
    if (!skillConfig.mode) return true;
    if (skillConfig.mode.includes("singleUserOnly") && isMultiUserMode)
      return false;
    if (skillConfig.mode.includes("multiUserOnly") && !isMultiUserMode)
      return false;
    return true;
  };

  const defaultSkills = getDefaultSkills(t);
  const configurableSkills = Object.fromEntries(
    Object.entries(getConfigurableSkills(t)).filter(filterByMode)
  );
  const appIntegrationSkills = Object.fromEntries(
    Object.entries(getAppIntegrationSkills(t)).filter(filterByMode)
  );

  return (
    <div className="flex flex-col gap-y-6">
      <div className="flex flex-col gap-y-1">
        <div className="flex items-center gap-x-2">
          <p className="text-white text-sm font-semibold">Agent Skills</p>
          {!configured && (
            <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-theme-action-menu-item-hover text-theme-text-secondary">
              Using instance defaults
            </span>
          )}
        </div>
        <p className="text-white text-opacity-60 text-xs font-medium">
          Choose which skills this workspace's agent can use. These apply to
          this workspace only — other workspaces keep their own selection.
        </p>
      </div>

      <SkillGroup
        title="Default skills"
        skills={defaultSkills}
        activeIds={config.activeDefaultSkills}
        onToggle={(id, enabled) =>
          toggleInList("activeDefaultSkills", id, enabled)
        }
      />

      <SkillGroup
        title="Configurable skills"
        skills={configurableSkills}
        activeIds={config.activeSkills}
        onToggle={(id, enabled) => toggleInList("activeSkills", id, enabled)}
      />

      <SkillGroup
        title="App integrations"
        skills={appIntegrationSkills}
        activeIds={config.activeSkills}
        onToggle={(id, enabled) => toggleInList("activeSkills", id, enabled)}
      />

      <EntityGroup
        title="Imported skills"
        emptyText="No active imported skills on this instance."
        items={catalog?.importedSkills ?? []}
        activeIds={config.activeImportedSkills}
        onToggle={(id, enabled) =>
          toggleInList("activeImportedSkills", id, enabled)
        }
      />

      <EntityGroup
        title="Agent flows"
        emptyText="No active agent flows on this instance."
        items={catalog?.flows ?? []}
        activeIds={config.activeFlows}
        onToggle={(id, enabled) => toggleInList("activeFlows", id, enabled)}
      />

      <EntityGroup
        title="MCP servers"
        emptyText="No running MCP servers on this instance."
        items={catalog?.mcpServers ?? []}
        // A null list means "every running server", which is what an
        // unconfigured workspace inherits.
        activeIds={
          config.activeMcpServers ??
          (catalog?.mcpServers ?? []).map((server) => server.id)
        }
        onToggle={(id, enabled) => {
          const current = Array.isArray(config.activeMcpServers)
            ? config.activeMcpServers
            : (catalog?.mcpServers ?? []).map((server) => server.id);
          const next = enabled
            ? [...new Set([...current, id])]
            : current.filter((item) => item !== id);
          setConfig((prev) => ({ ...prev, activeMcpServers: next }));
          setHasChanges(true);
        }}
      />

      <div className="flex items-center gap-x-2">
        {hasChanges && (
          <Button variant="default" type="button" onClick={handleSave}>
            {saving ? "Saving..." : "Save agent skills"}
          </Button>
        )}
        {configured && !hasChanges && (
          <Button variant="outline" type="button" onClick={handleReset}>
            {saving ? "Resetting..." : "Reset to instance defaults"}
          </Button>
        )}
      </div>
    </div>
  );
}

function SkillGroup({ title, skills, activeIds = [], onToggle }) {
  const entries = Object.entries(skills);
  if (entries.length === 0) return null;
  return (
    <div className="flex flex-col gap-y-2">
      <p className="text-white text-xs font-semibold uppercase tracking-wide opacity-60">
        {title}
      </p>
      {entries.map(([id, skill]) => (
        <Toggle
          key={id}
          size="md"
          variant="horizontal"
          label={skill.title}
          description={skill.description}
          enabled={activeIds.includes(id)}
          onChange={(checked) => onToggle(id, checked)}
        />
      ))}
    </div>
  );
}

function EntityGroup({
  title,
  items = [],
  activeIds = [],
  onToggle,
  emptyText,
}) {
  return (
    <div className="flex flex-col gap-y-2">
      <p className="text-white text-xs font-semibold uppercase tracking-wide opacity-60">
        {title}
      </p>
      {items.length === 0 ? (
        <p className="text-white text-opacity-40 text-xs">{emptyText}</p>
      ) : (
        items.map((item) => (
          <Toggle
            key={item.id}
            size="md"
            variant="horizontal"
            label={item.name}
            enabled={activeIds.includes(item.id)}
            onChange={(checked) => onToggle(item.id, checked)}
          />
        ))
      )}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <Skeleton
      height={40}
      width="100%"
      count={5}
      highlightColor="var(--theme-bg-primary)"
      baseColor="var(--theme-bg-secondary)"
      enableAnimation={true}
      containerClassName="flex flex-col gap-y-2"
    />
  );
}

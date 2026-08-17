import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import Workspace from "@/models/workspace";
import System from "@/models/system";
import showToast from "@/utils/toast";
import { userCan, PERMISSIONS } from "@/utils/permissions";
import { userFromStorage } from "@/utils/request";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import Toggle from "@/components/lib/Toggle";
import {
  getDefaultSkills,
  getConfigurableSkills,
  getAppIntegrationSkills,
} from "@/pages/Admin/Agents/skills.jsx";
import { getSubSkillsFor } from "./subSkills";
import { SEARCH_PROVIDERS } from "@/pages/Admin/Agents/WebSearchSelection";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/** Sentinel for "inherit the instance-wide engine" (Radix Select rejects ""). */
const INHERIT_SEARCH_PROVIDER = "__instance__";

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
  const [instanceSearchProvider, setInstanceSearchProvider] = useState(null);
  const [systemSettings, setSystemSettings] = useState({});
  // These two skills are only offered when the host actually supports them,
  // mirroring the instance-wide agent settings page.
  const [availability, setAvailability] = useState({
    fileSystemAgentAvailable: false,
    createFilesAgentAvailable: false,
  });

  useEffect(() => {
    async function fetchSkills() {
      if (!workspace?.slug) return;
      const [skills, settings, fsAvailable, createFilesAvailable] =
        await Promise.all([
          Workspace.agentSkills(workspace.slug),
          System.keys(),
          System.isFileSystemAgentAvailable(),
          System.isCreateFilesAgentAvailable(),
        ]);
      setConfigured(skills?.configured ?? false);
      setConfig(skills?.config ?? null);
      setCatalog(skills?.catalog ?? null);
      setInstanceSearchProvider(skills?.instanceSearchProvider ?? null);
      setSystemSettings(settings ?? {});
      setAvailability({
        fileSystemAgentAvailable: fsAvailable,
        createFilesAgentAvailable: createFilesAvailable,
      });
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

  /**
   * Enable/disable one child of a parent skill. Stored inverted (a list of
   * *disabled* children) to match the server, so an unlisted child is on and a
   * parent with no entry means "all children on".
   * @param {string} parentSkill
   * @param {string} subSkill
   * @param {boolean} enabled
   */
  function toggleSubSkill(parentSkill, subSkill, enabled) {
    setConfig((prev) => {
      const map = { ...(prev?.disabledSubSkills ?? {}) };
      const current = Array.isArray(map[parentSkill]) ? map[parentSkill] : [];
      const next = enabled
        ? current.filter((name) => name !== subSkill)
        : [...new Set([...current, subSkill])];
      if (next.length) map[parentSkill] = next;
      else delete map[parentSkill];
      return { ...prev, disabledSubSkills: map };
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

  // Skills marked `adminOnly` hold instance-wide third-party credentials, so only a
  // system administrator sees them here.
  const isSystemAdmin = userCan(PERMISSIONS.SUPER_ADMIN, userFromStorage());
  const filterByMode = ([_, skillConfig]) => {
    if (!skillConfig.mode) return true;
    if (skillConfig.mode.includes("adminOnly") && !isSystemAdmin) return false;
    return true;
  };

  const defaultSkills = getDefaultSkills(t);
  const configurableSkills = Object.fromEntries(
    Object.entries(getConfigurableSkills(t, availability)).filter(filterByMode)
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
        t={t}
        disabledSubSkills={config.disabledSubSkills}
        onToggleSubSkill={toggleSubSkill}
        searchProvider={config.searchProvider}
        instanceSearchProvider={instanceSearchProvider}
        onSearchProviderChange={(value) => {
          // Radix Select can't hold an empty value, so the "inherit" choice
          // uses a sentinel that maps back to null.
          const next =
            !value || value === INHERIT_SEARCH_PROVIDER ? null : value;
          setConfig((prev) => ({ ...prev, searchProvider: next }));
          setHasChanges(true);
        }}
      />

      <SkillGroup
        title="App integrations"
        skills={appIntegrationSkills}
        activeIds={config.activeSkills}
        onToggle={(id, enabled) => toggleInList("activeSkills", id, enabled)}
        t={t}
        disabledSubSkills={config.disabledSubSkills}
        onToggleSubSkill={toggleSubSkill}
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

function SkillGroup({
  title,
  skills,
  activeIds = [],
  onToggle,
  t,
  disabledSubSkills = {},
  onToggleSubSkill,
  searchProvider,
  instanceSearchProvider,
  onSearchProviderChange,
}) {
  const entries = Object.entries(skills);
  if (entries.length === 0) return null;
  return (
    <div className="flex flex-col gap-y-2">
      <p className="text-white text-xs font-semibold uppercase tracking-wide opacity-60">
        {title}
      </p>
      {entries.map(([id, skill]) => {
        const enabled = activeIds.includes(id);
        // Sub-skills only make sense while the parent is on, and only the
        // parents the server recognizes can be narrowed.
        const subSkills =
          enabled && onToggleSubSkill ? getSubSkillsFor(id, t) : [];
        const disabledChildren = disabledSubSkills[id] ?? [];
        return (
          <div key={id} className="flex flex-col gap-y-2">
            <Toggle
              size="md"
              variant="horizontal"
              label={skill.title}
              description={skill.description}
              enabled={enabled}
              onChange={(checked) => onToggle(id, checked)}
            />
            {enabled && id === "web-browsing" && onSearchProviderChange && (
              <SearchProviderPicker
                value={searchProvider}
                instanceProvider={instanceSearchProvider}
                onChange={onSearchProviderChange}
              />
            )}
            {subSkills.length > 0 && (
              <div className="flex flex-col gap-y-2 ml-6 pl-3 border-l border-theme-sidebar-border">
                {subSkills.map((sub) => (
                  <Toggle
                    key={sub.name}
                    size="sm"
                    variant="horizontal"
                    label={sub.title}
                    description={sub.description}
                    // Stored as a *disabled* list, so a child is on unless listed.
                    enabled={!disabledChildren.includes(sub.name)}
                    onChange={(checked) =>
                      onToggleSubSkill(id, sub.name, checked)
                    }
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Per-workspace choice of search engine for the web-browsing skill.
 *
 * Only the engine choice is per-workspace — every engine's API key is an
 * instance-wide setting, so this deliberately offers no key fields and an
 * unset value falls back to whatever the instance is configured to use.
 */
function SearchProviderPicker({ value, instanceProvider, onChange }) {
  const instanceName =
    SEARCH_PROVIDERS.find((p) => p.value === instanceProvider)?.name ??
    "not set";
  return (
    <div className="flex flex-col gap-y-1 ml-6 pl-3 border-l border-theme-sidebar-border">
      <label className="text-theme-text-primary text-xs font-medium">
        Search engine
      </label>
      <Select value={value ?? INHERIT_SEARCH_PROVIDER} onValueChange={onChange}>
        <SelectTrigger variant="settings" className="w-fit min-w-[220px]">
          <SelectValue placeholder="Select an engine" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={INHERIT_SEARCH_PROVIDER}>
            Use instance default ({instanceName})
          </SelectItem>
          {SEARCH_PROVIDERS.map((provider) => (
            <SelectItem key={provider.value} value={provider.value}>
              {provider.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-white text-opacity-40 text-xs">
        API keys for each engine are configured instance-wide under Agent
        Skills.
      </p>
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

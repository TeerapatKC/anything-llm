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
import {
  Brain,
  Package,
  Plug,
  Server,
  SlidersHorizontal,
  Workflow,
  Wrench,
} from "lucide-react";

/** Sentinel for "inherit the instance-wide engine" (Radix Select rejects ""). */
const INHERIT_SEARCH_PROVIDER = "__instance__";

/** Same idea for the boolean runtime knobs, which are tri-state here. */
const INHERIT_RUNTIME = "__inherit__";

/**
 * The runtime knobs a workspace may override, in display order. Each one falls
 * back to the instance-wide value independently, so a workspace can raise its
 * tool budget without freezing the rest of the settings.
 */
const RUNTIME_KNOBS = [
  {
    field: "maxToolCalls",
    kind: "int",
    label: "Max tool call stack",
    description: "How many tools the agent may chain before it has to answer.",
  },
  {
    field: "rerankerEnabled",
    kind: "bool",
    label: "Intelligent skill selection",
    description:
      "Rerank the available skills against the message and send only the most relevant ones.",
  },
  {
    field: "rerankerTopN",
    kind: "int",
    label: "Skills kept after reranking",
    description: "How many skills survive reranking on each message.",
    // Pointless to tune while the reranker is off for this workspace.
    dependsOn: "rerankerEnabled",
  },
  {
    field: "clarifyingQuestionsEnabled",
    kind: "bool",
    label: "Clarifying questions",
    description:
      "Let the agent stop and ask the user for missing details instead of guessing.",
  },
  {
    field: "clarifyingQuestionsMaxPerTurn",
    kind: "int",
    label: "Clarifying questions per turn",
    description: "How many questions the agent may ask in a single turn.",
    dependsOn: "clarifyingQuestionsEnabled",
  },
];

/**
 * Per-workspace agent skill selection.
 *
 * Agent skills used to be an instance-wide setting only — every workspace shared
 * one list. Each workspace now keeps its own copy; until it is saved for the
 * first time the workspace inherits the instance-wide defaults (the API resolves
 * that for us, so `config` here is always concrete).
 */
export default function AgentSkillSelection({
  workspace,
  focusSkillId = null,
  onNavigationChange,
  onItemStatusChange,
}) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [config, setConfig] = useState(null);
  const [catalog, setCatalog] = useState(null);
  const [instanceSearchProvider, setInstanceSearchProvider] = useState(null);
  const [systemSettings, setSystemSettings] = useState({});
  // What "inherit" currently resolves to for each runtime knob.
  const [instanceRuntime, setInstanceRuntime] = useState(null);
  // Which credential-gated skills an administrator has actually set up. Skills
  // absent from this map need no credential.
  const [skillCredentials, setSkillCredentials] = useState({});
  // Search engines this instance holds a usable key for.
  const [availableSearchProviders, setAvailableSearchProviders] = useState([]);
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
      setInstanceRuntime(skills?.instanceRuntime ?? null);
      setSkillCredentials(skills?.skillCredentials ?? {});
      setAvailableSearchProviders(skills?.availableSearchProviders ?? []);
      setSystemSettings(settings ?? {});
      setAvailability({
        fileSystemAgentAvailable: fsAvailable,
        createFilesAgentAvailable: createFilesAvailable,
      });
      const isAdmin = userCan(PERMISSIONS.SYSTEM_ADMIN, userFromStorage());
      const canShow = ([id, skill]) => {
        if (skill.mode?.includes("adminOnly") && !isAdmin) return false;
        return skills?.skillCredentials?.[id]
          ? skills.skillCredentials[id].configured === true
          : true;
      };
      const resolvedConfig = skills?.config ?? {};
      const toNavItems = (category, entries, activeIds = []) =>
        Object.entries(entries)
          .filter(canShow)
          .map(([id, skill]) => ({
            key: id,
            category,
            title: skill.title,
            icon: skill.Icon ?? skill.icon,
            status: activeIds.includes(id) ? "On" : "Off",
          }));

      /**
       * A category with nothing in it used to disappear from the nav entirely,
       * which made it impossible to tell whether the workspace had no custom
       * skills / flows / MCP servers or whether the feature simply did not
       * exist here. Keep the heading and explain the emptiness instead.
       * @param {string} category
       * @param {string} text
       */
      const emptyNavItem = (category, text) => ({
        key: `__empty__:${category}`,
        category,
        title: text,
        empty: true,
      });
      /** Items, or a single explanatory row when there are none. */
      const withEmptyState = (items, category, text) =>
        items.length > 0 ? items : [emptyNavItem(category, text)];

      onNavigationChange?.([
        ...toNavItems(
          "Default skills",
          getDefaultSkills(t),
          resolvedConfig.activeDefaultSkills
        ),
        ...toNavItems(
          "Configurable skills",
          getConfigurableSkills(t, {
            fileSystemAgentAvailable: fsAvailable,
            createFilesAgentAvailable: createFilesAvailable,
          }),
          resolvedConfig.activeSkills
        ),
        // Integrations whose credential an administrator has not supplied are
        // filtered out by `canShow`, so an all-unconfigured instance lands on
        // the empty state rather than on a list of toggles that cannot work.
        ...withEmptyState(
          toNavItems(
            "App integrations",
            getAppIntegrationSkills(t),
            resolvedConfig.activeSkills
          ),
          "App integrations",
          "No integrations connected on this instance."
        ),
        ...withEmptyState(
          (skills?.catalog?.importedSkills ?? []).map((item) => ({
            key: `imported:${item.id}`,
            category: "Custom skills",
            title: item.name,
            icon: Package,
            status: resolvedConfig.activeImportedSkills?.includes(item.id)
              ? "On"
              : "Off",
          })),
          "Custom skills",
          "No custom skills installed on this instance."
        ),
        ...withEmptyState(
          (skills?.catalog?.flows ?? []).map((item) => ({
            key: `flow:${item.id}`,
            category: "Agent flows",
            title: item.name,
            icon: Workflow,
            status: resolvedConfig.activeFlows?.includes(item.id)
              ? "On"
              : "Off",
          })),
          "Agent flows",
          "No agent flows on this instance."
        ),
        ...withEmptyState(
          (skills?.catalog?.mcpServers ?? []).map((item) => ({
            key: `mcp:${item.id}`,
            category: "MCP servers",
            title: item.name,
            icon: Server,
            status:
              resolvedConfig.activeMcpServers == null ||
              resolvedConfig.activeMcpServers?.includes(item.id)
                ? "On"
                : "Off",
          })),
          "MCP servers",
          "No MCP servers running on this instance."
        ),
        {
          key: "agent-skill-settings",
          category: "Settings",
          title: "Agent Skill Settings",
          icon: SlidersHorizontal,
        },
      ]);
      setLoading(false);
    }
    fetchSkills();
  }, [onNavigationChange, t, workspace?.slug]);

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
    onItemStatusChange?.(id, enabled);
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

  /**
   * Set one runtime knob for this workspace. `null` clears the override and
   * hands the knob back to the instance-wide setting.
   * @param {string} field
   * @param {number|boolean|null} value
   */
  function setRuntimeOverride(field, value) {
    setConfig((prev) => ({
      ...prev,
      runtime: { ...(prev?.runtime ?? {}), [field]: value },
    }));
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
      <p className="text-theme-text-primary/60 text-xs font-medium">
        Could not load agent skills for this workspace.
      </p>
    );

  // Skills marked `adminOnly` hold instance-wide third-party credentials, so only a
  // system administrator sees them here.
  const isSystemAdmin = userCan(PERMISSIONS.SYSTEM_ADMIN, userFromStorage());
  const filterByMode = ([_, skillConfig]) => {
    if (!skillConfig.mode) return true;
    if (skillConfig.mode.includes("adminOnly") && !isSystemAdmin) return false;
    return true;
  };

  /**
   * Credentials (API keys, OAuth grants) are supplied once by an administrator
   * for the whole instance and are not enterable from here. Offering a toggle
   * for a skill whose credential was never set would just produce an agent that
   * advertises a tool and then fails when it calls it, so those are left out.
   */
  const filterByCredentials = ([id]) =>
    skillCredentials?.[id] ? skillCredentials[id].configured === true : true;

  const countHidden = (skills) =>
    Object.entries(skills)
      .filter(filterByMode)
      .filter((entry) => !filterByCredentials(entry)).length;

  const usableSkills = (skills) =>
    Object.fromEntries(
      Object.entries(skills).filter(filterByMode).filter(filterByCredentials)
    );

  const allConfigurableSkills = getConfigurableSkills(t, availability);
  const allAppIntegrationSkills = getAppIntegrationSkills(t);

  const defaultSkills = getDefaultSkills(t);
  const configurableSkills = usableSkills(allConfigurableSkills);
  const appIntegrationSkills = usableSkills(allAppIntegrationSkills);
  const hiddenSkillCount =
    countHidden(allConfigurableSkills) + countHidden(allAppIntegrationSkills);

  const focusedSkill =
    defaultSkills[focusSkillId] ??
    configurableSkills[focusSkillId] ??
    appIntegrationSkills[focusSkillId] ??
    null;
  const focusedSkillCategory = defaultSkills[focusSkillId]
    ? "Default skill"
    : configurableSkills[focusSkillId]
      ? "Configurable skill"
      : appIntegrationSkills[focusSkillId]
        ? "App integration"
        : null;

  if (focusedSkill) {
    const activeField =
      focusedSkillCategory === "Default skill"
        ? "activeDefaultSkills"
        : "activeSkills";
    const enabled = (config[activeField] ?? []).includes(focusSkillId);
    const FocusIcon = focusedSkill.Icon ?? focusedSkill.icon;
    const subSkills =
      enabled && focusedSkillCategory === "Configurable skill"
        ? getSubSkillsFor(focusSkillId, t)
        : [];
    const disabledChildren = config.disabledSubSkills?.[focusSkillId] ?? [];
    return (
      <div className="flex max-w-[720px] flex-col gap-y-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-sidebar-accent text-theme-text-primary">
              {FocusIcon && <FocusIcon size={21} />}
            </span>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-theme-text-primary">
                {focusedSkill.title}
              </h2>
              <span className="mt-1 inline-flex rounded-md bg-theme-action-menu-item-hover px-2 py-0.5 text-[10px] uppercase tracking-wide text-theme-text-secondary">
                {focusedSkillCategory}
              </span>
            </div>
          </div>
          <Toggle
            size="lg"
            enabled={enabled}
            onChange={(checked) =>
              toggleInList(activeField, focusSkillId, checked)
            }
          />
        </div>

        {focusedSkill.image ? (
          <img
            src={focusedSkill.image}
            alt={focusedSkill.title}
            className="w-full rounded-xl border border-theme-sidebar-border"
          />
        ) : (
          <div className="flex h-48 w-full items-center justify-center rounded-xl border border-theme-sidebar-border bg-sidebar-accent/30 text-theme-text-secondary">
            {FocusIcon && <FocusIcon size={48} />}
          </div>
        )}

        <p className="text-sm leading-6 text-theme-text-secondary">
          {focusedSkill.description}
        </p>

        {enabled &&
          focusSkillId === "web-browsing" &&
          availableSearchProviders && (
            <SearchProviderPicker
              value={config.searchProvider}
              instanceProvider={instanceSearchProvider}
              availableProviders={availableSearchProviders}
              onChange={(value) => {
                const next =
                  !value || value === INHERIT_SEARCH_PROVIDER ? null : value;
                setConfig((prev) => ({ ...prev, searchProvider: next }));
                setHasChanges(true);
              }}
            />
          )}

        {subSkills.length > 0 && (
          <div className="flex flex-col gap-y-3 rounded-xl border border-theme-sidebar-border p-4">
            <h3 className="text-sm font-semibold text-theme-text-primary">
              Available actions
            </h3>
            {subSkills.map((sub) => (
              <SubSkillRow
                key={sub.name}
                subSkill={sub}
                enabled={!disabledChildren.includes(sub.name)}
                onToggle={(checked) =>
                  toggleSubSkill(focusSkillId, sub.name, checked)
                }
              />
            ))}
          </div>
        )}

        <SkillSaveActions
          hasChanges={hasChanges}
          configured={configured}
          saving={saving}
          onSave={handleSave}
          onReset={handleReset}
        />
      </div>
    );
  }

  if (focusSkillId === "agent-skill-settings") {
    return (
      <div className="flex max-w-[720px] flex-col gap-y-5">
        <RuntimeGroup
          runtime={config.runtime}
          instanceRuntime={instanceRuntime}
          onChange={setRuntimeOverride}
        />
        <SkillSaveActions
          hasChanges={hasChanges}
          configured={configured}
          saving={saving}
          onSave={handleSave}
          onReset={handleReset}
        />
      </div>
    );
  }

  const [focusedEntityType, focusedEntityId] = String(focusSkillId ?? "").split(
    ":"
  );
  const focusedEntityCatalog =
    focusedEntityType === "imported"
      ? catalog?.importedSkills
      : focusedEntityType === "flow"
        ? catalog?.flows
        : focusedEntityType === "mcp"
          ? catalog?.mcpServers
          : null;
  const focusedEntity = focusedEntityCatalog?.find(
    (item) => String(item.id) === focusedEntityId
  );

  if (focusedEntity) {
    const entityConfig =
      focusedEntityType === "imported"
        ? {
            label: "Custom skill",
            Icon: Package,
            field: "activeImportedSkills",
            activeIds: config.activeImportedSkills ?? [],
          }
        : focusedEntityType === "flow"
          ? {
              label: "Agent flow",
              Icon: Workflow,
              field: "activeFlows",
              activeIds: config.activeFlows ?? [],
            }
          : {
              label: "MCP server",
              Icon: Server,
              field: "activeMcpServers",
              activeIds:
                config.activeMcpServers ??
                (catalog?.mcpServers ?? []).map((server) => server.id),
            };
    const EntityIcon = entityConfig.Icon;
    return (
      <div className="flex max-w-[720px] flex-col gap-y-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-sidebar-accent text-theme-text-primary">
              <EntityIcon size={21} />
            </span>
            <div>
              <h2 className="text-base font-semibold text-theme-text-primary">
                {focusedEntity.name}
              </h2>
              <p className="mt-1 text-xs text-theme-text-secondary">
                {entityConfig.label}
              </p>
            </div>
          </div>
          <Toggle
            size="lg"
            enabled={entityConfig.activeIds.includes(focusedEntity.id)}
            onChange={(checked) => {
              if (focusedEntityType !== "mcp") {
                toggleInList(entityConfig.field, focusedEntity.id, checked);
                return;
              }
              const current = Array.isArray(config.activeMcpServers)
                ? config.activeMcpServers
                : (catalog?.mcpServers ?? []).map((server) => server.id);
              const next = checked
                ? [...new Set([...current, focusedEntity.id])]
                : current.filter((item) => item !== focusedEntity.id);
              setConfig((prev) => ({ ...prev, activeMcpServers: next }));
              onItemStatusChange?.(focusedEntity.id, checked);
              setHasChanges(true);
            }}
          />
        </div>
        <div className="flex h-48 items-center justify-center rounded-xl border border-theme-sidebar-border bg-sidebar-accent/30 text-theme-text-secondary">
          <EntityIcon size={48} />
        </div>
        <SkillSaveActions
          hasChanges={hasChanges}
          configured={configured}
          saving={saving}
          onSave={handleSave}
          onReset={handleReset}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-y-6">
      <div className="flex flex-col gap-y-1">
        <div className="flex items-center gap-x-2">
          <p className="text-theme-text-primary text-sm font-semibold">
            Agent Skills
          </p>
          {!configured && (
            <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-theme-action-menu-item-hover text-theme-text-secondary">
              Using instance defaults
            </span>
          )}
        </div>
        <p className="text-theme-text-primary/60 text-xs font-medium">
          Choose which skills this workspace's agent can use. These apply to
          this workspace only — other workspaces keep their own selection.
        </p>
      </div>

      <SkillGroup
        title="Default skills"
        Icon={Brain}
        skills={defaultSkills}
        activeIds={config.activeDefaultSkills}
        onToggle={(id, enabled) =>
          toggleInList("activeDefaultSkills", id, enabled)
        }
      />

      <SkillGroup
        title="Configurable skills"
        Icon={Wrench}
        skills={configurableSkills}
        activeIds={config.activeSkills}
        onToggle={(id, enabled) => toggleInList("activeSkills", id, enabled)}
        t={t}
        disabledSubSkills={config.disabledSubSkills}
        onToggleSubSkill={toggleSubSkill}
        searchProvider={config.searchProvider}
        instanceSearchProvider={instanceSearchProvider}
        availableSearchProviders={availableSearchProviders}
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
        Icon={Plug}
        skills={appIntegrationSkills}
        activeIds={config.activeSkills}
        onToggle={(id, enabled) => toggleInList("activeSkills", id, enabled)}
        t={t}
        disabledSubSkills={config.disabledSubSkills}
        onToggleSubSkill={toggleSubSkill}
      />

      {hiddenSkillCount > 0 && (
        <p className="text-theme-text-primary/40 text-xs">
          {hiddenSkillCount} skill{hiddenSkillCount === 1 ? " is" : "s are"} not
          shown because no credentials have been set up for{" "}
          {hiddenSkillCount === 1 ? "it" : "them"} on this instance. An
          administrator configures those under Agent Skills.
        </p>
      )}

      <EntityGroup
        title="Imported skills"
        Icon={Package}
        emptyText="No active imported skills on this instance."
        items={catalog?.importedSkills ?? []}
        activeIds={config.activeImportedSkills}
        onToggle={(id, enabled) =>
          toggleInList("activeImportedSkills", id, enabled)
        }
      />

      <EntityGroup
        title="Agent flows"
        Icon={Workflow}
        emptyText="No active agent flows on this instance."
        items={catalog?.flows ?? []}
        activeIds={config.activeFlows}
        onToggle={(id, enabled) => toggleInList("activeFlows", id, enabled)}
      />

      <EntityGroup
        title="MCP servers"
        Icon={Server}
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

      <RuntimeGroup
        runtime={config.runtime}
        instanceRuntime={instanceRuntime}
        onChange={setRuntimeOverride}
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

function SkillSaveActions({ hasChanges, configured, saving, onSave, onReset }) {
  return (
    <div className="flex items-center gap-x-2 border-t border-theme-sidebar-border pt-4">
      {hasChanges && (
        <Button type="button" onClick={onSave}>
          {saving ? "Saving..." : "Save agent skills"}
        </Button>
      )}
      {configured && !hasChanges && (
        <Button variant="outline" type="button" onClick={onReset}>
          {saving ? "Resetting..." : "Reset to instance defaults"}
        </Button>
      )}
    </div>
  );
}

function SkillGroup({
  title,
  Icon,
  skills,
  activeIds = [],
  onToggle,
  t,
  disabledSubSkills = {},
  onToggleSubSkill,
  searchProvider,
  instanceSearchProvider,
  availableSearchProviders = [],
  onSearchProviderChange,
}) {
  const entries = Object.entries(skills);
  if (entries.length === 0) return null;
  return (
    <section className="overflow-hidden rounded-xl border border-theme-sidebar-border bg-theme-bg-secondary">
      <div className="flex items-center gap-2 border-b border-theme-sidebar-border bg-sidebar-accent/40 px-4 py-3">
        {Icon && <Icon size={17} className="text-theme-text-secondary" />}
        <h3 className="text-sm font-semibold text-theme-text-primary">
          {title}
        </h3>
        <span className="ml-auto rounded-md bg-muted/40 px-2 py-0.5 text-xs text-theme-text-secondary">
          {entries.length}
        </span>
      </div>
      <div className="grid gap-3 p-3 xl:grid-cols-2">
        {entries.map(([id, skill]) => {
          const enabled = activeIds.includes(id);
          // Sub-skills only make sense while the parent is on, and only the
          // parents the server recognizes can be narrowed.
          const subSkills =
            enabled && onToggleSubSkill ? getSubSkillsFor(id, t) : [];
          const disabledChildren = disabledSubSkills[id] ?? [];
          return (
            <div
              key={id}
              className="flex min-w-0 flex-col gap-y-3 rounded-xl border border-theme-sidebar-border bg-muted/10 p-3"
            >
              <div className="flex min-w-0 items-start gap-3">
                <SkillVisual skill={skill} fallbackIcon={Icon} />
                <div className="min-w-0 flex-1">
                  <Toggle
                    size="md"
                    variant="horizontal"
                    label={skill.title}
                    description={skill.description}
                    enabled={enabled}
                    onChange={(checked) => onToggle(id, checked)}
                  />
                </div>
              </div>
              {enabled && id === "web-browsing" && onSearchProviderChange && (
                <SearchProviderPicker
                  value={searchProvider}
                  instanceProvider={instanceSearchProvider}
                  availableProviders={availableSearchProviders}
                  onChange={onSearchProviderChange}
                />
              )}
              {subSkills.length > 0 && (
                <div className="ml-3 flex flex-col gap-y-2 border-l border-theme-sidebar-border pl-3">
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
    </section>
  );
}

function SkillVisual({ skill, fallbackIcon: FallbackIcon }) {
  if (skill.image) {
    return (
      <img
        src={skill.image}
        alt=""
        className="size-14 shrink-0 rounded-lg border border-theme-sidebar-border object-cover"
      />
    );
  }

  const SkillIcon = skill.Icon ?? skill.icon ?? FallbackIcon;
  return (
    <span className="flex size-14 shrink-0 items-center justify-center rounded-lg border border-theme-sidebar-border bg-sidebar-accent/50 text-theme-text-secondary">
      {SkillIcon && <SkillIcon size={24} />}
    </span>
  );
}

/**
 * Per-workspace choice of search engine for the web-browsing skill.
 *
 * Only the engine choice is per-workspace — every engine's API key is an
 * instance-wide setting, so this deliberately offers no key fields and an
 * unset value falls back to whatever the instance is configured to use. For the
 * same reason the list is narrowed to engines this instance already holds a key
 * for (plus the keyless ones); picking any other would only fail at query time.
 */
/**
 * One toggleable child action of a parent skill.
 *
 * Every sub-skill catalog (filesystem, create-files, gmail, outlook) ships an
 * `icon` per action, which the instance-wide panels render — this mirrors that
 * so the same action looks the same on both screens.
 */
function SubSkillRow({ subSkill, enabled, onToggle }) {
  const Icon = subSkill.icon;
  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-lg border p-2 ${
        enabled
          ? "border-theme-sidebar-border/50 bg-theme-bg-secondary/50"
          : "border-theme-sidebar-border/30 bg-theme-bg-secondary/30"
      }`}
    >
      <div className="flex min-w-0 items-center gap-x-2">
        {Icon && (
          <Icon
            size={16}
            className={`shrink-0 ${enabled ? "text-theme-text-primary" : "text-theme-text-secondary/50"}`}
          />
        )}
        <div className="flex min-w-0 flex-col">
          <span
            className={`text-sm font-medium ${enabled ? "text-theme-text-primary" : "text-theme-text-secondary/50"}`}
          >
            {subSkill.title}
          </span>
          {subSkill.description && (
            <span
              className={`text-xs ${enabled ? "text-theme-text-secondary" : "text-theme-text-secondary/40"}`}
            >
              {subSkill.description}
            </span>
          )}
        </div>
      </div>
      <div className="shrink-0">
        <Toggle size="md" enabled={enabled} onChange={onToggle} />
      </div>
    </div>
  );
}

/**
 * An engine's logo next to its name. SEARCH_PROVIDERS already carries a `logo`
 * per engine — the instance-wide picker shows it, so this one does too.
 */
function EngineLabel({ engine, text }) {
  return (
    <span className="flex min-w-0 items-center gap-x-2">
      {engine?.logo && (
        <img
          src={engine.logo}
          alt=""
          aria-hidden="true"
          className="size-4 shrink-0 rounded-sm object-contain"
        />
      )}
      <span className="truncate">{text}</span>
    </span>
  );
}

function SearchProviderPicker({
  value,
  instanceProvider,
  availableProviders = [],
  onChange,
}) {
  const instanceEngine = SEARCH_PROVIDERS.find(
    (p) => p.value === instanceProvider
  );
  const instanceName = instanceEngine?.name ?? "not set";

  const selectable = SEARCH_PROVIDERS.filter((provider) =>
    availableProviders.includes(provider.value)
  );
  // A previously-saved engine whose key has since been removed still has to
  // render, or the picker would show an empty trigger for a value that is
  // genuinely set.
  const stale =
    value && !availableProviders.includes(value)
      ? SEARCH_PROVIDERS.find((p) => p.value === value)
      : null;

  // What the agent will actually search with: this workspace's pick, or the
  // instance's engine when the workspace is still inheriting.
  const effectiveEngine = value
    ? SEARCH_PROVIDERS.find((p) => p.value === value)
    : instanceEngine;

  return (
    <div className="flex flex-col gap-y-1 ml-6 pl-3 border-l border-theme-sidebar-border">
      <label className="text-theme-text-primary text-xs font-medium">
        Search engine
      </label>
      <Select value={value ?? INHERIT_SEARCH_PROVIDER} onValueChange={onChange}>
        <SelectTrigger className="w-fit min-w-[220px]">
          {/* Base UI renders the raw value unless given a formatter, and the
              inherit sentinel is not something to show a user. */}
          <SelectValue placeholder="Select an engine">
            {(selected) => {
              const inherit = selected === INHERIT_SEARCH_PROVIDER || !selected;
              const engine = inherit
                ? instanceEngine
                : SEARCH_PROVIDERS.find((p) => p.value === selected);
              return (
                <EngineLabel
                  engine={engine}
                  text={
                    inherit
                      ? `Use instance default (${instanceName})`
                      : (engine?.name ?? selected)
                  }
                />
              );
            }}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={INHERIT_SEARCH_PROVIDER}>
            <EngineLabel
              engine={instanceEngine}
              text={`Use instance default (${instanceName})`}
            />
          </SelectItem>
          {selectable.map((provider) => (
            <SelectItem key={provider.value} value={provider.value}>
              <EngineLabel engine={provider} text={provider.name} />
            </SelectItem>
          ))}
          {stale && (
            <SelectItem value={stale.value}>
              <EngineLabel
                engine={stale}
                text={`${stale.name} (no API key set)`}
              />
            </SelectItem>
          )}
        </SelectContent>
      </Select>
      {/* The engine actually in effect, so an inherited choice is as visible as
          an explicit one. */}
      {effectiveEngine && (
        <div className="mt-1 flex items-start gap-x-3 rounded-lg border border-theme-sidebar-border/50 bg-theme-bg-secondary/50 p-2.5">
          {effectiveEngine.logo && (
            <img
              src={effectiveEngine.logo}
              alt={effectiveEngine.name}
              className="size-8 shrink-0 rounded-md object-contain"
            />
          )}
          <div className="flex min-w-0 flex-col gap-y-0.5">
            <span className="text-theme-text-primary text-xs font-medium">
              {effectiveEngine.name}
              {!value && " (inherited)"}
            </span>
            <span className="text-theme-text-secondary text-xs">
              {effectiveEngine.description}
            </span>
          </div>
        </div>
      )}

      <p className="text-theme-text-primary/40 text-xs">
        Only engines an administrator has already set up are listed. API keys
        are configured instance-wide under Agent Skills.
      </p>
    </div>
  );
}

/**
 * Per-workspace overrides for the agent runtime knobs.
 *
 * Unlike the skill toggles above, these inherit knob-by-knob: leaving a field
 * on "instance default" keeps it tracking the instance-wide value even after
 * the workspace saves its own skill selection.
 */
function RuntimeGroup({ runtime, instanceRuntime, onChange }) {
  if (!instanceRuntime) return null;

  /** The value actually in effect, override first then instance. */
  const effective = (field) => runtime?.[field] ?? instanceRuntime[field];
  const describe = (value) =>
    typeof value === "boolean" ? (value ? "On" : "Off") : value;

  return (
    <section className="overflow-hidden rounded-xl border border-theme-sidebar-border bg-theme-bg-secondary">
      <div className="flex items-center gap-2 border-b border-theme-sidebar-border bg-sidebar-accent/40 px-4 py-3">
        <SlidersHorizontal size={17} className="text-theme-text-secondary" />
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-theme-text-primary">
            Agent skill settings
          </h3>
          <p className="mt-0.5 text-xs text-theme-text-secondary">
            Each setting follows the instance default until you change it here.
          </p>
        </div>
      </div>
      <div className="divide-y divide-theme-sidebar-border px-4">
        {RUNTIME_KNOBS.filter(
          (knob) => !knob.dependsOn || effective(knob.dependsOn)
        ).map((knob) => {
          const override = runtime?.[knob.field] ?? null;
          const instanceValue = instanceRuntime[knob.field];
          return (
            <div
              key={knob.field}
              className="flex items-center justify-between gap-x-4 py-4"
            >
              <div className="flex flex-1 flex-col gap-y-1">
                <label className="text-sm font-medium text-theme-text-primary">
                  {knob.label}
                </label>
                <p className="text-xs text-theme-text-primary/60">
                  {knob.description}
                </p>
              </div>

              {knob.kind === "bool" ? (
                <Select
                  value={override === null ? INHERIT_RUNTIME : String(override)}
                  onValueChange={(next) =>
                    onChange(
                      knob.field,
                      next === INHERIT_RUNTIME ? null : next === "true"
                    )
                  }
                >
                  <SelectTrigger className="w-fit min-w-[200px]">
                    <SelectValue>
                      {(selected) =>
                        selected === INHERIT_RUNTIME || selected === null
                          ? `Instance default (${describe(instanceValue)})`
                          : selected === "true"
                            ? "On"
                            : "Off"
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={INHERIT_RUNTIME}>
                      Instance default ({describe(instanceValue)})
                    </SelectItem>
                    <SelectItem value="true">On</SelectItem>
                    <SelectItem value="false">Off</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <div className="flex items-center gap-x-2">
                  <input
                    type="number"
                    min={1}
                    value={override ?? ""}
                    placeholder={String(instanceValue)}
                    onChange={(e) => {
                      const raw = e.target.value;
                      if (raw === "") return onChange(knob.field, null);
                      const parsed = parseInt(raw, 10);
                      if (isNaN(parsed) || parsed < 1) return;
                      onChange(knob.field, parsed);
                    }}
                    onWheel={(e) => e.target.blur()}
                    className="block w-[80px] rounded-lg border border-theme-sidebar-border bg-theme-settings-input-bg p-2.5 text-center text-sm text-theme-text-primary outline-none placeholder:text-theme-settings-input-placeholder focus:outline-primary-button active:outline-primary-button"
                    autoComplete="off"
                  />
                  {override !== null && (
                    <button
                      type="button"
                      onClick={() => onChange(knob.field, null)}
                      className="text-xs text-theme-text-primary/50 underline hover:text-theme-text-primary"
                    >
                      Reset
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function EntityGroup({
  title,
  Icon,
  items = [],
  activeIds = [],
  onToggle,
  emptyText,
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-theme-sidebar-border bg-theme-bg-secondary">
      <div className="flex items-center gap-2 border-b border-theme-sidebar-border bg-sidebar-accent/40 px-4 py-3">
        {Icon && <Icon size={17} className="text-theme-text-secondary" />}
        <h3 className="text-sm font-semibold text-theme-text-primary">
          {title}
        </h3>
        <span className="ml-auto rounded-md bg-muted/40 px-2 py-0.5 text-xs text-theme-text-secondary">
          {items.length}
        </span>
      </div>
      <div className="flex flex-col gap-y-2 p-3">
        {items.length === 0 ? (
          <p className="px-1 py-2 text-xs text-theme-text-primary/40">
            {emptyText}
          </p>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="rounded-lg border border-theme-sidebar-border bg-muted/10 p-3"
            >
              <Toggle
                size="md"
                variant="horizontal"
                label={item.name}
                enabled={activeIds.includes(item.id)}
                onChange={(checked) => onToggle(item.id, checked)}
              />
            </div>
          ))
        )}
      </div>
    </section>
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

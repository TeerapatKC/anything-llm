import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Workspace from "@/models/workspace";
import System from "@/models/system";
import AgentFlows from "@/models/agentFlows";
import showToast from "@/utils/toast";
import paths from "@/utils/paths";
import ConfirmDialog from "@/components/ConfirmDialog";
import SQLConnectionModal from "@/pages/Admin/Agents/SQLConnectorSelection/SQLConnectionModal";
import {
  userCan,
  workspaceCan,
  PERMISSIONS,
  WORKSPACE_PERMISSIONS,
} from "@/utils/permissions";
import { userFromStorage } from "@/utils/request";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import Toggle from "@/components/lib/Toggle";
import {
  getDefaultSkills,
  getConfigurableSkills,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Bot,
  Brain,
  Database,
  Server,
  Settings,
  SlidersHorizontal,
  Pencil,
  Plus,
  Trash2,
  Workflow,
  Wrench,
} from "lucide-react";

/** Nav key for the panel that manages this workspace's SQL connections. */
const SQL_MANAGER_KEY = "workspace-sql-connections";

/** Nav key for the panel that builds and removes this workspace's agent flows. */
const FLOW_MANAGER_KEY = "workspace-agent-flows";

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
  dataSource = null,
}) {
  const { t } = useTranslation();
  // Where this screen reads and writes its selection. The default is the workspace in
  // front of us; the private workspace profile passes its own, because it configures
  // every private workspace at once rather than any single one. Everything else on this
  // screen is identical either way, which is the point - one agent configuration UI,
  // not two that drift apart.
  const io = dataSource ?? {
    load: () => Workspace.agentSkills(workspace?.slug),
    save: (config) => Workspace.updateAgentSkills(workspace?.slug, config),
    savedMessage: "Workspace agent skills updated!",
    revertedMessage: "Reverted to the instance default skills.",
    // A workspace owns flows and SQL connections of its own, so it may create and edit
    // them here. A profile owns none - it is a template - so it can only switch the
    // instance-wide ones on and off.
    ownsEntities: true,
  };
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [config, setConfig] = useState(null);
  const [catalog, setCatalog] = useState(null);
  const [instanceSearchProvider, setInstanceSearchProvider] = useState(null);
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
  const navigate = useNavigate();
  const [confirm, setConfirm] = useState(null);
  // Bumped after a flow is deleted so the catalog refetches; the flow list lives in
  // the same payload as the rest of the skill catalog.
  const [refreshKey, setRefreshKey] = useState(0);
  const [sqlModalOpen, setSqlModalOpen] = useState(false);
  const [editingConnection, setEditingConnection] = useState(null);
  const currentUser = userFromStorage();
  const isSystemAdmin = userCan(PERMISSIONS.SYSTEM_ADMIN, currentUser);
  // Toggling a flow on for this workspace is part of managing agent skills; building
  // one is a separate, wider capability, so the build/edit/delete affordances below
  // are gated on their own permission.
  const canManageFlows =
    io.ownsEntities !== false &&
    workspaceCan(
      WORKSPACE_PERMISSIONS.AGENT_FLOWS_MANAGE,
      workspace?.slug,
      currentUser
    );
  // Supplying a database credential is its own capability, separate from switching an
  // already-configured connection on for this workspace.
  const canManageSqlConnections =
    io.ownsEntities !== false &&
    workspaceCan(
      WORKSPACE_PERMISSIONS.SQL_CONNECTORS_MANAGE,
      workspace?.slug,
      currentUser
    );

  useEffect(() => {
    async function fetchSkills() {
      if (!dataSource && !workspace?.slug) return;
      // These two only decide whether a single host-dependent skill is offered, but
      // they used to sit in a `Promise.all` with the catalog fetch - so whenever one of
      // the availability probes failed or hung, the whole screen came up empty and no
      // skills, flows or MCP servers were listed at all. Settle them independently and
      // treat a failure as "not available".
      const [skillsResult, fsResult, createFilesResult] =
        await Promise.allSettled([
          io.load(),
          System.isFileSystemAgentAvailable(),
          System.isCreateFilesAgentAvailable(),
        ]);
      const skills =
        skillsResult.status === "fulfilled" ? skillsResult.value : null;
      const fsAvailable =
        fsResult.status === "fulfilled" ? fsResult.value : false;
      const createFilesAvailable =
        createFilesResult.status === "fulfilled"
          ? createFilesResult.value
          : false;
      setConfigured(skills?.configured ?? false);
      setConfig(skills?.config ?? null);
      setCatalog(skills?.catalog ?? null);
      setInstanceSearchProvider(skills?.instanceSearchProvider ?? null);
      setInstanceRuntime(skills?.instanceRuntime ?? null);
      setSkillCredentials(skills?.skillCredentials ?? {});
      setAvailableSearchProviders(skills?.availableSearchProviders ?? []);
      setAvailability({
        fileSystemAgentAvailable: fsAvailable,
        createFilesAgentAvailable: createFilesAvailable,
      });
      const canShow = ([id, skill]) => {
        if (skill.mode?.includes("adminOnly") && !isSystemAdmin) return false;
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

      const advancedNavItems = [
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
      ];

      // Agent flows are listed separately from `advancedNavItems` so workspace-owned
      // and admin-provided flows can be identified at a glance, with the builder action
      // kept at the top of the section.
      const flowCatalog = skills?.catalog?.flows ?? [];
      const flowCategory = t("agent-panel.agent-flows");
      const flowNavItem = (item) => ({
        key: `flow:${item.id}`,
        category: flowCategory,
        title: item.name,
        badge:
          item.scope === "workspace"
            ? t("agent-flow.workspace-owned")
            : t("agent-flow.shared"),
        icon: Workflow,
        status: resolvedConfig.activeFlows?.includes(item.id) ? "On" : "Off",
      });

      const flowNavItems = [
        // Keep the builder action in the same place as the instance Agent Flows page,
        // but route to the workspace-aware builder so newly created flows retain the
        // correct owner.
        ...(canManageFlows
          ? [
              {
                key: FLOW_MANAGER_KEY,
                category: flowCategory,
                title: t("agent-panel.open-builder"),
                icon: Plus,
                status: null,
                accent: true,
                to: paths.workspace.agents.builder(workspace.slug),
              },
            ]
          : []),
        ...withEmptyState(
          flowCatalog.map(flowNavItem),
          flowCategory,
          t("ui.no-agent-flows")
        ),
      ];

      // SQL connections follow the same shape as agent flows: a create action at the
      // top, then the workspace's own connections and the shared ones, each badged so
      // it is obvious which can be edited here.
      const sqlCatalog = skills?.catalog?.sqlConnections ?? [];
      const sqlCategory = t("agent-panel.sql-connections");
      const sqlNavItem = (item) => ({
        key: `sql:${item.id}`,
        category: sqlCategory,
        title: item.name,
        badge:
          item.scope === "workspace"
            ? t("agent-flow.workspace-owned")
            : t("agent-flow.shared"),
        icon: Database,
        status: resolvedConfig.activeSqlConnections?.includes(item.id)
          ? "On"
          : "Off",
      });

      const sqlNavItems = [
        ...(canManageSqlConnections
          ? [
              {
                key: SQL_MANAGER_KEY,
                category: sqlCategory,
                title: t("agent-panel.new-sql-connection"),
                icon: Plus,
                status: null,
                accent: true,
              },
            ]
          : []),
        ...withEmptyState(
          sqlCatalog.map(sqlNavItem),
          sqlCategory,
          t("agent-panel.no-sql-connections")
        ),
      ];

      onNavigationChange?.([
        {
          key: "agent-skill-settings",
          category: "Settings",
          title: "Agent Skill Settings",
          icon: SlidersHorizontal,
        },
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
        ...flowNavItems,
        ...sqlNavItems,
        ...advancedNavItems,
      ]);
      setLoading(false);
    }
    fetchSkills();
  }, [
    canManageFlows,
    canManageSqlConnections,
    isSystemAdmin,
    onNavigationChange,
    t,
    workspace?.slug,
    refreshKey,
  ]);

  /**
   * Remove a flow this workspace owns. Global flows shared in by an admin are not
   * deletable from here - other workspaces rely on them - so the caller only offers
   * this for `scope === "workspace"` entries.
   */
  function deleteFlow(flow) {
    setConfirm({
      title: "Delete flow",
      description: `"${flow.name}" will be removed from this workspace. This cannot be undone.`,
      confirmText: "Delete",
      variant: "destructive",
      onConfirm: async () => {
        const { success, error } = await AgentFlows.workspace.deleteFlow(
          workspace.slug,
          flow.id
        );
        if (!success)
          return showToast(error || "Failed to delete flow", "error");
        showToast("Flow deleted", "success");
        setRefreshKey((key) => key + 1);
      },
    });
  }

  /**
   * Persist a connection from the shared modal. It emits the same
   * `{action, database_id, engine, connectionString, originalDatabaseId}` shape the
   * admin screen uses, which maps onto the workspace-scoped routes directly.
   */
  async function saveSqlConnection(payload = {}) {
    const body = {
      database_id: payload.database_id,
      engine: payload.engine,
      connectionString: payload.connectionString,
      ...(payload.schema ? { schema: payload.schema } : {}),
    };
    const { success, error } =
      payload.action === "update"
        ? await Workspace.sqlConnections.update(
            workspace.slug,
            payload.originalDatabaseId,
            body
          )
        : await Workspace.sqlConnections.create(workspace.slug, body);

    if (!success)
      return showToast(error || "Failed to save connection", "error");
    showToast("Connection saved", "success");
    setSqlModalOpen(false);
    setEditingConnection(null);
    setRefreshKey((key) => key + 1);
  }

  /** Remove a connection this workspace owns. */
  function deleteSqlConnection(connection) {
    setConfirm({
      title: "Delete connection",
      description: `"${connection.name}" will be removed from this workspace. Agents here will no longer be able to query it.`,
      confirmText: "Delete",
      variant: "destructive",
      onConfirm: async () => {
        const { success, error } = await Workspace.sqlConnections.delete(
          workspace.slug,
          connection.id
        );
        if (!success)
          return showToast(error || "Failed to delete connection", "error");
        showToast("Connection deleted", "success");
        setRefreshKey((key) => key + 1);
      },
    });
  }

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
    const result = await io.save(config);
    if (result?.workspace || result?.success) {
      showToast(io.savedMessage, "success", { clear: true });
      setConfigured(true);
      setHasChanges(false);
    } else {
      showToast(`Error: ${result?.message ?? result?.error}`, "error", {
        clear: true,
      });
    }
    setSaving(false);
  }

  async function handleReset() {
    setSaving(true);
    const result = await io.save(null);
    if (result?.workspace || result?.success) {
      const skills = await io.load();
      setConfig(skills?.config ?? null);
      setConfigured(false);
      setHasChanges(false);
      showToast(io.revertedMessage, "success", { clear: true });
    } else {
      showToast(`Error: ${result?.message ?? result?.error}`, "error", {
        clear: true,
      });
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

  const defaultSkills = getDefaultSkills(t);
  const configurableSkills = usableSkills(allConfigurableSkills);
  const hiddenSkillCount = countHidden(allConfigurableSkills);

  const focusedSkill =
    defaultSkills[focusSkillId] ?? configurableSkills[focusSkillId] ?? null;
  const focusedSkillCategory = defaultSkills[focusSkillId]
    ? "Default skill"
    : configurableSkills[focusSkillId]
      ? "Configurable skill"
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
      <div className="flex w-full flex-col gap-y-5 min-[1100px]:max-w-[720px]">
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
      <div className="flex w-full flex-col gap-y-5 min-[1100px]:max-w-[720px]">
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
    focusedEntityType === "flow"
      ? catalog?.flows
      : focusedEntityType === "sql"
        ? catalog?.sqlConnections
        : focusedEntityType === "mcp"
          ? catalog?.mcpServers
          : null;
  const focusedEntity = focusedEntityCatalog?.find(
    (item) => String(item.id) === focusedEntityId
  );

  // Build/remove this workspace's own flows. Toggling any flow on for the agent is
  // done from its own nav row; this panel is about authoring them.
  // Add/edit/remove the SQL connections this workspace owns. Shared connections an
  // admin configured are listed read-only: their credentials belong to the instance.
  if (focusSkillId === SQL_MANAGER_KEY) {
    const connections = catalog?.sqlConnections ?? [];
    const owned = connections.filter((conn) => conn.scope === "workspace");
    const shared = connections.filter((conn) => conn.scope !== "workspace");
    return (
      <div className="flex w-full flex-col gap-y-5 min-[1100px]:max-w-[720px]">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-sidebar-accent text-theme-text-primary">
              <Database size={21} />
            </span>
            <div>
              <h2 className="text-base font-semibold text-theme-text-primary">
                {t("agent-panel.sql-connections")}
              </h2>
              <p className="mt-1 text-xs text-theme-text-secondary">
                {t("agent-panel.sql-connections-description")}
              </p>
            </div>
          </div>
          <Button
            variant="default"
            className="shrink-0"
            onClick={() => {
              setEditingConnection(null);
              setSqlModalOpen(true);
            }}
          >
            <Plus />
            {t("agent-panel.new-sql-connection")}
          </Button>
        </div>

        {owned.length === 0 ? (
          <div className="flex flex-col items-center gap-y-2 rounded-xl border border-dashed border-theme-sidebar-border py-10 text-center">
            <Database size={20} className="text-theme-text-secondary" />
            <p className="text-sm text-theme-text-primary">
              {t("agent-panel.no-sql-connections")}
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
            {owned.map((conn, index) => (
              <div
                key={conn.id}
                className={`flex items-center justify-between gap-4 px-4 py-3 ${
                  index === owned.length - 1
                    ? ""
                    : "border-b border-theme-sidebar-border"
                }`}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-theme-text-primary">
                    {conn.name}
                  </p>
                  <p className="text-xs text-theme-text-secondary">
                    {conn.engine}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingConnection(conn);
                      setSqlModalOpen(true);
                    }}
                  >
                    <Pencil />
                    {t("agent-flow.edit")}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t("agent-flow.delete")}
                    onClick={() => deleteSqlConnection(conn)}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {shared.length > 0 && (
          <p className="text-xs text-theme-text-secondary">
            {t("agent-panel.sql-connections-shared", { count: shared.length })}
          </p>
        )}

        <SQLConnectionModal
          isOpen={sqlModalOpen}
          closeModal={() => {
            setSqlModalOpen(false);
            setEditingConnection(null);
          }}
          onSubmit={saveSqlConnection}
          setHasChanges={() => {}}
          existingConnection={editingConnection}
          connections={connections.map((conn) => ({
            database_id: conn.id,
            engine: conn.engine,
          }))}
        />
        <ConfirmDialog config={confirm} onClose={() => setConfirm(null)} />
      </div>
    );
  }

  if (focusSkillId === FLOW_MANAGER_KEY) {
    const flows = catalog?.flows ?? [];
    const owned = flows.filter((flow) => flow.scope === "workspace");
    const shared = flows.filter((flow) => flow.scope !== "workspace");
    return (
      <div className="flex w-full flex-col gap-y-5 min-[1100px]:max-w-[720px]">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-sidebar-accent text-theme-text-primary">
              <Workflow size={21} />
            </span>
            <div>
              <h2 className="text-base font-semibold text-theme-text-primary">
                Agent flows
              </h2>
              <p className="mt-1 text-xs text-theme-text-secondary">
                Flows built here belong to this workspace and run nowhere else.
              </p>
            </div>
          </div>
          <Button
            variant="default"
            className="shrink-0"
            onClick={() =>
              navigate(paths.workspace.agents.builder(workspace.slug))
            }
          >
            <Plus />
            New flow
          </Button>
        </div>

        {owned.length === 0 ? (
          <div className="flex flex-col items-center gap-y-2 rounded-xl border border-dashed border-theme-sidebar-border py-10 text-center">
            <Workflow size={20} className="text-theme-text-secondary" />
            <p className="text-sm text-theme-text-primary">No flows yet</p>
            <p className="max-w-[380px] text-xs text-theme-text-secondary">
              Build a flow to give this workspace&apos;s agent a repeatable task
              of its own.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
            {owned.map((flow, index) => (
              <div
                key={flow.id}
                className={`flex items-center justify-between gap-4 px-4 py-3 ${
                  index === owned.length - 1
                    ? ""
                    : "border-b border-theme-sidebar-border"
                }`}
              >
                <p className="min-w-0 truncate text-sm font-medium text-theme-text-primary">
                  {flow.name}
                </p>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Edit ${flow.name}`}
                    onClick={() =>
                      navigate(
                        paths.workspace.agents.editFlow(workspace.slug, flow.id)
                      )
                    }
                  >
                    <Pencil />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Delete ${flow.name}`}
                    onClick={() => deleteFlow(flow)}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {shared.length > 0 && (
          <p className="text-xs text-theme-text-secondary">
            {shared.length} flow{shared.length === 1 ? " is" : "s are"} shared
            with this workspace by an administrator. Switch{" "}
            {shared.length === 1 ? "it" : "them"} on from the list on the left;
            editing {shared.length === 1 ? "it" : "them"} is done instance-wide.
          </p>
        )}

        <ConfirmDialog config={confirm} onClose={() => setConfirm(null)} />
      </div>
    );
  }

  if (focusedEntity) {
    const entityConfig =
      focusedEntityType === "flow"
        ? {
            label: "Agent flow",
            Icon: Workflow,
            field: "activeFlows",
            activeIds: config.activeFlows ?? [],
          }
        : focusedEntityType === "sql"
          ? {
              label: "SQL connection",
              Icon: Database,
              field: "activeSqlConnections",
              activeIds: config.activeSqlConnections ?? [],
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
    // Only a flow this workspace owns can be opened in the builder. An admin-provided
    // flow is instance-wide - other workspaces run the same definition - so it stays
    // toggle-only here and is edited from /settings/agent-flows.
    const canEditThisFlow =
      focusedEntityType === "flow" &&
      canManageFlows &&
      focusedEntity.scope === "workspace";
    // Same rule for connections: only one this workspace owns is editable here, and
    // editing opens the shared modal rather than a separate screen.
    const canEditThisConnection =
      focusedEntityType === "sql" &&
      canManageSqlConnections &&
      focusedEntity.scope === "workspace";
    const handleEntityToggle = (checked) => {
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
    };
    return (
      <>
        <div className="flex w-full flex-col gap-y-5 min-[1100px]:max-w-[720px]">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              {focusedEntityType === "flow" ? (
                <EntityIcon size={24} className="shrink-0" />
              ) : (
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-sidebar-accent text-theme-text-primary">
                  <EntityIcon size={21} />
                </span>
              )}
              <div>
                <h2 className="text-base font-semibold text-theme-text-primary">
                  {focusedEntity.name}
                </h2>
                <p className="mt-1 text-xs text-theme-text-secondary">
                  {entityConfig.label}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-x-2">
              <Toggle
                size="lg"
                enabled={entityConfig.activeIds.includes(focusedEntity.id)}
                onChange={handleEntityToggle}
              />
              {canEditThisFlow && (
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
                      onClick={() =>
                        navigate(
                          paths.workspace.agents.editFlow(
                            workspace.slug,
                            focusedEntity.id
                          )
                        )
                      }
                    >
                      <Pencil />
                      {t("agent-flow.edit")}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => deleteFlow(focusedEntity)}
                    >
                      <Trash2 />
                      {t("agent-flow.delete")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              {canEditThisConnection && (
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
                      onClick={() => {
                        setEditingConnection(focusedEntity);
                        setSqlModalOpen(true);
                      }}
                    >
                      <Pencil />
                      {t("agent-flow.edit")}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => deleteSqlConnection(focusedEntity)}
                    >
                      <Trash2 />
                      {t("agent-flow.delete")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
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
        {focusedEntityType === "sql" && (
          <SQLConnectionModal
            isOpen={sqlModalOpen}
            closeModal={() => {
              setSqlModalOpen(false);
              setEditingConnection(null);
            }}
            onSubmit={saveSqlConnection}
            setHasChanges={() => {}}
            existingConnection={editingConnection}
            connections={(catalog?.sqlConnections ?? []).map((conn) => ({
              database_id: conn.id,
              engine: conn.engine,
            }))}
          />
        )}
        <ConfirmDialog config={confirm} onClose={() => setConfirm(null)} />
      </>
    );
  }

  // The navigation already lists every available skill and integration.
  // With nothing selected there is no separate overview to render here.
  if (!focusSkillId) {
    return (
      <div className="flex h-full min-h-64 flex-col items-center justify-center px-6 text-center text-theme-text-secondary">
        <span className="mb-3 flex size-12 items-center justify-center rounded-xl bg-muted/40">
          <Bot size={24} />
        </span>
        <h2 className="font-medium text-theme-text-primary">
          Select something to configure
        </h2>
        <p className="mt-1 max-w-sm text-sm">{t("help.agents")}</p>
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
          {t("help.agent-skill-selection")}
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

      <EntityGroup
        title="Agent flows"
        Icon={Workflow}
        emptyText="No agent flows available to this workspace yet."
        items={catalog?.flows ?? []}
        activeIds={config.activeFlows}
        onToggle={(id, enabled) => toggleInList("activeFlows", id, enabled)}
      />

      <>
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
      </>

      {hiddenSkillCount > 0 && (
        <p className="text-theme-text-primary/40 text-xs">
          {hiddenSkillCount} skill{hiddenSkillCount === 1 ? " is" : "s are"} not
          shown because no credentials have been set up for{" "}
          {hiddenSkillCount === 1 ? "it" : "them"} on this instance. An
          administrator configures those under Agent Skills.
        </p>
      )}

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

      <ConfirmDialog config={confirm} onClose={() => setConfirm(null)} />
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
    <section className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
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
              className="flex min-w-0 flex-col gap-y-3 rounded-xl bg-muted/10 ring-1 ring-foreground/10 p-3"
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
  const { t } = useTranslation();
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
    <div className="ml-0 flex min-w-0 flex-col gap-y-1 border-l border-theme-sidebar-border pl-3 min-[640px]:ml-6">
      <label className="text-theme-text-primary text-xs font-medium">
        Search engine
      </label>
      <Select value={value ?? INHERIT_SEARCH_PROVIDER} onValueChange={onChange}>
        <SelectTrigger className="w-full min-w-0 min-[640px]:w-fit min-[640px]:min-w-[220px]">
          {/* Base UI renders the raw value unless given a formatter, and the
              inherit sentinel is not something to show a user. */}
          <SelectValue placeholder={t("ui.select-engine")}>
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
        {t("help.agent-skill-selection-2")}
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
    <section className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
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
              className="flex flex-col items-stretch gap-3 py-4 min-[640px]:flex-row min-[640px]:items-center min-[640px]:justify-between min-[640px]:gap-x-4"
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
                  <SelectTrigger className="w-full min-[640px]:w-fit min-[640px]:min-w-[200px]">
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
    <section className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
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
              className="rounded-lg bg-muted/10 ring-1 ring-foreground/10 p-3"
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

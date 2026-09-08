import { useEffect, useRef, useState } from "react";
import { SplitLayout } from "@/components/layout/SettingsLayout";
import { useTranslation } from "react-i18next";
import { useIsMobile } from "@/hooks/use-mobile";
import Admin from "@/models/admin";
import System from "@/models/system";
import MCPServers from "@/models/mcpServers";
import showToast from "@/utils/toast";
import { userCan, PERMISSIONS } from "@/utils/permissions";
import { userFromStorage } from "@/utils/request";
import {
  Bot,
  ChevronLeft,
  ChevronRight,
  Database,
  Package,
  Plus,
  SlidersHorizontal,
  Workflow,
} from "lucide-react";
import ContextualSaveBar from "@/components/ContextualSaveBar";
import { castToType } from "@/utils/types";
import { FullScreenLoader } from "@/components/Preloader";
import {
  getDefaultSkills,
  getConfigurableSkills,
  getAppIntegrationSkills,
} from "./skills.jsx";
import { DefaultBadge } from "./Badges/default";
import AgentFlowsList from "./AgentFlows";
import FlowPanel from "./AgentFlows/FlowPanel";
import { MCPServersList, MCPServerHeader } from "./MCPServers";
import ServerPanel from "./MCPServers/ServerPanel";
import { Link, useLocation } from "react-router-dom";
import paths from "@/utils/paths";
import AgentFlows from "@/models/agentFlows";
import AgentSkillSettings from "./AgentSkillSettings";
import AgentSQLConnectorSelection from "./SQLConnectorSelection";

const IGNORE_CHANGE_SETTINGS = [
  "agentSkillRerankerEnabled",
  "agentSkillRerankerTopN",
  "agentSkillMaxToolCalls",
  "agentClarifyingQuestionsEnabled",
  "agentClarifyingQuestionsMaxPerTurn",
];
const AGENT_SKILL_SETTINGS_KEY = "agent-skill-settings";

export default function AdminAgents() {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const location = useLocation();
  const isAgentFlowRoute = location.pathname === paths.settings.agentFlow();
  const isSqlConnectorRoute =
    location.pathname === paths.settings.sqlConnector();
  const formEl = useRef(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [settings, setSettings] = useState({});
  const [selectedSkill, setSelectedSkill] = useState("");
  const [loading, setLoading] = useState(true);
  const [showSkillModal, setShowSkillModal] = useState(false);

  const [agentSkills, setAgentSkills] = useState([]);
  const [disabledAgentSkills, setDisabledAgentSkills] = useState([]);

  const [agentFlows, setAgentFlows] = useState([]);
  const [selectedFlow, setSelectedFlow] = useState(null);
  const [activeFlowIds, setActiveFlowIds] = useState([]);

  // MCP Servers are lazy loaded to not block the UI thread
  const [mcpServers, setMcpServers] = useState([]);
  const [selectedMcpServer, setSelectedMcpServer] = useState(null);

  const [fileSystemAgentAvailable, setFileSystemAgentAvailable] =
    useState(false);
  const [createFilesAgentAvailable, setCreateFilesAgentAvailable] =
    useState(false);

  const defaultSkills = getDefaultSkills(t);
  const allConfigurableSkills = getConfigurableSkills(t, {
    fileSystemAgentAvailable,
    createFilesAgentAvailable,
  });
  const allAppIntegrationSkills = getAppIntegrationSkills(t);

  // Skills marked `adminOnly` hold instance-wide third-party credentials (a single
  // OAuth grant shared by everyone), so only a system administrator may configure them.
  const currentUser = userFromStorage();
  const isSystemAdmin = userCan(PERMISSIONS.SYSTEM_ADMIN, currentUser);
  // The page itself already requires `agents.manage_skills`, so the only section
  // needing a gate of its own is agent flows, which has its own permission.
  const canManageFlows = userCan(PERMISSIONS.AGENTS_FLOWS, currentUser);
  const filterSkillsByMode = ([_, skillConfig]) => {
    if (!skillConfig.mode) return true;
    if (skillConfig.mode.includes("adminOnly") && !isSystemAdmin) return false;
    return true;
  };
  const configurableSkills = Object.fromEntries(
    Object.entries(allConfigurableSkills)
      .filter(filterSkillsByMode)
      // SQL Connector has its own dedicated, super-admin-only page now (mirrors Agent
      // Flow) - kept in the shared catalog (skills.jsx) so the per-workspace skill
      // picker can still show it, just left out of this list.
      .filter(([key]) => key !== "sql-agent")
  );
  const appIntegrationSkills = Object.fromEntries(
    Object.entries(allAppIntegrationSkills).filter(filterSkillsByMode)
  );

  // Alert user if they try to leave the page with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (event) => {
      if (hasChanges) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [hasChanges]);

  useEffect(() => {
    async function fetchSettings() {
      const [
        _settings,
        _preferences,
        flowsRes,
        fsAgentAvailable,
        createFilesAvailable,
      ] = await Promise.all([
        System.keys(),
        Admin.systemPreferencesByFields([
          "disabled_agent_skills",
          "default_agent_skills",
          "active_agent_flows",
        ]),
        AgentFlows.listFlows(),
        System.isFileSystemAgentAvailable(),
        System.isCreateFilesAgentAvailable(),
      ]);

      const { flows = [] } = flowsRes;
      setSettings({ ..._settings, preferences: _preferences.settings } ?? {});
      setAgentSkills(_preferences.settings?.default_agent_skills ?? []);
      setDisabledAgentSkills(
        _preferences.settings?.disabled_agent_skills ?? []
      );
      setActiveFlowIds(flows.filter((f) => f.active).map((f) => f.uuid));
      setAgentFlows(flows);
      setFileSystemAgentAvailable(fsAgentAvailable);
      setCreateFilesAgentAvailable(createFilesAvailable);
      setLoading(false);
    }
    fetchSettings();
  }, []);

  const toggleDefaultSkill = (skillName) => {
    setDisabledAgentSkills((prev) => {
      const updatedSkills = prev.includes(skillName)
        ? prev.filter((name) => name !== skillName)
        : [...prev, skillName];
      setHasChanges(true);
      return updatedSkills;
    });
  };

  const toggleAgentSkill = (skillName) => {
    setAgentSkills((prev) => {
      const updatedSkills = prev.includes(skillName)
        ? prev.filter((name) => name !== skillName)
        : [...prev, skillName];
      setHasChanges(true);
      return updatedSkills;
    });
  };

  const toggleSQLConnectorSkill = async (skillName) => {
    const updatedSkills = agentSkills.includes(skillName)
      ? agentSkills.filter((name) => name !== skillName)
      : [...agentSkills, skillName];
    const { success, error } = await Admin.updateSystemPreferences({
      default_agent_skills: updatedSkills.join(","),
    });

    if (!success) {
      showToast(error || t("sql-connector.connector-update-failed"), "error", {
        clear: true,
      });
      return false;
    }

    setAgentSkills(updatedSkills);
    showToast(t("sql-connector.connector-updated"), "success", {
      clear: true,
    });
    return true;
  };

  const toggleFlow = (flowId) => {
    setActiveFlowIds((prev) => {
      const updatedFlows = prev.includes(flowId)
        ? prev.filter((id) => id !== flowId)
        : [...prev, flowId];
      return updatedFlows;
    });
  };

  const toggleMCP = (serverName) => {
    setMcpServers((prev) => {
      return prev.map((server) => {
        if (server.name !== serverName) return server;
        return { ...server, running: !server.running };
      });
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = {
      workspace: {},
      system: {},
      env: {},
    };

    const form = new FormData(formEl.current);
    for (var [key, value] of form.entries()) {
      if (key.startsWith("system::")) {
        const [_, label] = key.split("system::");
        data.system[label] = String(value);
        continue;
      }

      if (key.startsWith("env::")) {
        const [_, label] = key.split("env::");
        data.env[label] = String(value);
        continue;
      }
      data.workspace[key] = castToType(key, value);
    }

    const { success } = await Admin.updateSystemPreferences(data.system);
    await System.updateSystem(data.env);

    if (success) {
      const _settings = await System.keys();
      const _preferences = await Admin.systemPreferencesByFields([
        "disabled_agent_skills",
        "default_agent_skills",
      ]);
      setSettings({ ..._settings, preferences: _preferences.settings } ?? {});
      setAgentSkills(_preferences.settings?.default_agent_skills ?? []);
      setDisabledAgentSkills(
        _preferences.settings?.disabled_agent_skills ?? []
      );
      showToast(t("agent-panel.preferences-saved"), "success", {
        clear: true,
      });
    } else {
      showToast(t("agent-panel.preferences-save-failed"), "error", {
        clear: true,
      });
    }

    setHasChanges(false);
  };

  let SelectedSkillComponent = null;
  if (selectedSkill === AGENT_SKILL_SETTINGS_KEY) {
    SelectedSkillComponent = AgentSkillSettings;
  } else if (selectedFlow) {
    SelectedSkillComponent = FlowPanel;
  } else if (selectedMcpServer) {
    SelectedSkillComponent = ServerPanel;
  } else if (configurableSkills[selectedSkill]) {
    SelectedSkillComponent = configurableSkills[selectedSkill]?.component;
  } else if (appIntegrationSkills[selectedSkill]) {
    SelectedSkillComponent = appIntegrationSkills[selectedSkill]?.component;
  } else {
    SelectedSkillComponent = defaultSkills[selectedSkill]?.component;
  }

  // Update the click handlers to clear the other selection
  const handleDefaultSkillClick = (skill) => {
    setSelectedFlow(null);
    setSelectedMcpServer(null);
    setSelectedSkill(skill);
    if (isMobile) setShowSkillModal(true);
  };

  const handleSkillClick = (skill) => {
    setSelectedFlow(null);
    setSelectedMcpServer(null);
    setSelectedSkill(skill);
    if (isMobile) setShowSkillModal(true);
  };

  const handleFlowClick = (flow) => {
    setSelectedSkill(null);
    setSelectedMcpServer(null);
    setSelectedFlow(flow);
    if (isMobile) setShowSkillModal(true);
  };

  const handleMCPClick = (server) => {
    setSelectedSkill(null);
    setSelectedFlow(null);
    setSelectedMcpServer(server);
    if (isMobile) setShowSkillModal(true);
  };

  const handleFlowDelete = (flowId) => {
    setSelectedFlow(null);
    setActiveFlowIds((prev) => prev.filter((id) => id !== flowId));
    setAgentFlows((prev) => prev.filter((flow) => flow.uuid !== flowId));
  };

  const handleMCPServerDelete = (serverName) => {
    setSelectedMcpServer(null);
    setMcpServers((prev) =>
      prev.filter((server) => server.name !== serverName)
    );
  };

  const handleMCPToolToggle = async (serverName, toolName, enabled) => {
    const { success, error, suppressedTools } = await MCPServers.toggleTool(
      serverName,
      toolName,
      enabled
    );

    if (!success) {
      showToast(error || t("agent-panel.toggle-tool-failed"), "error", {
        clear: true,
      });
      return;
    }

    setMcpServers((prev) =>
      prev.map((server) => {
        if (server.name !== serverName) return server;
        return {
          ...server,
          config: {
            ...server.config,
            nexusai: {
              ...server.config?.nexusai,
              suppressedTools,
            },
          },
        };
      })
    );

    setSelectedMcpServer((prev) => {
      if (!prev || prev.name !== serverName) return prev;
      return {
        ...prev,
        config: {
          ...prev.config,
          nexusai: {
            ...prev.config?.nexusai,
            suppressedTools,
          },
        },
      };
    });
  };

  if (loading) {
    return (
      <div
        style={{ height: "100%" }}
        className="relative w-full h-full flex justify-center items-center"
      >
        <FullScreenLoader />
      </div>
    );
  }

  if (isSqlConnectorRoute) {
    return (
      <SkillLayout showSaveBar={false}>
        <div className="thin-scrollbar flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-4 pt-20 min-[1100px]:overflow-hidden min-[1100px]:p-6">
          <header className="flex flex-none items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-sidebar-accent text-theme-text-primary">
              <Database size={21} />
            </span>
            <div className="min-w-0">
              <h1 className="text-xl font-semibold text-theme-text-primary">
                {t("sql-connector.title")}
              </h1>
              <p className="mt-0.5 text-sm text-theme-text-secondary">
                {t("sql-connector.page-description")}
              </p>
            </div>
          </header>

          <AgentSQLConnectorSelection
            skill="sql-agent"
            toggleSkill={toggleSQLConnectorSkill}
            enabled={agentSkills.includes("sql-agent")}
          />
        </div>
      </SkillLayout>
    );
  }

  if (isMobile) {
    return (
      <SkillLayout
        hasChanges={hasChanges}
        handleCancel={() => setHasChanges(false)}
        handleSubmit={handleSubmit}
      >
        <form
          onSubmit={handleSubmit}
          onChange={(e) => {
            if (IGNORE_CHANGE_SETTINGS.includes(e.target.name)) return;
            if (!selectedFlow) setHasChanges(true);
          }}
          ref={formEl}
          className="thin-scrollbar flex min-h-0 w-full flex-1 flex-col gap-5 overflow-x-hidden overflow-y-auto p-4 pb-8 pt-20"
        >
          <input
            name="system::default_agent_skills"
            type="hidden"
            value={agentSkills.join(",")}
          />
          <input
            name="system::disabled_agent_skills"
            type="hidden"
            value={disabledAgentSkills.join(",")}
          />
          <input
            type="hidden"
            name="system::active_agent_flows"
            id="active_agent_flows"
            value={activeFlowIds.join(",")}
          />

          {showSkillModal ? (
            <>
              <div className="flex w-fit">
                <button
                  type="button"
                  onClick={() => {
                    setShowSkillModal(false);
                    setSelectedSkill("");
                    setSelectedFlow(null);
                    setSelectedMcpServer(null);
                  }}
                  className="flex items-center gap-x-1 rounded-lg border border-theme-sidebar-border bg-card px-3 py-2 text-sm font-medium text-cta-button transition-colors hover:bg-theme-action-menu-bg"
                >
                  <ChevronLeft size={20} />
                  {t("agent-panel.back")}
                </button>
              </div>

              <div className="w-full overflow-x-visible rounded-xl bg-card p-4 text-theme-text-primary ring-1 ring-foreground/10">
                {selectedSkill === AGENT_SKILL_SETTINGS_KEY ? (
                  <AgentSkillSettings />
                ) : selectedMcpServer ? (
                  <ServerPanel
                    server={selectedMcpServer}
                    toggleServer={toggleMCP}
                    onDelete={handleMCPServerDelete}
                    onToggleTool={handleMCPToolToggle}
                  />
                ) : selectedFlow ? (
                  <FlowPanel
                    flow={selectedFlow}
                    toggleFlow={toggleFlow}
                    enabled={activeFlowIds.includes(selectedFlow.uuid)}
                    onDelete={handleFlowDelete}
                  />
                ) : defaultSkills?.[selectedSkill] ? (
                  <SelectedSkillComponent
                    skill={defaultSkills[selectedSkill]?.skill}
                    settings={settings}
                    toggleSkill={toggleDefaultSkill}
                    enabled={
                      !disabledAgentSkills.includes(
                        defaultSkills[selectedSkill]?.skill
                      )
                    }
                    setHasChanges={setHasChanges}
                    {...defaultSkills[selectedSkill]}
                  />
                ) : configurableSkills?.[selectedSkill] ? (
                  <SelectedSkillComponent
                    skill={configurableSkills[selectedSkill]?.skill}
                    settings={settings}
                    toggleSkill={toggleAgentSkill}
                    enabled={agentSkills.includes(
                      configurableSkills[selectedSkill]?.skill
                    )}
                    setHasChanges={setHasChanges}
                    hasChanges={hasChanges}
                    {...configurableSkills[selectedSkill]}
                  />
                ) : appIntegrationSkills?.[selectedSkill] ? (
                  <SelectedSkillComponent
                    skill={appIntegrationSkills[selectedSkill]?.skill}
                    settings={settings}
                    toggleSkill={toggleAgentSkill}
                    enabled={agentSkills.includes(
                      appIntegrationSkills[selectedSkill]?.skill
                    )}
                    setHasChanges={setHasChanges}
                    hasChanges={hasChanges}
                    {...appIntegrationSkills[selectedSkill]}
                  />
                ) : null}
              </div>
            </>
          ) : (
            <>
              <header className="flex flex-none items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-sidebar-accent text-theme-text-primary">
                  {isAgentFlowRoute ? (
                    <Workflow size={21} />
                  ) : (
                    <Bot size={21} />
                  )}
                </span>
                <div className="min-w-0">
                  <h1 className="text-xl font-semibold text-theme-text-primary">
                    {isAgentFlowRoute
                      ? t("agent-panel.agent-flow")
                      : t("agent-panel.page-skills-title")}
                  </h1>
                  <p className="mt-0.5 text-sm text-theme-text-secondary">
                    {isAgentFlowRoute
                      ? t("agent-panel.page-flow-description")
                      : t("agent-panel.page-skills-description")}
                  </p>
                </div>
              </header>

              <div className="w-full shrink-0 overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
                <div className="border-b border-theme-sidebar-border bg-sidebar-accent/40 px-4 py-4">
                  <h2 className="text-base font-semibold text-theme-text-primary">
                    {isAgentFlowRoute
                      ? t("agent-panel.agent-flow")
                      : t("agent-panel.skills-title")}
                  </h2>
                  <p className="mt-1 text-sm text-theme-text-secondary">
                    {isAgentFlowRoute
                      ? t("agent-panel.flows-description")
                      : t("agent-panel.skills-description")}
                  </p>
                </div>

                <div className="space-y-4 p-3">
                  {isAgentFlowRoute ? (
                    canManageFlows ? (
                      <>
                        <div className="flex items-center justify-between gap-x-2 text-theme-text-primary">
                          <div className="flex min-w-0 items-center gap-x-2">
                            <Workflow size={22} className="shrink-0" />
                            <p className="truncate text-base font-medium">
                              {t("agent-panel.agent-flows")}
                            </p>
                          </div>
                          <Link
                            to={paths.agents.builder()}
                            className="flex shrink-0 items-center gap-x-1 text-sm text-cta-button hover:underline"
                          >
                            <Plus size={16} />
                            {agentFlows.length === 0
                              ? t("agent-panel.create-flow")
                              : t("agent-panel.open-builder")}
                          </Link>
                        </div>
                        <AgentFlowsList
                          flows={agentFlows}
                          selectedFlow={selectedFlow}
                          handleClick={handleFlowClick}
                          activeFlowIds={activeFlowIds}
                        />
                      </>
                    ) : (
                      <p className="text-sm text-theme-text-secondary">
                        {t("agent-panel.flows-restricted")}
                      </p>
                    )
                  ) : (
                    <>
                      <AgentSettingsNavItem
                        selected={selectedSkill === AGENT_SKILL_SETTINGS_KEY}
                        onClick={() =>
                          handleSkillClick(AGENT_SKILL_SETTINGS_KEY)
                        }
                      />
                      <SkillList
                        skills={defaultSkills}
                        selectedSkill={selectedSkill}
                        handleClick={handleDefaultSkillClick}
                        activeSkills={Object.keys(defaultSkills).filter(
                          (skill) => !disabledAgentSkills.includes(skill)
                        )}
                      />
                      <SkillList
                        skills={configurableSkills}
                        selectedSkill={selectedSkill}
                        handleClick={handleDefaultSkillClick}
                        activeSkills={agentSkills}
                      />

                      {Object.keys(appIntegrationSkills).length > 0 && (
                        <>
                          <div className="mt-6 flex items-center gap-x-2 text-theme-text-primary">
                            <Package size={22} />
                            <p className="text-base font-medium">
                              {t("agent-panel.app-integrations")}
                            </p>
                          </div>
                          <SkillList
                            skills={appIntegrationSkills}
                            selectedSkill={selectedSkill}
                            handleClick={handleSkillClick}
                            activeSkills={agentSkills}
                          />
                        </>
                      )}

                      <MCPServerHeader
                        setMcpServers={setMcpServers}
                        setSelectedMcpServer={setSelectedMcpServer}
                      >
                        {({ loadingMcpServers }) => (
                          <MCPServersList
                            isLoading={loadingMcpServers}
                            servers={mcpServers}
                            selectedServer={selectedMcpServer}
                            handleClick={handleMCPClick}
                          />
                        )}
                      </MCPServerHeader>
                    </>
                  )}
                </div>
              </div>
            </>
          )}
        </form>
      </SkillLayout>
    );
  }

  return (
    <SkillLayout
      hasChanges={hasChanges}
      handleCancel={() => setHasChanges(false)}
      handleSubmit={handleSubmit}
    >
      <form
        onSubmit={handleSubmit}
        onChange={(e) => {
          if (IGNORE_CHANGE_SETTINGS.includes(e.target.name)) return;
          if (!selectedFlow) setHasChanges(true);
        }}
        ref={formEl}
        className="flex min-h-0 flex-1 flex-col gap-5 p-6"
      >
        <input
          name="system::default_agent_skills"
          type="hidden"
          value={agentSkills.join(",")}
        />
        <input
          name="system::disabled_agent_skills"
          type="hidden"
          value={disabledAgentSkills.join(",")}
        />
        <input
          type="hidden"
          name="system::active_agent_flows"
          id="active_agent_flows"
          value={activeFlowIds.join(",")}
        />

        <header className="flex flex-none items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-sidebar-accent text-theme-text-primary">
            {isAgentFlowRoute ? <Workflow size={21} /> : <Bot size={21} />}
          </span>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold text-theme-text-primary">
              {isAgentFlowRoute
                ? t("agent-panel.agent-flow")
                : t("agent-panel.page-skills-title")}
            </h1>
            <p className="mt-0.5 text-sm text-theme-text-secondary">
              {isAgentFlowRoute
                ? t("agent-panel.page-flow-description")
                : t("agent-panel.page-skills-description")}
            </p>
          </div>
        </header>

        <div className="flex min-h-0 flex-1 gap-6">
          {/* Skill settings nav - Make this section scrollable */}
          <div className="flex min-h-0 w-[400px] shrink-0 flex-col overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
            <div className="flex-none border-b border-theme-sidebar-border bg-sidebar-accent/40 px-5 py-4">
              <h2 className="text-base font-semibold text-theme-text-primary">
                {isAgentFlowRoute
                  ? t("agent-panel.agent-flow")
                  : t("agent-panel.skills-title")}
              </h2>
              <p className="mt-1 text-sm text-theme-text-secondary">
                {isAgentFlowRoute
                  ? t("agent-panel.flows-description")
                  : t("agent-panel.skills-description")}
              </p>
            </div>

            <div className="thin-scrollbar min-h-0 flex-1 overflow-y-auto p-3">
              <div className="space-y-4">
                {isAgentFlowRoute ? (
                  canManageFlows ? (
                    <>
                      <div className="text-theme-text-primary flex items-center justify-between gap-x-2">
                        <div className="flex items-center gap-x-2">
                          <Workflow size={24} />
                          <p className="text-lg font-medium">
                            {t("agent-panel.agent-flows")}
                          </p>
                        </div>
                        <Link
                          to={paths.agents.builder()}
                          className="flex items-center gap-x-1 text-cta-button hover:underline"
                        >
                          <Plus size={16} />
                          <p className="text-sm">
                            {agentFlows.length === 0
                              ? t("agent-panel.create-flow")
                              : t("agent-panel.open-builder")}
                          </p>
                        </Link>
                      </div>
                      <AgentFlowsList
                        flows={agentFlows}
                        selectedFlow={selectedFlow}
                        handleClick={handleFlowClick}
                        activeFlowIds={activeFlowIds}
                      />
                    </>
                  ) : (
                    <p className="text-sm text-theme-text-secondary">
                      {t("agent-panel.flows-restricted")}
                    </p>
                  )
                ) : (
                  <>
                    <AgentSettingsNavItem
                      selected={selectedSkill === AGENT_SKILL_SETTINGS_KEY}
                      onClick={() => handleSkillClick(AGENT_SKILL_SETTINGS_KEY)}
                    />
                    {/* Default skills list */}
                    <SkillList
                      skills={defaultSkills}
                      selectedSkill={selectedSkill}
                      handleClick={handleSkillClick}
                      activeSkills={Object.keys(defaultSkills).filter(
                        (skill) => !disabledAgentSkills.includes(skill)
                      )}
                    />
                    {/* Configurable skills */}
                    <SkillList
                      skills={configurableSkills}
                      selectedSkill={selectedSkill}
                      handleClick={handleSkillClick}
                      activeSkills={agentSkills}
                    />

                    {Object.keys(appIntegrationSkills).length > 0 && (
                      <>
                        <div className="text-theme-text-primary flex items-center gap-x-2 mt-6">
                          <Package size={24} />
                          <p className="text-lg font-medium">
                            {t("agent-panel.app-integrations")}
                          </p>
                        </div>
                        <SkillList
                          skills={appIntegrationSkills}
                          selectedSkill={selectedSkill}
                          handleClick={handleSkillClick}
                          activeSkills={agentSkills}
                        />
                      </>
                    )}

                    <MCPServerHeader
                      setMcpServers={setMcpServers}
                      setSelectedMcpServer={setSelectedMcpServer}
                    >
                      {({ loadingMcpServers }) => {
                        return (
                          <MCPServersList
                            isLoading={loadingMcpServers}
                            servers={mcpServers}
                            selectedServer={selectedMcpServer}
                            handleClick={handleMCPClick}
                          />
                        );
                      }}
                    </MCPServerHeader>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Selected agent skill setting panel */}
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="thin-scrollbar min-h-0 flex-1 overflow-y-auto overflow-x-visible rounded-xl bg-card ring-1 ring-foreground/10 p-5 text-theme-text-primary">
              {SelectedSkillComponent ? (
                <>
                  {selectedSkill === AGENT_SKILL_SETTINGS_KEY ? (
                    <AgentSkillSettings />
                  ) : selectedMcpServer ? (
                    <ServerPanel
                      server={selectedMcpServer}
                      toggleServer={toggleMCP}
                      onDelete={handleMCPServerDelete}
                      onToggleTool={handleMCPToolToggle}
                    />
                  ) : selectedFlow ? (
                    <FlowPanel
                      flow={selectedFlow}
                      toggleFlow={toggleFlow}
                      enabled={activeFlowIds.includes(selectedFlow.uuid)}
                      onDelete={handleFlowDelete}
                    />
                  ) : (
                    <>
                      {defaultSkills?.[selectedSkill] ? (
                        // The selected skill is a default skill - show the default skill panel
                        <SelectedSkillComponent
                          skill={defaultSkills[selectedSkill]?.skill}
                          settings={settings}
                          toggleSkill={toggleDefaultSkill}
                          enabled={
                            !disabledAgentSkills.includes(
                              defaultSkills[selectedSkill]?.skill
                            )
                          }
                          setHasChanges={setHasChanges}
                          {...defaultSkills[selectedSkill]}
                        />
                      ) : configurableSkills?.[selectedSkill] ? (
                        // The selected skill is a configurable skill - show the configurable skill panel
                        <SelectedSkillComponent
                          skill={configurableSkills[selectedSkill]?.skill}
                          settings={settings}
                          toggleSkill={toggleAgentSkill}
                          enabled={agentSkills.includes(
                            configurableSkills[selectedSkill]?.skill
                          )}
                          setHasChanges={setHasChanges}
                          hasChanges={hasChanges}
                          {...configurableSkills[selectedSkill]}
                        />
                      ) : (
                        // The selected skill is an app integration skill
                        <SelectedSkillComponent
                          skill={appIntegrationSkills[selectedSkill]?.skill}
                          settings={settings}
                          toggleSkill={toggleAgentSkill}
                          enabled={agentSkills.includes(
                            appIntegrationSkills[selectedSkill]?.skill
                          )}
                          setHasChanges={setHasChanges}
                          hasChanges={hasChanges}
                          {...appIntegrationSkills[selectedSkill]}
                        />
                      )}
                    </>
                  )}
                </>
              ) : (
                <div className="flex h-full min-h-64 flex-col items-center justify-center px-6 text-center text-theme-text-secondary">
                  <span className="mb-3 flex size-12 items-center justify-center rounded-xl bg-muted/40">
                    <Bot size={24} />
                  </span>
                  <h2 className="font-medium text-theme-text-primary">
                    {t("agent-panel.select-configure")}
                  </h2>
                  <p className="mt-1 max-w-sm text-sm">{t("help.agents")}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </form>
    </SkillLayout>
  );
}

function SkillLayout({
  children,
  hasChanges,
  handleSubmit,
  handleCancel,
  showSaveBar = true,
}) {
  return (
    <SplitLayout id="workspace-agent-settings-container">
      {children}
      {showSaveBar && (
        <ContextualSaveBar
          showing={hasChanges}
          onSave={handleSubmit}
          onCancel={handleCancel}
        />
      )}
    </SplitLayout>
  );
}

function SkillList({
  isDefault = false,
  skills = [],
  selectedSkill = null,
  handleClick = null,
  activeSkills = [],
  Icon = null,
}) {
  const { t } = useTranslation();
  if (skills.length === 0) return null;

  return (
    <>
      <div className="w-full rounded-xl bg-theme-bg-secondary text-theme-text-primary">
        {Object.entries(skills).map(([skill, settings], index) => (
          <div
            key={skill}
            className={`py-3 px-4 flex items-center justify-between ${
              index === 0 ? "rounded-t-xl" : ""
            } ${
              index === Object.keys(skills).length - 1
                ? "rounded-b-xl"
                : "border-b border-theme-sidebar-border"
            } cursor-pointer transition-all duration-300  hover:bg-theme-bg-primary ${
              selectedSkill === skill
                ? "bg-white/10 light:bg-theme-bg-sidebar"
                : ""
            }`}
            onClick={() => handleClick?.(skill)}
          >
            <div className="flex items-center gap-x-2">
              {settings.Icon ? (
                <settings.Icon size={16} />
              ) : (
                Icon && <Icon size={16} />
              )}
              <div className="text-sm font-light">{settings.title}</div>
            </div>
            <div className="flex items-center gap-x-2">
              {isDefault ? (
                <DefaultBadge title={skill} />
              ) : (
                <div className="text-sm text-theme-text-secondary font-medium">
                  {activeSkills.includes(skill)
                    ? t("agent-panel.on")
                    : t("agent-panel.off")}
                </div>
              )}
              <ChevronRight size={14} className="text-theme-text-secondary" />
            </div>
          </div>
        ))}
      </div>
      {/* Tooltip for default skills - only render when skill list is passed isDefault */}
    </>
  );
}

function AgentSettingsNavItem({ selected, onClick }) {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center justify-between rounded-xl bg-theme-bg-secondary px-4 py-3 text-left text-theme-text-primary transition-colors hover:bg-theme-bg-primary ${
        selected ? "bg-white/10 light:bg-theme-bg-sidebar" : ""
      }`}
    >
      <span className="flex min-w-0 items-center gap-x-2">
        <SlidersHorizontal size={16} className="shrink-0" />
        <span className="truncate text-sm font-light">
          {t("agent-panel.skill-settings")}
        </span>
      </span>
      <span className="flex items-center gap-x-2">
        <span className="text-sm font-medium text-theme-text-secondary">
          {t("agent-panel.configure")}
        </span>
        <ChevronRight size={14} className="text-theme-text-secondary" />
      </span>
    </button>
  );
}

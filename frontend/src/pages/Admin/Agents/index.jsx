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
  Hammer,
  Package,
  Plug,
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
import ImportedSkillList from "./Imported/SkillList";
import ImportedSkillConfig from "./Imported/ImportedSkillConfig";
import AgentFlowsList from "./AgentFlows";
import FlowPanel from "./AgentFlows/FlowPanel";
import { MCPServersList, MCPServerHeader } from "./MCPServers";
import ServerPanel from "./MCPServers/ServerPanel";
import { Link } from "react-router-dom";
import paths from "@/utils/paths";
import AgentFlows from "@/models/agentFlows";
import AgentSkillSettings from "./AgentSkillSettings";

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
  const formEl = useRef(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [settings, setSettings] = useState({});
  const [selectedSkill, setSelectedSkill] = useState("");
  const [loading, setLoading] = useState(true);
  const [showSkillModal, setShowSkillModal] = useState(false);

  const [agentSkills, setAgentSkills] = useState([]);
  const [importedSkills, setImportedSkills] = useState([]);
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
  const isSystemAdmin = userCan(PERMISSIONS.SYSTEM_ADMIN, userFromStorage());
  const filterSkillsByMode = ([_, skillConfig]) => {
    if (!skillConfig.mode) return true;
    if (skillConfig.mode.includes("adminOnly") && !isSystemAdmin) return false;
    return true;
  };
  const configurableSkills = Object.fromEntries(
    Object.entries(allConfigurableSkills).filter(filterSkillsByMode)
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
          "imported_agent_skills",
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
      setImportedSkills(_preferences.settings?.imported_agent_skills ?? []);
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
        "imported_agent_skills",
      ]);
      setSettings({ ..._settings, preferences: _preferences.settings } ?? {});
      setAgentSkills(_preferences.settings?.default_agent_skills ?? []);
      setDisabledAgentSkills(
        _preferences.settings?.disabled_agent_skills ?? []
      );
      setImportedSkills(_preferences.settings?.imported_agent_skills ?? []);
      showToast(`Agent preferences saved successfully.`, "success", {
        clear: true,
      });
    } else {
      showToast(`Agent preferences failed to save.`, "error", { clear: true });
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
  } else if (selectedSkill?.imported) {
    SelectedSkillComponent = ImportedSkillConfig;
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
      showToast(error || "Failed to toggle tool.", "error", { clear: true });
      return;
    }

    setMcpServers((prev) =>
      prev.map((server) => {
        if (server.name !== serverName) return server;
        return {
          ...server,
          config: {
            ...server.config,
            anythingllm: {
              ...server.config?.anythingllm,
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
          anythingllm: {
            ...prev.config?.anythingllm,
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
          className="flex w-full flex-col p-4 pt-20"
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

          {/* Skill settings nav */}
          <div
            hidden={showSkillModal}
            className="flex flex-col gap-y-[18px] overflow-y-scroll no-scroll"
          >
            <div className="text-theme-text-primary flex items-center gap-x-2">
              <Bot size={24} />
              <div>
                <p className="text-lg font-semibold">
                  Skills &amp; Integrations
                </p>
                <p className="text-xs text-theme-text-secondary">
                  Choose a capability to configure.
                </p>
              </div>
            </div>
            <AgentSettingsNavItem
              selected={selectedSkill === AGENT_SKILL_SETTINGS_KEY}
              onClick={() => handleSkillClick(AGENT_SKILL_SETTINGS_KEY)}
            />
            {/* Default skills */}
            <SkillList
              skills={defaultSkills}
              selectedSkill={selectedSkill}
              handleClick={handleDefaultSkillClick}
              activeSkills={Object.keys(defaultSkills).filter(
                (skill) => !disabledAgentSkills.includes(skill)
              )}
            />
            {/* Configurable skills */}
            <SkillList
              skills={configurableSkills}
              selectedSkill={selectedSkill}
              handleClick={handleDefaultSkillClick}
              activeSkills={agentSkills}
            />

            {Object.keys(appIntegrationSkills).length > 0 && (
              <>
                <div className="text-theme-text-primary flex items-center gap-x-2 mt-6">
                  <Package size={24} />
                  <p className="text-lg font-medium">App Integrations</p>
                </div>
                <SkillList
                  skills={appIntegrationSkills}
                  selectedSkill={selectedSkill}
                  handleClick={handleSkillClick}
                  activeSkills={agentSkills}
                />
              </>
            )}

            <div className="text-theme-text-primary flex items-center gap-x-2">
              <Plug size={24} />
              <p className="text-lg font-medium">Custom Skills</p>
            </div>
            <ImportedSkillList
              skills={importedSkills}
              selectedSkill={selectedSkill}
              handleClick={handleSkillClick}
            />

            <div className="text-theme-text-primary flex items-center gap-x-2 mt-6">
              <Workflow size={24} />
              <p className="text-lg font-medium">Agent Flows</p>
            </div>
            <AgentFlowsList
              flows={agentFlows}
              selectedFlow={selectedFlow}
              handleClick={handleFlowClick}
              activeFlowIds={activeFlowIds}
            />
            <input
              type="hidden"
              name="system::active_agent_flows"
              id="active_agent_flows"
              value={activeFlowIds.join(",")}
            />
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
          </div>

          {/* Selected agent skill modal */}
          {showSkillModal && (
            <div className="fixed top-0 left-0 z-30 h-full w-full bg-theme-bg-container">
              <div className="flex flex-col h-full">
                <div className="flex items-center p-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowSkillModal(false);
                      setSelectedSkill("");
                    }}
                    className="text-theme-text-secondary hover:text-white transition-colors duration-200"
                  >
                    <div className="flex items-center text-sky-400">
                      <ChevronLeft size={24} />
                      <div>Back</div>
                    </div>
                  </button>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto p-4">
                  <div className="thin-scrollbar h-full overflow-y-auto overflow-x-visible rounded-xl border border-theme-sidebar-border bg-theme-bg-secondary p-4 text-theme-text-primary">
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
                        ) : selectedSkill.imported ? (
                          <ImportedSkillConfig
                            key={selectedSkill.hubId}
                            selectedSkill={selectedSkill}
                            setImportedSkills={setImportedSkills}
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
                                skill={
                                  appIntegrationSkills[selectedSkill]?.skill
                                }
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
                      <div className="flex flex-col items-center justify-center h-full text-theme-text-secondary">
                        <Bot size={40} />
                        <p className="font-medium">
                          Select an Agent Skill, Agent Flow, or MCP Server
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
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
          if (!selectedSkill?.imported && !selectedFlow) setHasChanges(true);
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
            <Bot size={21} />
          </span>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold text-theme-text-primary">
              Agent skills
            </h1>
            <p className="mt-0.5 text-sm text-theme-text-secondary">
              Choose and configure the capabilities available to your agents.
            </p>
          </div>
        </header>

        <div className="flex min-h-0 flex-1 gap-6">
          {/* Skill settings nav - Make this section scrollable */}
          <div className="flex min-h-0 w-[400px] shrink-0 flex-col overflow-hidden rounded-xl border border-theme-sidebar-border bg-theme-bg-secondary shadow-sm">
            <div className="flex-none border-b border-theme-sidebar-border bg-sidebar-accent/40 px-5 py-4">
              <h2 className="text-base font-semibold text-theme-text-primary">
                Agent skills &amp; settings
              </h2>
              <p className="mt-1 text-sm text-theme-text-secondary">
                Browse skills, flows, and connected services.
              </p>
            </div>

            <div className="thin-scrollbar min-h-0 flex-1 overflow-y-auto p-3">
              <div className="space-y-4">
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
                      <p className="text-lg font-medium">App Integrations</p>
                    </div>
                    <SkillList
                      skills={appIntegrationSkills}
                      selectedSkill={selectedSkill}
                      handleClick={handleSkillClick}
                      activeSkills={agentSkills}
                    />
                  </>
                )}

                <div className="text-theme-text-primary flex items-center gap-x-2 mt-4">
                  <Plug size={24} />
                  <p className="text-lg font-medium">Custom Skills</p>
                </div>
                <ImportedSkillList
                  skills={importedSkills}
                  selectedSkill={selectedSkill}
                  handleClick={handleSkillClick}
                />

                <div className="text-theme-text-primary flex items-center justify-between gap-x-2 mt-4">
                  <div className="flex items-center gap-x-2">
                    <Workflow size={24} />
                    <p className="text-lg font-medium">Agent Flows</p>
                  </div>
                  {agentFlows.length === 0 ? (
                    <Link
                      to={paths.agents.builder()}
                      className="text-cta-button flex items-center gap-x-1 hover:underline"
                    >
                      <Hammer size={16} />
                      <p className="text-sm">Create Flow</p>
                    </Link>
                  ) : (
                    <Link
                      to={paths.agents.builder()}
                      className="text-theme-text-secondary hover:text-cta-button flex items-center gap-x-1"
                    >
                      <Hammer size={16} />
                      <p className="text-sm">Open Builder</p>
                    </Link>
                  )}
                </div>
                <AgentFlowsList
                  flows={agentFlows}
                  selectedFlow={selectedFlow}
                  handleClick={handleFlowClick}
                  activeFlowIds={activeFlowIds}
                />

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
              </div>
            </div>
          </div>

          {/* Selected agent skill setting panel */}
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="thin-scrollbar min-h-0 flex-1 overflow-y-auto overflow-x-visible rounded-xl border border-theme-sidebar-border bg-theme-bg-secondary p-5 text-theme-text-primary">
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
                  ) : selectedSkill.imported ? (
                    <ImportedSkillConfig
                      key={selectedSkill.hubId}
                      selectedSkill={selectedSkill}
                      setImportedSkills={setImportedSkills}
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
                    Select something to configure
                  </h2>
                  <p className="mt-1 max-w-sm text-sm">
                    Choose an agent skill, integration, flow, or MCP server from
                    the list.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </form>
    </SkillLayout>
  );
}

function SkillLayout({ children, hasChanges, handleSubmit, handleCancel }) {
  return (
    <SplitLayout id="workspace-agent-settings-container">
      {children}
      <ContextualSaveBar
        showing={hasChanges}
        onSave={handleSubmit}
        onCancel={handleCancel}
      />
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
                  {activeSkills.includes(skill) ? "On" : "Off"}
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
          Agent Skill Settings
        </span>
      </span>
      <span className="flex items-center gap-x-2">
        <span className="text-sm font-medium text-theme-text-secondary">
          Configure
        </span>
        <ChevronRight size={14} className="text-theme-text-secondary" />
      </span>
    </button>
  );
}

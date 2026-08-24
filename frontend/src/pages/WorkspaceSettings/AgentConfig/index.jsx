import System from "@/models/system";
import Workspace from "@/models/workspace";
import showToast from "@/utils/toast";
import { castToType } from "@/utils/types";
import { useCallback, useEffect, useRef, useState } from "react";
import AgentLLMSelection from "./AgentLLMSelection";
import Admin from "@/models/admin";
import { Skeleton } from "@/components/ui/skeleton";
import useUser from "@/hooks/useUser";
import AgentSkillSelection from "./AgentSkillSelection";
import {
  WORKSPACE_PERMISSIONS,
  workspaceCan,
  isSuperAdmin,
} from "@/utils/permissions";
import { Bot, ChevronRight, Cpu, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";

const CONFIG_SECTIONS = {
  MODEL: "model",
};

export default function WorkspaceAgentConfiguration({ workspace }) {
  const { user } = useUser();
  const [settings, setSettings] = useState({});
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedSection, setSelectedSection] = useState(null);
  const [skillNavigation, setSkillNavigation] = useState([]);
  const formEl = useRef(null);
  // This is a workspace screen, so it has to gate on the *workspace* permission
  // the API itself checks (`workspacePermissionValid([AGENTS_MANAGE])` on
  // /workspace/:slug/agent-skills). The instance-wide `agents.manage_skills`
  // belongs to /settings/agents — gating on it here hid the whole list from
  // workspace managers whose requests the server would have happily served.
  // Instance operators still pass: workspaceCan lets WORKSPACES_MANAGE_ALL
  // through everywhere, mirroring the server.
  const canManageSkills = workspaceCan(
    WORKSPACE_PERMISSIONS.AGENTS_MANAGE,
    workspace?.slug,
    user
  );
  const handleSkillNavigation = useCallback((items) => {
    setSkillNavigation(items);
  }, []);
  const handleSkillStatusChange = useCallback((key, enabled) => {
    setSkillNavigation((items) =>
      items.map((item) =>
        item.key === key || item.key.endsWith(`:${key}`)
          ? { ...item, status: enabled ? "On" : "Off" }
          : item
      )
    );
  }, []);

  useEffect(() => {
    async function fetchSettings() {
      const _settings = await System.keys();
      setSettings(_settings ?? {});
      setLoading(false);
    }
    fetchSettings();
  }, []);

  const handleUpdate = async (e) => {
    setSaving(true);
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

    const { workspace: updatedWorkspace, message } = await Workspace.update(
      workspace.slug,
      data.workspace
    );
    await Admin.updateSystemPreferences(data.system);
    await System.updateSystem(data.env);

    if (!!updatedWorkspace) {
      showToast("Workspace updated!", "success", { clear: true });
    } else {
      showToast(`Error: ${message}`, "error", { clear: true });
    }

    setSaving(false);
    setHasChanges(false);
  };

  if (!workspace || loading) return <LoadingSkeleton />;
  return (
    <div
      id="workspace-agent-settings-container"
      className="flex min-h-0 flex-col gap-5 min-[1100px]:h-[calc(100vh-48px)]"
    >
      <header className="flex flex-none items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-sidebar-accent text-theme-text-primary">
          <Bot size={21} />
        </span>
        <div className="min-w-0">
          <h1 className="text-xl font-semibold text-theme-text-primary">
            Agent configuration
          </h1>
          <p className="mt-0.5 text-sm text-theme-text-secondary">
            Configure the model and capabilities available to this workspace.
          </p>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-4 min-[1100px]:flex-row min-[1100px]:gap-6">
        {/* `overflow-hidden` keeps the rounded corners from being painted over,
            so the item list below has to do the scrolling itself — the list
            grows with every skill, flow and MCP server the instance has. */}
        <nav className="flex min-h-0 w-full shrink-0 flex-col overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10 min-[1100px]:w-[400px]">
          <div className="flex-none border-b border-theme-sidebar-border bg-sidebar-accent/40 px-5 py-4">
            <h2 className="text-base font-semibold text-theme-text-primary">
              Agent skills &amp; settings
            </h2>
            <p className="mt-1 text-sm text-theme-text-secondary">
              Choose an item to configure.
            </p>
          </div>
          <div className="thin-scrollbar min-h-0 flex-1 overflow-y-auto p-3">
            {/* #TEMPORARILY_HIDDEN: Model & provider is limited to super admins. */}
            <div hidden={!isSuperAdmin()}>
              <ConfigNavItem
                icon={Cpu}
                title="Model & provider"
                selected={selectedSection === CONFIG_SECTIONS.MODEL}
                onClick={() => setSelectedSection(CONFIG_SECTIONS.MODEL)}
              />
            </div>
            {canManageSkills && (
              <>
                {skillNavigation.map((item, index) => (
                  <div key={item.key}>
                    {(index === 0 ||
                      skillNavigation[index - 1]?.category !==
                        item.category) && (
                      <p className="px-4 pb-1 pt-4 text-[10px] font-semibold uppercase tracking-wider text-theme-text-secondary">
                        {item.category}
                      </p>
                    )}
                    {item.empty ? (
                      // A category with nothing to configure still shows its
                      // heading, with this row explaining why it is empty.
                      // Not a button: there is nothing to open.
                      <p className="px-4 py-3 text-sm font-light text-theme-text-secondary/70">
                        {item.title}
                      </p>
                    ) : (
                      <ConfigNavItem
                        icon={item.icon ?? SlidersHorizontal}
                        title={item.title}
                        status={item.status}
                        selected={selectedSection === item.key}
                        onClick={() => setSelectedSection(item.key)}
                      />
                    )}
                  </div>
                ))}
              </>
            )}
          </div>
        </nav>

        <section
          hidden={!selectedSection}
          className="thin-scrollbar min-h-[360px] min-w-0 flex-1 overflow-y-auto rounded-xl bg-card ring-1 ring-foreground/10 p-5 text-theme-text-primary"
        >
          {/* #TEMPORARILY_HIDDEN: Model & provider is limited to super admins. Anyone
              else cannot reach it anyway - the nav item that selects it is hidden too. */}
          <div hidden={!isSuperAdmin()}>
            <div className="mb-5">
              <h2 className="text-base font-semibold text-theme-text-primary">
                Model &amp; provider
              </h2>
              <p className="mt-1 text-sm text-theme-text-secondary">
                Select the provider and model used by this workspace's agent.
              </p>
            </div>
            <form
              ref={formEl}
              onSubmit={handleUpdate}
              onChange={() => setHasChanges(true)}
              id="agent-settings-form"
              className="flex max-w-[720px] flex-col gap-y-6"
            >
              <AgentLLMSelection
                settings={settings}
                workspace={workspace}
                setHasChanges={setHasChanges}
              />
              {hasChanges && (
                <Button
                  type="submit"
                  size="lg"
                  form="agent-settings-form"
                  className="w-fit"
                >
                  {saving ? "Updating agent..." : "Update workspace agent"}
                </Button>
              )}
            </form>
          </div>

          {/* Kept outside the provider/model form: skills save through their
              own endpoint, so their toggles do not mark the model form dirty. */}
          {canManageSkills && (
            <div hidden={selectedSection === CONFIG_SECTIONS.MODEL}>
              <AgentSkillSelection
                workspace={workspace}
                focusSkillId={selectedSection}
                onNavigationChange={handleSkillNavigation}
                onItemStatusChange={handleSkillStatusChange}
              />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function ConfigNavItem({
  icon: Icon,
  title,
  status = "Configure",
  selected,
  onClick,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-left text-theme-text-primary transition-colors hover:bg-theme-bg-primary ${
        selected ? "bg-white/10 light:bg-theme-bg-sidebar" : ""
      }`}
    >
      <span className="flex min-w-0 items-center gap-x-2">
        <Icon size={16} className="shrink-0" />
        <span className="truncate text-sm font-light">{title}</span>
      </span>
      <span className="flex items-center gap-x-2">
        <span className="text-sm font-medium text-theme-text-secondary">
          {status}
        </span>
        <ChevronRight size={14} className="text-theme-text-secondary" />
      </span>
    </button>
  );
}

function LoadingSkeleton() {
  return (
    <div
      id="workspace-agent-settings-container"
      className="flex flex-col gap-5"
    >
      <Skeleton
        height={56}
        width="100%"
        count={1}
        highlightColor="var(--theme-bg-primary)"
        baseColor="var(--theme-bg-secondary)"
      />
      <div className="flex flex-col gap-4 min-[1100px]:flex-row min-[1100px]:gap-6">
        <Skeleton
          height={320}
          width={400}
          count={1}
          highlightColor="var(--theme-bg-primary)"
          baseColor="var(--theme-bg-secondary)"
          enableAnimation={true}
          containerClassName="w-full min-[1100px]:w-[400px]"
        />
        <Skeleton
          height={480}
          width="100%"
          count={1}
          highlightColor="var(--theme-bg-primary)"
          baseColor="var(--theme-bg-secondary)"
          enableAnimation={true}
          containerClassName="min-w-0 flex-1"
        />
      </div>
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import SettingsLayout from "@/components/layout/SettingsLayout";
import PageHeader from "@/components/layout/PageHeader";
import Admin from "@/models/admin";
import System from "@/models/system";
import { WorkspaceRole } from "@/models/role";
import showToast from "@/utils/toast";
import { castToType } from "@/utils/types";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FullScreenLoader } from "@/components/Preloader";
import Provisioning from "./Provisioning";
import ChatDefaults from "./ChatDefaults";
import VectorDefaults from "./VectorDefaults";
import AgentDefaults from "./AgentDefaults";
import ReconcileDialog from "./ReconcileDialog";

const TABS = {
  PROVISIONING: "provisioning",
  CHAT: "chat",
  VECTOR: "vector",
  AGENT: "agent",
};

/**
 * The one place private workspaces are configured.
 *
 * A private workspace has no settings screens of its own - that is what makes it
 * private rather than merely unshared - so everything an ordinary workspace's owner
 * would set inside it is set here instead, once, for all of them. The screens below are
 * deliberately the same components a workspace's own settings use, minus their
 * navigation, so the two never drift into looking like different products.
 *
 * The master switch lives on the tab row: until it is on there is nothing to configure,
 * so the Provisioning / Chat / Vector / Agent tabs stay hidden.
 *
 * Shared workspaces are absent on purpose: they are configured where they always were,
 * on the instance settings pages and then in each workspace's own screens.
 */
export default function PrivateWorkspaces() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [systemSettings, setSystemSettings] = useState({});
  const [workspaceRoles, setWorkspaceRoles] = useState([]);
  const [review, setReview] = useState(null);
  const [toggling, setToggling] = useState(false);
  const [activeTab, setActiveTab] = useState(TABS.PROVISIONING);

  async function refresh() {
    const [{ profile, stats }, keys, { roles }] = await Promise.all([
      Admin.privateWorkspaceProfile(),
      System.keys(),
      WorkspaceRole.all(),
    ]);
    setProfile(profile);
    setStats(stats);
    setSystemSettings(keys ?? {});
    setWorkspaceRoles(roles ?? []);
    setLoading(false);
  }

  useEffect(() => {
    refresh();
  }, []);

  /**
   * Saving can come back asking for a decision instead of saving: turning the feature
   * off or lowering the quota leaves private workspaces outside the policy, and what
   * happens to those is the operator's call, never a side effect of a save.
   */
  async function save(updates) {
    const result = await Admin.updatePrivateWorkspaceProfile(updates);
    if (result?.requiresReview) {
      setReview(result);
      return false;
    }
    if (!result?.success) {
      showToast(result?.error ?? "Could not save", "error", { clear: true });
      return false;
    }
    showToast("Saved", "success", { clear: true });
    await refresh();
    return true;
  }

  async function toggleEnabled(enabled) {
    setToggling(true);
    const ok = await save({ enabled });
    if (ok && enabled) setActiveTab(TABS.PROVISIONING);
    setToggling(false);
  }

  /**
   * The profile expressed as a workspace, so the workspace settings components can
   * render it unchanged. Their inputs are named after workspace columns, which is
   * exactly what the profile stores.
   */
  const asWorkspace = useMemo(() => {
    if (!profile) return null;
    return {
      ...profile.workspace,
      // Nothing here belongs to one workspace, so there is no slug to give. Components
      // that would use it are switched off rather than pointed at a workspace that does
      // not exist.
      slug: null,
      name: "Private workspaces",
      vectorDB: systemSettings?.VectorDB,
    };
  }, [profile, systemSettings]);

  if (loading) return <FullScreenLoader />;

  const enabled = Boolean(profile?.enabled);

  return (
    <SettingsLayout>
      <PageHeader
        title="Private workspaces"
        description="The private workspace each person gets, and what it is created with. These screens are the settings a private workspace has no way to open for itself."
      />

      <div className="p-4 flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
          <div className="flex min-w-0 flex-1 items-center justify-between gap-4 rounded-lg border border-border px-4 py-3 sm:max-w-xl">
            <div className="min-w-0">
              <Label>Give every user a private workspace</Label>
              <p className="text-xs text-muted-foreground">
                Created the first time they load their workspaces, which covers
                accounts that already exist as well as new ones.
              </p>
            </div>
            <Switch
              checked={enabled}
              disabled={toggling}
              onCheckedChange={toggleEnabled}
            />
          </div>
        </div>

        {enabled ? (
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="min-h-0"
          >
            <TabsList>
              <TabsTrigger value={TABS.PROVISIONING}>Provisioning</TabsTrigger>
              <TabsTrigger value={TABS.CHAT}>Chat settings</TabsTrigger>
              <TabsTrigger value={TABS.VECTOR}>Vector database</TabsTrigger>
              <TabsTrigger value={TABS.AGENT}>Agent configuration</TabsTrigger>
            </TabsList>

            <TabsContent value={TABS.PROVISIONING} className="pt-6">
              <Provisioning
                profile={profile}
                stats={stats}
                workspaceRoles={workspaceRoles}
                onSave={save}
              />
            </TabsContent>
            <TabsContent value={TABS.CHAT} className="pt-6">
              <ChatDefaults
                workspace={asWorkspace}
                settings={systemSettings}
                onSave={(fields) => save({ workspace: fields })}
              />
            </TabsContent>
            <TabsContent value={TABS.VECTOR} className="pt-6">
              <VectorDefaults
                workspace={asWorkspace}
                onSave={(fields) => save({ workspace: fields })}
              />
            </TabsContent>
            <TabsContent value={TABS.AGENT} className="pt-6">
              <AgentDefaults
                workspace={asWorkspace}
                settings={systemSettings}
              />
            </TabsContent>
          </Tabs>
        ) : (
          <p className="text-sm text-muted-foreground">
            Turn this on to configure how private workspaces are handed out and
            what each one is created with.
          </p>
        )}
      </div>

      {review && (
        <ReconcileDialog
          review={review}
          onClose={() => setReview(null)}
          onResolved={async () => {
            setReview(null);
            await refresh();
          }}
        />
      )}
    </SettingsLayout>
  );
}

/**
 * Collect a settings form the way the workspace screens do: inputs named after
 * workspace columns, cast on the way out.
 * @param {HTMLFormElement} form
 * @returns {object}
 */
export function collectFields(form) {
  const data = {};
  for (const [key, value] of new FormData(form).entries())
    data[key] = castToType(key, value);
  return data;
}

/** The save bar the workspace settings screens show once something changes. */
export function SaveBar({ hasChanges, saving }) {
  if (!hasChanges) return null;
  return (
    <div className="absolute right-0 top-0">
      <Button size="lg" type="submit">
        {saving ? "Saving..." : "Save defaults"}
      </Button>
    </div>
  );
}

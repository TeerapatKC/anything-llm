import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import SettingsLayout from "@/components/layout/SettingsLayout";
import PageHeader from "@/components/layout/PageHeader";
import Admin from "@/models/admin";
import { WorkspaceRole } from "@/models/role";
import showToast from "@/utils/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getDefaultSkills,
  getConfigurableSkills,
} from "@/pages/Admin/Agents/skills";
import ReconcileDialog from "./ReconcileDialog";

const TYPES = { SHARED: "shared", PERSONAL: "personal" };

/** Sentinel for a select whose "unset" value has to be a non-empty string. */
const INHERIT = "__inherit__";

const CHAT_MODES = [
  { value: "automatic", label: "Automatic" },
  { value: "chat", label: "Chat" },
  { value: "query", label: "Query" },
];

/**
 * Instance defaults for each kind of workspace.
 *
 * Both tabs carry the same fields deliberately: private and shared workspaces should
 * differ in the values an operator gives them, not in which settings exist. Everything
 * left blank keeps following the instance-wide settings pages, so a fresh instance
 * behaves as it always did until somebody fills something in.
 */
export default function WorkspaceDefaults() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState(null);
  const [personalStats, setPersonalStats] = useState(null);
  const [workspaceRoles, setWorkspaceRoles] = useState([]);
  const [review, setReview] = useState(null);

  async function refresh() {
    const [{ profiles, personal }, { roles }] = await Promise.all([
      Admin.workspaceDefaults(),
      WorkspaceRole.all(),
    ]);
    setProfiles(profiles);
    setPersonalStats(personal);
    setWorkspaceRoles(roles ?? []);
    setLoading(false);
  }

  useEffect(() => {
    refresh();
  }, []);

  /**
   * Saving the private profile can come back asking for a decision instead of saving:
   * a lowered quota or a switched-off feature leaves private workspaces outside the
   * policy, and what happens to those is the operator's call, never a side effect.
   */
  async function save(type, updates) {
    const result = await Admin.updateWorkspaceDefaults(type, updates);
    if (result?.requiresReview) return setReview({ ...result, updates });
    if (!result?.success)
      return showToast(result?.error ?? "Could not save", "error");
    showToast("Saved", "success");
    await refresh();
  }

  return (
    <SettingsLayout>
      <PageHeader
        title="Workspace defaults"
        description="What a new workspace starts with, and how private workspaces are handed out. Anything left blank follows the instance-wide settings."
      />
      {loading ? (
        <p className="p-4 text-sm text-muted-foreground">Loading…</p>
      ) : (
        <Tabs defaultValue={TYPES.SHARED} className="p-4">
          <TabsList>
            <TabsTrigger value={TYPES.SHARED}>Shared workspaces</TabsTrigger>
            <TabsTrigger value={TYPES.PERSONAL}>Private workspaces</TabsTrigger>
          </TabsList>
          <TabsContent value={TYPES.SHARED}>
            <ProfileForm
              t={t}
              type={TYPES.SHARED}
              profile={profiles?.shared}
              onSave={save}
            />
          </TabsContent>
          <TabsContent value={TYPES.PERSONAL}>
            <ProfileForm
              t={t}
              type={TYPES.PERSONAL}
              profile={profiles?.personal}
              workspaceRoles={workspaceRoles}
              stats={personalStats}
              onSave={save}
            />
          </TabsContent>
        </Tabs>
      )}

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

function ProfileForm({
  t,
  type,
  profile,
  workspaceRoles = [],
  stats = null,
  onSave,
}) {
  const isPersonal = type === TYPES.PERSONAL;
  const [form, setForm] = useState(() => structuredClone(profile));
  const [saving, setSaving] = useState(false);

  useEffect(() => setForm(structuredClone(profile)), [profile]);
  if (!form) return null;

  const setWorkspaceField = (field, value) =>
    setForm((prev) => ({
      ...prev,
      workspace: { ...prev.workspace, [field]: value },
    }));

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    await onSave(type, form);
    setSaving(false);
  }

  return (
    <form onSubmit={submit} className="flex max-w-3xl flex-col gap-y-8 py-6">
      {isPersonal && (
        <section className="flex flex-col gap-y-4">
          <SectionHeader
            title="Provisioning"
            description="Whether everyone gets a private workspace of their own, and how many they may have."
          />
          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <div>
              <Label>Give every user a private workspace</Label>
              <p className="text-xs text-muted-foreground">
                Created the first time they load their workspaces, including for
                accounts that already exist.
              </p>
            </div>
            <Switch
              checked={form.enabled}
              onCheckedChange={(enabled) =>
                setForm((prev) => ({ ...prev, enabled }))
              }
            />
          </div>

          <Field
            label="Private workspaces per user"
            hint="Zero stops anyone creating a new one without touching what already exists."
          >
            <Input
              type="number"
              min={0}
              max={100}
              value={form.quotaPerUser}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, quotaPerUser: e.target.value }))
              }
            />
          </Field>

          <Field
            label="Name template"
            hint="{username}, {email} and {name} are replaced when the workspace is created."
          >
            <Input
              value={form.nameTemplate}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, nameTemplate: e.target.value }))
              }
            />
          </Field>

          <Field
            label="What the owner may do inside it"
            hint="The workspace role given to each private workspace's owner. Edit the role itself to change whether they may upload documents. No role here grants access to the workspace settings screens."
          >
            <Select
              value={form.ownerRoleId ? String(form.ownerRoleId) : INHERIT}
              onValueChange={(value) =>
                setForm((prev) => ({
                  ...prev,
                  ownerRoleId: value === INHERIT ? null : Number(value),
                }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={INHERIT}>
                  Private Workspace Owner (default)
                </SelectItem>
                {workspaceRoles
                  .filter((role) => !role.workspace_id)
                  .map((role) => (
                    <SelectItem key={role.id} value={String(role.id)}>
                      {role.displayName}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </Field>

          {stats && (
            <p className="text-xs text-muted-foreground">
              {stats.workspaceCount} private workspace(s) across{" "}
              {stats.ownerCount} user(s) right now.
            </p>
          )}
        </section>
      )}

      <section className="flex flex-col gap-y-4">
        <SectionHeader
          title="Chat defaults"
          description={`What a new ${isPersonal ? "private" : "shared"} workspace starts with. Blank means it follows the instance-wide setting.`}
        />
        <Field label="System prompt">
          <Textarea
            rows={5}
            value={form.workspace.openAiPrompt ?? ""}
            placeholder="Follows the instance default system prompt"
            onChange={(e) =>
              setWorkspaceField("openAiPrompt", e.target.value || null)
            }
          />
        </Field>
        <Field label="Chat mode">
          <Select
            value={form.workspace.chatMode ?? INHERIT}
            onValueChange={(value) =>
              setWorkspaceField("chatMode", value === INHERIT ? null : value)
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={INHERIT}>Instance default</SelectItem>
              {CHAT_MODES.map((mode) => (
                <SelectItem key={mode.value} value={mode.value}>
                  {mode.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <NumberField
            label="Message history"
            value={form.workspace.openAiHistory}
            onChange={(value) => setWorkspaceField("openAiHistory", value)}
          />
          <NumberField
            label="Temperature"
            step="0.1"
            value={form.workspace.openAiTemp}
            onChange={(value) => setWorkspaceField("openAiTemp", value)}
          />
          <NumberField
            label="Similarity threshold"
            step="0.05"
            value={form.workspace.similarityThreshold}
            onChange={(value) =>
              setWorkspaceField("similarityThreshold", value)
            }
          />
          <NumberField
            label="Snippets per answer"
            value={form.workspace.topN}
            onChange={(value) => setWorkspaceField("topN", value)}
          />
        </div>
      </section>

      <AgentSkillsSection
        t={t}
        isPersonal={isPersonal}
        config={form.agentSkillConfig}
        onChange={(agentSkillConfig) =>
          setForm((prev) => ({ ...prev, agentSkillConfig }))
        }
      />

      <div>
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>
    </form>
  );
}

/**
 * Which agent skills workspaces of this kind get.
 *
 * Off by default, meaning these workspaces keep following the instance-wide agent
 * settings page. Switching it on stores a selection on the profile itself, which every
 * workspace of this kind then resolves against - including ones created earlier, so
 * changing your mind later reaches all of them.
 */
function AgentSkillsSection({ t, isPersonal, config, onChange }) {
  const defaultSkills = getDefaultSkills(t);
  const configurableSkills = getConfigurableSkills(t);
  const configured = config !== null && config !== undefined;

  function toggle(list, skill, enabled) {
    const current = new Set(config?.[list] ?? []);
    enabled ? current.add(skill) : current.delete(skill);
    onChange({ ...config, [list]: [...current] });
  }

  return (
    <section className="flex flex-col gap-y-4">
      <SectionHeader
        title="Agent skills"
        description={`What the agent may do inside ${isPersonal ? "private" : "shared"} workspaces.`}
      />
      <div className="flex items-center justify-between rounded-lg border border-border p-4">
        <div>
          <Label>Set these separately</Label>
          <p className="text-xs text-muted-foreground">
            Off means these workspaces follow the instance-wide agent settings.
          </p>
        </div>
        <Switch
          checked={configured}
          onCheckedChange={(on) =>
            onChange(
              on
                ? {
                    activeDefaultSkills: Object.keys(defaultSkills),
                    activeSkills: [],
                  }
                : null
            )
          }
        />
      </div>

      {configured && (
        <div className="flex flex-col gap-y-2 rounded-lg border border-border p-4">
          {Object.values(defaultSkills).map((skill) => (
            <SkillToggle
              key={skill.skill}
              skill={skill}
              checked={(config.activeDefaultSkills ?? []).includes(skill.skill)}
              onChange={(enabled) =>
                toggle("activeDefaultSkills", skill.skill, enabled)
              }
            />
          ))}
          {Object.values(configurableSkills).map((skill) => (
            <SkillToggle
              key={skill.skill}
              skill={skill}
              checked={(config.activeSkills ?? []).includes(skill.skill)}
              onChange={(enabled) =>
                toggle("activeSkills", skill.skill, enabled)
              }
            />
          ))}
        </div>
      )}
    </section>
  );
}

function SkillToggle({ skill, checked, onChange }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-md p-2 hover:bg-muted/50">
      <Checkbox checked={checked} onCheckedChange={onChange} />
      <span>
        <span className="block text-sm font-medium">{skill.title}</span>
        <span className="block text-xs text-muted-foreground">
          {skill.description}
        </span>
      </span>
    </label>
  );
}

function SectionHeader({ title, description }) {
  return (
    <div>
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <div className="flex flex-col gap-y-1.5">
      <Label>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function NumberField({ label, value, onChange, step = "1" }) {
  return (
    <Field label={label}>
      <Input
        type="number"
        step={step}
        value={value ?? ""}
        placeholder="Instance default"
        onChange={(e) =>
          onChange(e.target.value === "" ? null : e.target.value)
        }
      />
    </Field>
  );
}

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/** The select's "not chosen" value has to be a non-empty string. */
const DEFAULT_ROLE = "__default__";
const DEFAULT_ROLE_LABEL = "Private Workspace Owner (default)";

/**
 * How private workspaces are handed out: to whom, how many, called what, and with what
 * the owner may do inside their own.
 *
 * The last of those is a workspace role rather than a set of checkboxes on purpose - it
 * is the same role machinery every other membership uses, so an operator can see and
 * edit it beside the others rather than learning a second permission system that exists
 * only here.
 */
export default function Provisioning({
  profile,
  stats,
  workspaceRoles = [],
  onSave,
}) {
  const [form, setForm] = useState(() => structuredClone(profile));
  const [saving, setSaving] = useState(false);

  useEffect(() => setForm(structuredClone(profile)), [profile]);
  if (!form) return null;

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    await onSave({
      enabled: form.enabled,
      quotaPerUser: form.quotaPerUser,
      nameTemplate: form.nameTemplate,
      ownerRoleId: form.ownerRoleId,
    });
    setSaving(false);
  }

  return (
    <form onSubmit={submit} className="flex max-w-2xl flex-col gap-y-6">
      <div className="flex items-center justify-between rounded-lg border border-border p-4">
        <div>
          <Label>Give every user a private workspace</Label>
          <p className="text-xs text-muted-foreground">
            Created the first time they load their workspaces, which covers
            accounts that already exist as well as new ones.
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
        hint="{username}, {email} and {name} are replaced when the workspace is created. Owners can rename it afterwards."
      >
        <Input
          value={form.nameTemplate}
          maxLength={255}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, nameTemplate: e.target.value }))
          }
        />
      </Field>

      <Field
        label="What the owner may do inside it"
        hint="The workspace role each owner is given. Edit the role itself to decide whether they may upload documents. No role opens the workspace settings screens - a private workspace has none."
      >
        <Select
          value={form.ownerRoleId ? String(form.ownerRoleId) : DEFAULT_ROLE}
          onValueChange={(value) =>
            setForm((prev) => ({
              ...prev,
              ownerRoleId: value === DEFAULT_ROLE ? null : Number(value),
            }))
          }
        >
          <SelectTrigger>
            {/* Base UI renders the raw value unless the label is resolved here - the
                popup that knows the labels has not mounted yet on first paint. */}
            <SelectValue>
              {(value) =>
                value === DEFAULT_ROLE
                  ? DEFAULT_ROLE_LABEL
                  : (workspaceRoles.find(
                      (role) => String(role.id) === String(value)
                    )?.displayName ?? value)
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={DEFAULT_ROLE} label={DEFAULT_ROLE_LABEL}>
              {DEFAULT_ROLE_LABEL}
            </SelectItem>
            {workspaceRoles
              .filter((role) => !role.workspace_id)
              .map((role) => (
                <SelectItem
                  key={role.id}
                  value={String(role.id)}
                  label={role.displayName}
                >
                  {role.displayName}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </Field>

      {stats && (
        <p className="text-xs text-muted-foreground">
          {stats.workspaceCount} private workspace(s) across {stats.ownerCount}{" "}
          user(s) right now.
        </p>
      )}

      <div>
        <Button type="submit" disabled={saving}>
          {saving ? "Saving..." : "Save"}
        </Button>
      </div>
    </form>
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

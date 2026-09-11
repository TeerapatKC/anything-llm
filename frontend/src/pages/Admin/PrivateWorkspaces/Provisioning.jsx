import { useEffect, useState } from "react";
import Highlighter from "react-highlight-words";
import SystemPromptVariable from "@/models/systemPromptVariable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
const LEGACY_NAME_VARIABLES = ["username", "email", "name"];

/**
 * How private workspaces are handed out: how many, called what, and with what the
 * owner may do inside their own.
 *
 * Whether the feature is on at all is decided above the tabs - this screen only
 * configures what happens once it is. The owner role is a workspace role rather than
 * a set of checkboxes on purpose: it is the same role machinery every other membership
 * uses, so an operator can see and edit it beside the others rather than learning a
 * second permission system that exists only here.
 */
export default function Provisioning({
  profile,
  stats,
  workspaceRoles = [],
  onSave,
}) {
  const [form, setForm] = useState(() => structuredClone(profile));
  const [saving, setSaving] = useState(false);
  const [availableVariables, setAvailableVariables] = useState(
    LEGACY_NAME_VARIABLES
  );

  useEffect(() => setForm(structuredClone(profile)), [profile]);
  useEffect(() => {
    let cancelled = false;

    async function loadVariables() {
      const { variables = [] } = await SystemPromptVariable.getAll();
      if (cancelled) return;
      setAvailableVariables([
        ...new Set([
          ...LEGACY_NAME_VARIABLES,
          ...variables
            .filter((variable) => variable.type !== "workspace")
            .map((variable) => variable.key),
        ]),
      ]);
    }

    loadVariables();
    return () => {
      cancelled = true;
    };
  }, []);
  if (!form) return null;

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    await onSave({
      quotaPerUser: form.quotaPerUser,
      nameTemplate: form.nameTemplate,
      ownerRoleId: form.ownerRoleId,
    });
    setSaving(false);
  }

  return (
    <form onSubmit={submit} className="flex max-w-2xl flex-col gap-y-6">
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
        hint="Variables from System Prompt Variables are replaced when the workspace is created. Workspace variables are excluded because the workspace does not exist yet."
      >
        <TemplateInput
          value={form.nameTemplate}
          variables={availableVariables}
          onChange={(nameTemplate) =>
            setForm((prev) => ({ ...prev, nameTemplate }))
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

/**
 * Mirrors the read-mode treatment used by the system-prompt editor, so template
 * variables remain easy to scan without sacrificing a normal text input when
 * the operator needs to edit the value.
 */
function TemplateInput({ value, variables, onChange }) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <Input
        autoFocus
        value={value}
        maxLength={255}
        onBlur={() => setEditing(false)}
        onChange={(event) => onChange(event.target.value)}
      />
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => setEditing(true)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          setEditing(true);
        }
      }}
      className="flex min-h-9 w-full cursor-text items-center rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] hover:bg-accent/30 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      <Highlighter
        className="min-w-0 truncate whitespace-pre"
        highlightClassName="rounded-md bg-cta-button p-0.5"
        searchWords={variables.map((variable) => `{${variable}}`)}
        autoEscape={true}
        caseSensitive={true}
        textToHighlight={value || ""}
      />
    </div>
  );
}

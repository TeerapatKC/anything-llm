import { useMemo, useState } from "react";
import Role, { WorkspaceRole } from "@/models/role";
import { PERMISSIONS } from "@/utils/permissions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DialogClose,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

/** Turns "Content Editor" into "content-editor" so operators do not have to. */
function slugify(value = "") {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
}

/**
 * Create or edit a role and tick the permissions it grants. The same editor serves both
 * scopes - only the API it saves to and the half of the catalog it shows differ.
 * @param {{role: Object, scope: "system"|"workspace", categories: Array, onClose: Function, onSaved: Function}} props
 */
export default function RoleModal({
  role,
  scope = "system",
  workspaceSlug = null,
  categories,
  onClose,
  onSaved,
}) {
  const api = scope === "workspace" ? WorkspaceRole : Role;
  // When opened from inside a workspace the role belongs to that workspace alone, so
  // it is saved through the workspace-scoped endpoints.
  const save = workspaceSlug
    ? {
        create: (payload) => api.createInWorkspace(workspaceSlug, payload),
        update: (id, payload) =>
          api.updateInWorkspace(workspaceSlug, id, payload),
      }
    : {
        create: (payload) => api.create(payload),
        update: (id, payload) => api.update(id, payload),
      };
  const isNew = !role?.id;
  const [displayName, setDisplayName] = useState(role?.displayName || "");
  const [name, setName] = useState(role?.name || "");
  const [nameTouched, setNameTouched] = useState(!isNew);
  const [description, setDescription] = useState(role?.description || "");
  const [selected, setSelected] = useState(new Set(role?.permissions || []));
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const isSuperAdmin =
    scope === "system" && selected.has(PERMISSIONS.SUPER_ADMIN);
  const totalPermissions = useMemo(
    () =>
      categories.reduce(
        (count, category) => count + category.permissions.length,
        0
      ),
    [categories]
  );

  function toggle(key) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  function toggleCategory(category, checked) {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const permission of category.permissions) {
        checked ? next.add(permission.key) : next.delete(permission.key);
      }
      return next;
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const payload = {
      displayName,
      description,
      permissions: [...selected],
    };
    const { error: saveError } = isNew
      ? await save.create({ ...payload, name: name || slugify(displayName) })
      : await save.update(role.id, payload);

    setSaving(false);
    if (saveError) return setError(saveError);
    onSaved();
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {isNew
            ? scope === "workspace"
              ? workspaceSlug
                ? "Create a role for this workspace"
                : "Create a shared workspace role"
              : "Create a system role"
            : `Edit ${role.displayName}`}
        </DialogTitle>
      </DialogHeader>

      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="displayName" className="block mb-2">
                Label
              </Label>
              <Input
                name="displayName"
                value={displayName}
                onChange={(e) => {
                  setDisplayName(e.target.value);
                  if (!nameTouched) setName(slugify(e.target.value));
                }}
                placeholder="Content Editor"
                required={true}
                autoComplete="off"
              />
            </div>
            <div>
              <Label htmlFor="name" className="block mb-2">
                Identifier
              </Label>
              <Input
                name="name"
                value={name}
                onChange={(e) => {
                  setNameTouched(true);
                  setName(slugify(e.target.value));
                }}
                placeholder="content-editor"
                required={true}
                autoComplete="off"
                disabled={!isNew}
              />
              <p className="mt-2 text-xs text-theme-text-secondary">
                {isNew
                  ? "Lowercase letters, numbers and hyphens. Cannot be changed later."
                  : "The identifier of an existing role cannot be changed."}
              </p>
            </div>
          </div>

          <div>
            <Label htmlFor="description" className="block mb-2">
              Description
            </Label>
            <Textarea
              name="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What this role is for"
              rows={2}
              autoComplete="off"
            />
          </div>

          <div>
            <div className="flex items-baseline justify-between mb-2">
              <Label>Permissions</Label>
              <span className="text-xs text-theme-text-secondary">
                {selected.size} of {totalPermissions} selected
              </span>
            </div>

            {isSuperAdmin && (
              <p className="text-xs text-yellow-400 mb-3">
                This role holds the super administrator grant, so it has every
                permission — including any added by future updates — regardless
                of the boxes below.
              </p>
            )}

            <div className="max-h-[45vh] overflow-y-auto pr-2 flex flex-col gap-y-5">
              {categories.map((category) => {
                const allChecked = category.permissions.every((permission) =>
                  selected.has(permission.key)
                );
                return (
                  <div key={category.key}>
                    <div className="flex items-center gap-x-2 mb-2">
                      <Checkbox
                        id={`category-${category.key}`}
                        checked={allChecked}
                        onCheckedChange={(checked) =>
                          toggleCategory(category, checked === true)
                        }
                      />
                      <label
                        htmlFor={`category-${category.key}`}
                        className="text-sm font-semibold text-theme-text-primary cursor-pointer"
                      >
                        {category.label}
                      </label>
                    </div>
                    <div className="flex flex-col gap-y-2 pl-6">
                      {category.permissions.map((permission) => (
                        <div
                          key={permission.key}
                          className="flex items-start gap-x-2"
                        >
                          <Checkbox
                            id={permission.key}
                            className="mt-0.5"
                            checked={selected.has(permission.key)}
                            onCheckedChange={() => toggle(permission.key)}
                          />
                          <label
                            htmlFor={permission.key}
                            className="cursor-pointer"
                          >
                            <span className="text-sm text-theme-text-primary block">
                              {permission.label}
                            </span>
                            <span className="text-xs text-theme-text-secondary block">
                              {permission.description}
                            </span>
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {error && <p className="text-red-400 text-sm">Error: {error}</p>}
        </div>

        <DialogFooter>
          <DialogClose
            render={
              <Button variant="outline" type="button" onClick={onClose} />
            }
          >
            Cancel
          </DialogClose>
          <Button variant="default" type="submit" disabled={saving}>
            {saving ? "Saving…" : isNew ? "Create role" : "Save changes"}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}

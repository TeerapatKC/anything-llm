import { useMemo, useState } from "react";
import Role, { WorkspaceRole } from "@/models/role";
import { PERMISSIONS } from "@/utils/permissions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DialogClose,
  DialogDescription,
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
  // The owner role is frozen server-side, so the editor opens as a viewer rather than
  // letting an operator make changes that would only be rejected on save.
  const readOnly = role?.isImmutable === true;
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

  const hasWildcard =
    scope === "system" && selected.has(PERMISSIONS.SYSTEM_ADMIN);
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
            : `${readOnly ? "View" : "Edit"} ${role.displayName}`}
        </DialogTitle>
        <DialogDescription>
          {readOnly
            ? "This role is built into the instance and cannot be changed. It is shown here so you can see exactly what owning the instance grants."
            : scope === "workspace"
              ? "Define what members with this role can do inside this workspace."
              : "Define the permissions granted to users with this role."}
        </DialogDescription>
      </DialogHeader>

      <form id="role-editor-form" onSubmit={handleSubmit}>
        <div className="space-y-4">
          <div className="grid gap-4 rounded-lg border border-theme-sidebar-border bg-muted/20 p-4 md:grid-cols-2">
            <div>
              <Label htmlFor="displayName" className="block mb-2">
                Label
              </Label>
              <Input
                id="displayName"
                name="displayName"
                value={displayName}
                onChange={(e) => {
                  setDisplayName(e.target.value);
                  if (!nameTouched) setName(slugify(e.target.value));
                }}
                placeholder="Content Editor"
                required={true}
                autoComplete="off"
                disabled={readOnly}
              />
            </div>
            <div>
              <Label htmlFor="name" className="block mb-2">
                Identifier
              </Label>
              <Input
                id="name"
                name="name"
                value={name}
                onChange={(e) => {
                  setNameTouched(true);
                  setName(slugify(e.target.value));
                }}
                placeholder="content-editor"
                required={true}
                autoComplete="off"
                disabled={readOnly || !isNew}
              />
              <p className="mt-2 text-xs text-theme-text-secondary">
                {isNew
                  ? "Lowercase letters, numbers and hyphens. Cannot be changed later."
                  : "The identifier of an existing role cannot be changed."}
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-theme-sidebar-border bg-muted/20 p-4">
            <Label htmlFor="description" className="block mb-2">
              Description
            </Label>
            <Textarea
              id="description"
              name="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What this role is for"
              rows={2}
              autoComplete="off"
              disabled={readOnly}
            />
          </div>

          <div className="overflow-hidden rounded-lg border border-theme-sidebar-border">
            <div className="flex items-baseline justify-between border-b border-theme-sidebar-border bg-muted/50 px-4 py-3">
              <Label>Permissions</Label>
              <span className="text-xs text-theme-text-secondary">
                {selected.size} of {totalPermissions} selected
              </span>
            </div>

            {hasWildcard && (
              <p className="mx-4 mt-3 rounded-md border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-400 light:text-yellow-700">
                This role holds the system administrator grant, so it has every
                permission — including any added by future updates — regardless
                of the boxes below.
              </p>
            )}

            <ScrollArea className="h-[360px] min-h-[240px] max-h-[40vh]">
              <div className="flex flex-col gap-y-3 p-3 pr-4">
                {categories.map((category) => {
                  const allChecked = category.permissions.every((permission) =>
                    selected.has(permission.key)
                  );
                  return (
                    <div
                      key={category.key}
                      className="overflow-hidden rounded-md border border-theme-sidebar-border"
                    >
                      <div className="flex items-center gap-x-2 border-b border-theme-sidebar-border bg-muted/30 px-3 py-2.5">
                        <Checkbox
                          id={`category-${category.key}`}
                          checked={allChecked}
                          disabled={readOnly}
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
                      <div className="flex flex-col gap-y-1 p-2">
                        {category.permissions.map((permission) => {
                          // A coarse permission grants everything beneath it, so a child
                          // whose parent is ticked shows as included and cannot be
                          // unticked on its own - that is what the server resolves to.
                          const implied =
                            !!permission.parent &&
                            selected.has(permission.parent);
                          return (
                            <div
                              key={permission.key}
                              className={`flex items-start gap-x-3 rounded-md px-2 py-2 transition-colors hover:bg-muted/50 ${
                                permission.parent ? "ml-6" : ""
                              }`}
                            >
                              <Checkbox
                                id={permission.key}
                                className="mt-0.5"
                                checked={
                                  implied || selected.has(permission.key)
                                }
                                disabled={readOnly || implied}
                                onCheckedChange={() => toggle(permission.key)}
                              />
                              <label
                                htmlFor={permission.key}
                                className={
                                  readOnly || implied
                                    ? "cursor-default"
                                    : "cursor-pointer"
                                }
                              >
                                <span className="text-sm text-theme-text-primary block">
                                  {permission.label}
                                  {implied && (
                                    <span className="ml-2 text-[10px] uppercase tracking-wide text-theme-text-secondary">
                                      included
                                    </span>
                                  )}
                                </span>
                                <span className="text-xs text-theme-text-secondary block">
                                  {permission.description}
                                </span>
                              </label>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>

          {error && (
            <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400 light:text-red-600">
              Error: {error}
            </p>
          )}
        </div>
      </form>

      <DialogFooter>
        <DialogClose
          render={
            <Button
              variant={readOnly ? "default" : "outline"}
              type="button"
              onClick={onClose}
            />
          }
        >
          {readOnly ? "Close" : "Cancel"}
        </DialogClose>
        {!readOnly && (
          <Button
            variant="default"
            type="submit"
            form="role-editor-form"
            disabled={saving}
          >
            {saving ? "Saving…" : isNew ? "Create role" : "Save changes"}
          </Button>
        )}
      </DialogFooter>
    </>
  );
}

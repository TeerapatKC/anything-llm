import { Alert, AlertDescription } from "@/components/ui/alert";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Lock, RotateCcw, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import showToast from "@/utils/toast";
import SuperAdmin from "@/models/superAdmin";

/**
 * Which system permissions stay with the owner.
 *
 * Reserving one is a real access decision, not a hidden menu entry: the server strips it
 * from every role but `super-admin` when it resolves effective permissions, so an
 * administrator does not get it even though their role carries the `system.admin`
 * wildcard. Untick a box and the capability goes back to whoever their role says.
 */
export default function ReservedPermissions() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [saved, setSaved] = useState(new Set());
  const [preset, setPreset] = useState([]);

  async function reload() {
    const {
      categories: _categories,
      reserved,
      defaults,
    } = await SuperAdmin.reservedPermissions();
    setCategories(_categories || []);
    setSelected(new Set(reserved || []));
    setSaved(new Set(reserved || []));
    setPreset(defaults || []);
    setLoading(false);
  }

  useEffect(() => {
    reload();
  }, []);

  function toggle(key) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  const dirty =
    selected.size !== saved.size ||
    [...selected].some((key) => !saved.has(key));

  const matchesPreset =
    selected.size === preset.length && preset.every((key) => selected.has(key));

  // Coarse permissions reach further than their labels suggest - `system.settings` is
  // also what every unmapped settings key falls back to, so reserving it quietly takes
  // the support email and password policy with it.
  const reservedParents = categories
    .flatMap((category) => category.permissions)
    .filter(
      (permission) => permission.hasChildren && selected.has(permission.key)
    );

  async function handleSave() {
    setSaving(true);
    const { success, error, reserved } =
      await SuperAdmin.setReservedPermissions([...selected]);
    setSaving(false);
    if (!success) return showToast(error, "error", { clear: true });

    setSaved(new Set(reserved || []));
    setSelected(new Set(reserved || []));
    showToast(
      reserved.length === 0
        ? "Nothing is reserved. Every permission now follows the roles you have defined."
        : `${reserved.length} permission${reserved.length === 1 ? "" : "s"} reserved to you.`,
      "success",
      { clear: true }
    );
  }

  if (loading)
    return (
      <Skeleton
        height="40vh"
        width="100%"
        highlightColor="var(--theme-bg-primary)"
        baseColor="var(--theme-bg-secondary)"
        count={1}
        className="w-full p-4 rounded-2xl mt-6"
        containerClassName="flex w-full"
      />
    );

  return (
    <div className="mt-6 flex flex-col gap-y-5">
      <Alert className="px-3 py-2.5">
        <Lock />
        <AlertDescription>
          Anything you tick here belongs to you alone. It is removed from every
          other role when permissions are resolved — including Admin, whose
          wildcard would otherwise cover it — so those screens disappear for
          them and the routes behind them refuse the request. Untick a box to
          hand the capability back to whoever their role says.
        </AlertDescription>
      </Alert>

      {reservedParents.length > 0 && (
        <Alert variant="warning" className="px-3 py-2.5">
          <TriangleAlert />
          <AlertDescription>
            You have reserved{" "}
            {reservedParents.map((permission) => permission.label).join(", ")},
            which covers everything beneath it. “Manage system settings” is also
            what any setting without a permission of its own falls back to — so
            reserving it takes the support email, message limits and password
            policy away from your admins too. Reserve the individual entries
            instead if that is not what you want.
          </AlertDescription>
        </Alert>
      )}

      <div className="overflow-hidden rounded-lg ring-1 ring-foreground/10">
        <div className="flex items-baseline justify-between border-b border-theme-sidebar-border bg-muted/50 px-4 py-3">
          <div className="flex items-center gap-x-2">
            <Label>Reserved to the owner</Label>
            {matchesPreset && (
              <Badge variant="outline" className="text-[10px]">
                Default preset
              </Badge>
            )}
          </div>
          <span className="text-xs text-theme-text-secondary">
            {selected.size} selected
          </span>
        </div>

        <ScrollArea className="h-[420px] min-h-[240px] max-h-[50vh]">
          <div className="flex flex-col gap-y-3 p-3 pr-4">
            {categories.map((category) => (
              <div
                key={category.key}
                className="overflow-hidden rounded-md border border-theme-sidebar-border"
              >
                <div className="border-b border-theme-sidebar-border bg-muted/30 px-3 py-2.5">
                  <span className="text-sm font-semibold text-theme-text-primary">
                    {category.label}
                  </span>
                </div>
                <div className="flex flex-col gap-y-1 p-2">
                  {category.permissions.map((permission) => (
                    <div
                      key={permission.key}
                      className={`flex items-start gap-x-3 rounded-md px-2 py-2 transition-colors hover:bg-muted/50 ${
                        permission.parent ? "ml-6" : ""
                      }`}
                    >
                      <Checkbox
                        id={`reserve-${permission.key}`}
                        className="mt-0.5"
                        checked={selected.has(permission.key)}
                        onCheckedChange={() => toggle(permission.key)}
                      />
                      <label
                        htmlFor={`reserve-${permission.key}`}
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
            ))}
          </div>
        </ScrollArea>
      </div>

      <div className="flex items-center justify-end gap-x-3">
        {!matchesPreset && (
          <Button
            type="button"
            variant="outline"
            onClick={() => setSelected(new Set(preset))}
            disabled={saving}
          >
            <RotateCcw className="h-4 w-4" />
            Restore default preset
          </Button>
        )}
        {dirty && (
          <Button
            type="button"
            variant="outline"
            onClick={() => setSelected(new Set(saved))}
            disabled={saving}
          >
            Discard changes
          </Button>
        )}
        <Button type="button" onClick={handleSave} disabled={saving || !dirty}>
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>
    </div>
  );
}

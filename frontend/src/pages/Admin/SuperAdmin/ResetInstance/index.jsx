import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { TriangleAlert } from "lucide-react";
import ConfirmDialog from "@/components/ConfirmDialog";
import showToast from "@/utils/toast";
import SuperAdmin from "@/models/superAdmin";
import FactoryReset from "../FactoryReset";

/**
 * Irreversibly clears chosen parts of the instance.
 *
 * Every scope is opt-in and shows what it would actually remove before anything is
 * touched, because "reset" is not a word anyone should have to take on trust. The
 * server asks for the caller's password and the instance's own name on top of this.
 */
export default function ResetInstance() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [scopes, setScopes] = useState([]);
  const [counts, setCounts] = useState({});
  const [phrase, setPhrase] = useState("");
  const [factory, setFactory] = useState(null);
  const [factoryPhrase, setFactoryPhrase] = useState("");
  const [selected, setSelected] = useState(new Set());
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [running, setRunning] = useState(false);
  const [confirm, setConfirm] = useState(null);

  async function reload() {
    const {
      scopes: _scopes,
      counts: _counts,
      factory: _factory,
      confirmationPhrase,
      factoryConfirmationPhrase,
    } = await SuperAdmin.resetPreview();
    setScopes(_scopes || []);
    setCounts(_counts || {});
    setFactory(_factory || null);
    setPhrase(confirmationPhrase || "");
    setFactoryPhrase(factoryConfirmationPhrase || "");
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

  // A scope that another selected scope pulls in is shown as already included rather
  // than silently added, so the confirmation reflects what will really be removed.
  const impliedScopes = new Set(
    scopes
      .filter((scope) => selected.has(scope.key))
      .flatMap((scope) => scope.implies)
  );

  const chosen = scopes.filter(
    (scope) => selected.has(scope.key) || impliedScopes.has(scope.key)
  );

  function handleSubmit(e) {
    e.preventDefault();
    if (chosen.length === 0) return;

    setConfirm({
      title: "Reset this instance?",
      description: `This permanently removes: ${chosen
        .map((scope) => scope.label.toLowerCase())
        .join(", ")}. There is no undo and no backup is taken.`,
      confirmText: "Reset now",
      variant: "destructive",
      onConfirm: async () => {
        setRunning(true);
        const { success, error, results } = await SuperAdmin.reset({
          scopes: [...selected],
          password,
          confirmation,
        });
        setRunning(false);
        if (!success) return showToast(error, "error", { clear: true });

        const removed = Object.values(results ?? {})
          .flatMap((scope) => Object.values(scope))
          .filter((value) => typeof value === "number")
          .reduce((total, value) => total + value, 0);

        showToast(`Reset complete. ${removed} records removed.`, "success", {
          clear: true,
        });
        setSelected(new Set());
        setPassword("");
        setConfirmation("");
        reload();
      },
    });
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
    <>
      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-y-5">
        <p className="flex items-start gap-x-2 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-sm text-red-400 light:text-red-600">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{t("help.reset-instance")}</span>
        </p>

        <div className="overflow-hidden rounded-lg border border-theme-sidebar-border">
          <div className="border-b border-theme-sidebar-border bg-muted/50 px-4 py-3">
            <Label>{t("ui.what-to-clear")}</Label>
          </div>
          <div className="flex flex-col gap-y-1 p-2">
            {scopes.map((scope) => {
              const implied = impliedScopes.has(scope.key);
              return (
                <div
                  key={scope.key}
                  className="flex items-start gap-x-3 rounded-md px-2 py-2.5 transition-colors hover:bg-muted/50"
                >
                  <Checkbox
                    id={`scope-${scope.key}`}
                    className="mt-0.5"
                    checked={implied || selected.has(scope.key)}
                    disabled={implied}
                    onCheckedChange={() => toggle(scope.key)}
                  />
                  <label
                    htmlFor={`scope-${scope.key}`}
                    className={implied ? "cursor-default" : "cursor-pointer"}
                  >
                    <span className="text-sm text-theme-text-primary block">
                      {scope.label}
                      {implied && (
                        <span className="ml-2 text-[10px] uppercase tracking-wide text-theme-text-secondary">
                          included
                        </span>
                      )}
                    </span>
                    <span className="text-xs text-theme-text-secondary block">
                      {scope.description}
                    </span>
                    <ScopeCounts counts={counts[scope.key]} />
                  </label>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid max-w-2xl gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="reset-password" className="block mb-2">
              Your password
            </Label>
            <Input
              id="reset-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("ui.confirm-it-is-you")}
              autoComplete="current-password"
            />
          </div>
          <div>
            <Label htmlFor="reset-confirmation" className="block mb-2">
              Type “{phrase}” to confirm
            </Label>
            <Input
              id="reset-confirmation"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              placeholder={phrase}
              autoComplete="off"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            type="submit"
            variant="destructive"
            disabled={
              running ||
              chosen.length === 0 ||
              !password ||
              confirmation.trim() !== phrase
            }
          >
            {running ? "Resetting…" : "Reset instance"}
          </Button>
        </div>
      </form>

      <FactoryReset summary={factory} phrase={factoryPhrase} />

      <ConfirmDialog config={confirm} onClose={() => setConfirm(null)} />
    </>
  );
}

/** The live numbers behind a scope, so "reset chats" is not an abstract promise. */
function ScopeCounts({ counts }) {
  if (!counts) return null;
  const entries = Object.entries(counts).filter(([, value]) => value > 0);
  if (entries.length === 0)
    return (
      <span className="mt-1 block text-xs text-theme-text-secondary opacity-60">
        Nothing to remove
      </span>
    );

  return (
    <span className="mt-1 block text-xs text-theme-text-secondary">
      {entries.map(([key, value]) => `${value} ${humanize(key)}`).join(" · ")}
    </span>
  );
}

/** "workspaceChats" -> "workspace chats" */
function humanize(key = "") {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .toLowerCase()
    .trim();
}

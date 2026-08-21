import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Bomb } from "lucide-react";
import ConfirmDialog from "@/components/ConfirmDialog";
import showToast from "@/utils/toast";
import SuperAdmin from "@/models/superAdmin";
import paths from "@/utils/paths";

/**
 * Factory reset.
 *
 * Puts the deployment back to the state it was in before anyone had opened it: no
 * accounts, no content, no provider configuration. The operator's own session dies with
 * it, so on success there is nothing to navigate back to - the browser is sent to
 * onboarding with local storage cleared.
 */
export default function FactoryReset({ summary, phrase }) {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [running, setRunning] = useState(false);
  const [confirm, setConfirm] = useState(null);

  function handleSubmit(e) {
    e.preventDefault();

    setConfirm({
      title: "Erase this instance?",
      description:
        "Every account, workspace, document and setting is deleted, including your own account and the LLM configuration. You will be signed out and this instance will start again from the setup screen. There is no undo and no backup is taken.",
      confirmText: "Erase everything",
      variant: "destructive",
      onConfirm: async () => {
        setRunning(true);
        const { success, error } = await SuperAdmin.factoryReset({
          password,
          confirmation,
        });

        if (!success) {
          setRunning(false);
          return showToast(error, "error", { clear: true });
        }

        // The account behind this session no longer exists, so every cached token,
        // permission set and user object is stale. A hard navigation guarantees nothing
        // in memory survives into the setup flow either.
        window.localStorage.clear();
        window.location.replace(paths.onboarding.home());
      },
    });
  }

  return (
    <>
      <form
        onSubmit={handleSubmit}
        className="mt-8 flex flex-col gap-y-5 rounded-lg border border-red-500/40 bg-red-500/5 p-5"
      >
        <div className="flex items-start gap-x-3">
          <Bomb className="mt-0.5 h-5 w-5 shrink-0 text-red-400 light:text-red-600" />
          <div>
            <h3 className="text-theme-text-primary font-medium">
              Factory reset
            </h3>
            <p className="mt-1 text-sm text-theme-text-secondary">
              Erases the entire deployment and starts it over from the setup
              screen, as if it had just been installed. Unlike the reset above,
              this deletes <strong>your own account</strong> and the LLM,
              embedder and vector database configuration too.
            </p>
            <FactorySummary summary={summary} />
          </div>
        </div>

        <div className="grid max-w-2xl gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="factory-password" className="block mb-2">
              Your password
            </Label>
            <Input
              id="factory-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Confirm it is you"
              autoComplete="current-password"
            />
          </div>
          <div>
            <Label htmlFor="factory-confirmation" className="block mb-2">
              Type “{phrase}” to confirm
            </Label>
            <Input
              id="factory-confirmation"
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
            disabled={running || !password || confirmation.trim() !== phrase}
          >
            {running ? "Erasing…" : "Erase this instance"}
          </Button>
        </div>
      </form>

      <ConfirmDialog config={confirm} onClose={() => setConfirm(null)} />
    </>
  );
}

/** What is actually on the instance right now, so the warning is not abstract. */
function FactorySummary({ summary }) {
  if (!summary) return null;

  const parts = [
    [summary.users, "user account"],
    [summary.workspaces, "workspace"],
    [summary.records, "database record"],
    [summary.providerSettings, "provider setting"],
  ].filter(([count]) => count > 0);

  if (parts.length === 0) return null;

  return (
    <p className="mt-2 text-xs text-theme-text-secondary">
      This will remove{" "}
      {parts
        .map(([count, noun]) => `${count} ${noun}${count === 1 ? "" : "s"}`)
        .join(", ")}
      .
    </p>
  );
}

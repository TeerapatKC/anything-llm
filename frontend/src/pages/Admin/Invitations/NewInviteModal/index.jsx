import { useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";
import Admin from "@/models/admin";
import Workspace from "@/models/workspace";
import showToast from "@/utils/toast";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DialogClose,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export default function NewInviteModal({ onSuccess }) {
  const [invite, setInvite] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [workspaces, setWorkspaces] = useState([]);
  const [selectedWorkspaceIds, setSelectedWorkspaceIds] = useState([]);

  const handleCreate = async (e) => {
    setError(null);
    e.preventDefault();

    const { invite: newInvite, error } = await Admin.newInvite({
      role: null,
      workspaceIds: selectedWorkspaceIds,
    });
    if (!!newInvite) {
      setInvite(newInvite);
      onSuccess();
    }
    setError(error);
  };

  const copyInviteLink = () => {
    if (!invite) return false;
    window.navigator.clipboard.writeText(
      `${window.location.origin}/accept-invite/${invite.code}`
    );
    setCopied(true);
    showToast("Invite link copied to clipboard", "success", {
      clear: true,
    });
  };

  const handleWorkspaceSelection = (workspaceId) => {
    if (selectedWorkspaceIds.includes(workspaceId)) {
      const updated = selectedWorkspaceIds.filter((id) => id !== workspaceId);
      setSelectedWorkspaceIds(updated);
      return;
    }
    setSelectedWorkspaceIds([...selectedWorkspaceIds, workspaceId]);
  };

  useEffect(() => {
    function resetStatus() {
      if (!copied) return false;
      setTimeout(() => {
        setCopied(false);
      }, 3000);
    }
    resetStatus();
  }, [copied]);

  useEffect(() => {
    async function fetchWorkspaces() {
      Workspace.all()
        .then((workspaces) => setWorkspaces(workspaces))
        .catch(() => setWorkspaces([]));
    }
    fetchWorkspaces();
  }, []);

  return (
    <>
      <DialogHeader>
        <DialogTitle>Create new invite</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleCreate}>
        <div className="space-y-4">
          {error && <p className="text-red-400 text-sm">Error: {error}</p>}
          {invite && (
            <div className="relative">
              <input
                type="url"
                defaultValue={`${window.location.origin}/accept-invite/${invite.code}`}
                disabled={true}
                className="border-none bg-theme-settings-input-bg text-theme-text-primary placeholder:text-theme-settings-input-placeholder text-sm rounded-lg outline-none block w-full p-2.5 pr-10"
              />
              <button
                type="button"
                onClick={copyInviteLink}
                disabled={copied}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-theme-modal-border transition-all duration-300"
              >
                {copied ? (
                  <Check size={20} className="text-green-400" />
                ) : (
                  <Copy size={20} className="text-theme-text-primary" />
                )}
              </button>
            </div>
          )}
          <p className="text-muted-foreground text-xs md:text-sm">
            Once created you can copy the link and send it to someone. They sign
            up with the <b>default</b> role and join the workspaces you pick
            below.
          </p>
        </div>

        {workspaces.length > 0 && !invite && (
          <div className="mt-6 space-y-2">
            <div className="flex items-baseline justify-between gap-4">
              <Label>Add to workspaces</Label>
              {selectedWorkspaceIds.length > 0 && (
                <span className="text-muted-foreground text-xs">
                  {selectedWorkspaceIds.length} of {workspaces.length} selected
                </span>
              )}
            </div>
            <p className="text-muted-foreground text-xs">
              Optional. Anyone joining with this invite is added to the
              workspaces you pick here — otherwise they start with none, and you
              can assign workspaces after they accept.
            </p>

            <div className="max-h-56 overflow-y-auto rounded-lg border">
              {workspaces.map((workspace) => (
                <WorkspaceOption
                  key={workspace.id}
                  workspace={workspace}
                  selected={selectedWorkspaceIds.includes(workspace.id)}
                  toggleSelection={handleWorkspaceSelection}
                />
              ))}
            </div>
          </div>
        )}

        <DialogFooter>
          {!invite ? (
            <>
              <DialogClose render={<Button variant="outline" type="button" />}>
                Cancel
              </DialogClose>
              <Button variant="default" type="submit">
                Create Invite
              </Button>
            </>
          ) : (
            <DialogClose render={<Button variant="outline" type="button" />}>
              Close
            </DialogClose>
          )}
        </DialogFooter>
      </form>
    </>
  );
}

/**
 * One selectable workspace. This used to be a <button> holding a hidden
 * `type="radio"` input — the wrong control for a multi-select, and React warns
 * about a `checked` prop with no `onChange`. It is a labelled checkbox now, so
 * the whole row is the click target and the state is announced correctly.
 */
function WorkspaceOption({ workspace, selected, toggleSelection }) {
  return (
    <label className="flex cursor-pointer items-center gap-3 border-b px-3 py-2.5 transition-colors last:border-b-0 hover:bg-muted/50 has-data-checked:bg-muted/50">
      <Checkbox
        checked={selected}
        onCheckedChange={() => toggleSelection(workspace.id)}
      />
      <span className="text-sm font-medium">{workspace.name}</span>
    </label>
  );
}

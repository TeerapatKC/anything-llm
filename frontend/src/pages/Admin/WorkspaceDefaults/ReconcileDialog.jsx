import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import Admin from "@/models/admin";
import showToast from "@/utils/toast";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

/** Typed to unlock the permanent option, so it can never be a stray click. */
const DELETE_CONFIRMATION = "delete";

/**
 * The decision a destructive private workspace policy change stops for.
 *
 * The change itself has not been saved when this opens: the server held it back and
 * handed over the workspaces it would put outside the policy. Nothing here happens to a
 * workspace the operator does not tick, and the three buttons are the whole of what can
 * happen - keep them, close them, or delete them. Whichever is chosen, the policy
 * change is saved afterwards.
 */
export default function ReconcileDialog({ review, onClose, onResolved }) {
  const affected = review?.affected ?? [];
  const [selected, setSelected] = useState(
    () => new Set(affected.filter((w) => w.suggested).map((w) => w.id))
  );
  const [confirmation, setConfirmation] = useState("");
  const [working, setWorking] = useState(false);

  const allSelected = selected.size === affected.length && affected.length > 0;
  const canDelete =
    selected.size > 0 &&
    confirmation.trim().toLowerCase() === DELETE_CONFIRMATION;

  function toggle(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function resolve(action) {
    setWorking(true);
    const result = await Admin.reconcilePersonalWorkspaces({
      token: review.token,
      action,
      workspaceIds: [...selected],
    });
    setWorking(false);
    if (!result?.success)
      return showToast(result?.error ?? "Could not apply", "error");

    const acted = result.acted?.length ?? 0;
    showToast(
      action === "skip"
        ? "Saved. No private workspace was changed."
        : `Saved. ${acted} private workspace(s) ${action === "delete" ? "deleted" : "deactivated"}.`,
      "success"
    );
    onResolved?.();
  }

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="size-5 text-amber-500" />
            {review.disabling
              ? "Turning private workspaces off"
              : "Lowering the private workspace quota"}
          </DialogTitle>
          <DialogDescription>
            {affected.length} private workspace(s) belonging to other people
            fall outside the new policy. Nothing has been saved yet, and nothing
            happens to any of them unless you say so. Ticked below are the ones
            the new policy no longer covers.
          </DialogDescription>
        </DialogHeader>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={(checked) =>
                    setSelected(
                      checked ? new Set(affected.map((w) => w.id)) : new Set()
                    )
                  }
                  aria-label="Select all"
                />
              </TableHead>
              <TableHead>Workspace</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead className="text-right">Documents</TableHead>
              <TableHead className="text-right">Chats</TableHead>
              <TableHead>Last activity</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {affected.map((workspace) => (
              <TableRow key={workspace.id}>
                <TableCell>
                  <Checkbox
                    checked={selected.has(workspace.id)}
                    onCheckedChange={() => toggle(workspace.id)}
                    aria-label={`Select ${workspace.name}`}
                  />
                </TableCell>
                <TableCell className="font-medium">{workspace.name}</TableCell>
                <TableCell>{workspace.ownerUsername}</TableCell>
                <TableCell className="text-right">
                  {workspace.documentCount}
                </TableCell>
                <TableCell className="text-right">
                  {workspace.chatCount}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {workspace.lastActivityAt
                    ? new Date(workspace.lastActivityAt).toLocaleDateString()
                    : "never"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <div className="flex flex-col gap-y-2 rounded-lg border border-destructive/40 p-3">
          <p className="text-xs text-muted-foreground">
            Deleting is permanent and takes the documents, chats and embeddings
            with it. Type "{DELETE_CONFIRMATION}" to unlock that option.
          </p>
          <Input
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            placeholder={DELETE_CONFIRMATION}
            className="max-w-xs"
          />
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={onClose} disabled={working}>
            Cancel
          </Button>
          <Button
            variant="outline"
            onClick={() => resolve("skip")}
            disabled={working}
          >
            Save, keep them all
          </Button>
          <Button
            onClick={() => resolve("deactivate")}
            disabled={working || selected.size === 0}
          >
            Deactivate selected ({selected.size})
          </Button>
          <Button
            variant="destructive"
            onClick={() => resolve("delete")}
            disabled={working || !canDelete}
          >
            Delete selected ({selected.size})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

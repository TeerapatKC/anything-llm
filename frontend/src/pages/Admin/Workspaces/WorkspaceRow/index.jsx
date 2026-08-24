import { useRef } from "react";
import { useState } from "react";
import Admin from "@/models/admin";
import Workspace from "@/models/workspace";
import showToast from "@/utils/toast";
import paths from "@/utils/paths";
import { Settings, Link2, Trash2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { TableCell, TableHead, TableRow } from "@/components/ui/table";
import ConfirmDialog from "@/components/ConfirmDialog";
import TableRowActions from "@/components/lib/TableRowActions";
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

export default function WorkspaceRow({
  workspace,
  users: _users,
  deletionProtected = false,
}) {
  const rowRef = useRef(null);
  const [confirm, setConfirm] = useState(null);
  // `active` was added after these rows existed, so a workspace that predates the
  // column (or an API response that omits it) is treated as active.
  const [active, setActive] = useState(workspace.active !== false);
  const [saving, setSaving] = useState(false);

  const handleDelete = async () => {
    setConfirm({
      title: `Delete ${workspace.name}?`,
      description:
        "After deleting it will be unavailable in this instance of NexusAI. This action is irreversible.",
      confirmText: "Delete",
      variant: "destructive",
      onConfirm: async () => {
        rowRef?.current?.remove();
        await Admin.deleteWorkspace(workspace.id);
      },
    });
  };

  const applyActive = async (nextActive) => {
    setSaving(true);
    // Move the switch immediately, then roll back if the server refuses - a toggle
    // that lags behind the click reads as broken.
    setActive(nextActive);
    const { workspace: updated, message } = await Workspace.update(
      workspace.slug,
      { active: nextActive }
    );
    setSaving(false);

    if (!updated) {
      setActive(!nextActive);
      showToast(message || "Failed to update workspace status.", "error", {
        clear: true,
      });
      return;
    }
    showToast(
      `${workspace.name} is now ${nextActive ? "active" : "inactive"}.`,
      "success",
      { clear: true }
    );
  };

  const handleToggleActive = (nextActive) => {
    if (nextActive) return applyActive(true);
    setConfirm({
      title: `Deactivate ${workspace.name}?`,
      description:
        "Members will not be able to chat in this workspace, and any embeds pointing at it stop responding. Its documents, chats and settings are kept, and you can re-activate it at any time.",
      confirmText: "Deactivate",
      variant: "destructive",
      onConfirm: () => applyActive(false),
    });
  };

  return (
    <>
      <TableRow ref={rowRef} className={`${active ? "" : "opacity-60"}`}>
        <TableHead scope="row">{workspace.name}</TableHead>
        <TableCell>
          <a
            href={paths.workspace.chat(workspace.slug)}
            target="_blank"
            rel="noreferrer"
            className="text-theme-text-primary flex items-center hover:underline"
          >
            <Link2 className="mr-2 w-4 h-4" /> {workspace.slug}
          </a>
        </TableCell>
        <TableCell>
          <a
            href={paths.workspace.settings.members(workspace.slug)}
            className="text-theme-text-primary flex items-center underline"
          >
            {workspace.userIds?.length}
          </a>
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-x-2">
            <Switch
              checked={active}
              disabled={saving}
              onCheckedChange={handleToggleActive}
              aria-label={`${active ? "Deactivate" : "Activate"} ${workspace.name}`}
              size="lg"
            />
            <span className="whitespace-nowrap">
              {active ? "Active" : "Inactive"}
            </span>
          </div>
        </TableCell>
        <TableCell>{workspace.createdAt}</TableCell>
        <TableCell className="text-right">
          <TableRowActions>
            <DropdownMenuItem
              render={
                <a
                  href={paths.workspace.settings.generalAppearance(
                    workspace.slug
                  )}
                />
              }
            >
              <Settings />
              Workspace settings
            </DropdownMenuItem>
            {!deletionProtected && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={handleDelete}>
                  <Trash2 />
                  Delete
                </DropdownMenuItem>
              </>
            )}
          </TableRowActions>
        </TableCell>
      </TableRow>
      <ConfirmDialog config={confirm} onClose={() => setConfirm(null)} />
    </>
  );
}

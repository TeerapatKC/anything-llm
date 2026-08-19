import { useState } from "react";
import { TableCell, TableHead, TableRow } from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { WorkspaceRole } from "@/models/role";
import showToast from "@/utils/toast";

/**
 * One member of a workspace. The role shown here is their *workspace* role - what they
 * may do inside this workspace - not the instance-wide role on their account.
 */
export default function WorkspaceMemberRow({
  member,
  workspaceSlug,
  workspaceRoles = [],
  canManage = false,
}) {
  const [roleId, setRoleId] = useState(
    member.workspaceRole?.id ? String(member.workspaceRole.id) : ""
  );
  const [saving, setSaving] = useState(false);

  async function handleRoleChange(nextRoleId) {
    const previous = roleId;
    setRoleId(nextRoleId);
    setSaving(true);
    const { success, error } = await WorkspaceRole.setMemberRole(
      workspaceSlug,
      member.user_id,
      Number(nextRoleId)
    );
    setSaving(false);
    if (!success) {
      setRoleId(previous);
      return showToast(error, "error", { clear: true });
    }
    showToast("Workspace role updated.", "success", { clear: true });
  }

  return (
    <TableRow className="bg-transparent text-theme-text-primary text-sm font-medium">
      <TableHead scope="row" className="px-6 py-4 whitespace-nowrap">
        {member.username}
      </TableHead>
      <TableCell className="px-6 py-4">
        {canManage ? (
          <Select
            value={roleId}
            onValueChange={handleRoleChange}
            disabled={saving}
          >
            <SelectTrigger className="w-[190px]">
              <SelectValue placeholder="Select a role" />
            </SelectTrigger>
            <SelectContent>
              {workspaceRoles.map((role) => (
                <SelectItem key={role.id} value={String(role.id)}>
                  {role.displayName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          (member.workspaceRole?.displayName ?? "—")
        )}
      </TableCell>
      <TableCell className="px-6 py-4">{member.createdAt}</TableCell>
    </TableRow>
  );
}

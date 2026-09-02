import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
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
  const { t } = useTranslation();
  const memberRoleId =
    member.workspaceRole?.id ??
    member.workspace_role_id ??
    member.workspaceRoleId ??
    null;
  const assignedRole =
    workspaceRoles.find((role) => String(role.id) === String(memberRoleId)) ??
    workspaceRoles.find((role) => role.isDefault) ??
    null;
  const [roleId, setRoleId] = useState(
    memberRoleId
      ? String(memberRoleId)
      : assignedRole
        ? String(assignedRole.id)
        : ""
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!roleId && assignedRole?.id) setRoleId(String(assignedRole.id));
  }, [assignedRole?.id, roleId]);

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
    <TableRow>
      <TableHead scope="row">{member.username}</TableHead>
      <TableCell>
        {canManage ? (
          <Select
            value={roleId}
            onValueChange={handleRoleChange}
            disabled={saving}
          >
            <SelectTrigger className="w-[190px]">
              <SelectValue placeholder={t("ui.select-role")}>
                {(selectedRoleId) =>
                  workspaceRoles.find(
                    (role) => String(role.id) === String(selectedRoleId)
                  )?.displayName ??
                  assignedRole?.displayName ??
                  member.workspaceRole?.displayName ??
                  "Select a role"
                }
              </SelectValue>
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
          (assignedRole?.displayName ??
          member.workspaceRole?.displayName ??
          "—")
        )}
      </TableCell>
      <TableCell>{member.createdAt}</TableCell>
    </TableRow>
  );
}

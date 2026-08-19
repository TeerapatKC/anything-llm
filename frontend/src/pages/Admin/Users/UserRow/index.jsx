import { useRef, useState } from "react";
import { titleCase } from "text-case";
import Admin from "@/models/admin";
import EditUserModal from "./EditUserModal";
import showToast from "@/utils/toast";
import { useModal } from "@/hooks/useModal";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { TableCell, TableHead, TableRow } from "@/components/ui/table";
import { PERMISSIONS, userCan, canManageRole } from "@/utils/permissions";
import ConfirmDialog from "@/components/ConfirmDialog";
import GeneratedPasswordModal from "@/components/Modals/GeneratedPassword";
import TableRowActions from "@/components/lib/TableRowActions";
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

export default function UserRow({
  currUser,
  user,
  roles = [],
  permissionLabels = {},
}) {
  const rowRef = useRef(null);
  const canModify =
    userCan(PERMISSIONS.USERS_MANAGE, currUser) &&
    canManageRole(currUser, user.role, roles);
  const [suspended, setSuspended] = useState(user.suspended === 1);
  const { isOpen, openModal, closeModal } = useModal();
  const [confirm, setConfirm] = useState(null);
  const [generatedPassword, setGeneratedPassword] = useState(null);

  const handleResetPassword = async () => {
    setConfirm({
      title: `Reset password for ${user.username}?`,
      description:
        "A new password will be generated and shown to you once. Their current password stops working immediately and they must set a new one the next time they log in.",
      confirmText: "Reset password",
      variant: "default",
      onConfirm: async () => {
        const { success, password, error } = await Admin.resetUserPassword(
          user.id
        );
        if (!success) {
          showToast(error, "error", { clear: true });
          return;
        }
        setGeneratedPassword(password);
      },
    });
  };

  const handleSuspend = async () => {
    setConfirm({
      title: `${suspended ? "Unsuspend" : "Suspend"} ${user.username}?`,
      description: suspended
        ? "The user will be able to log back into this instance of AnythingLLM."
        : "After suspending they will be logged out and unable to log back in until unsuspended by an admin.",
      confirmText: suspended ? "Unsuspend" : "Suspend",
      variant: suspended ? "default" : "destructive",
      onConfirm: async () => {
        const { success, error } = await Admin.updateUser(user.id, {
          suspended: suspended ? 0 : 1,
        });
        if (!success) showToast(error, "error", { clear: true });
        if (success) {
          showToast(
            `User ${!suspended ? "has been suspended" : "is no longer suspended"}.`,
            "success",
            { clear: true }
          );
          setSuspended(!suspended);
        }
      },
    });
  };

  const handleDelete = async () => {
    setConfirm({
      title: `Delete ${user.username}?`,
      description:
        "After deleting they will be logged out and unable to use this instance of AnythingLLM. This action is irreversible.",
      confirmText: "Delete",
      variant: "destructive",
      onConfirm: async () => {
        const { success, error } = await Admin.deleteUser(user.id);
        if (!success) showToast(error, "error", { clear: true });
        if (success) {
          rowRef?.current?.remove();
          showToast("User deleted from system.", "success", { clear: true });
        }
      },
    });
  };

  return (
    <>
      <TableRow ref={rowRef}>
        <TableHead scope="row">{user.username}</TableHead>
        <TableCell>
          {user.email || <span className="text-white/40">—</span>}
        </TableCell>
        <TableCell>
          {roles.find((role) => role.name === user.role)?.displayName ??
            titleCase(user.role)}
        </TableCell>
        <TableCell>{user.createdAt}</TableCell>
        <TableCell className="text-right">
          <TableRowActions>
            {canModify && (
              <DropdownMenuItem onClick={openModal}>Edit</DropdownMenuItem>
            )}
            {currUser?.id !== user.id && canModify && (
              <>
                <DropdownMenuItem onClick={handleResetPassword}>
                  Reset password
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSuspend}>
                  {suspended ? "Unsuspend" : "Suspend"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={handleDelete}>
                  Delete
                </DropdownMenuItem>
              </>
            )}
          </TableRowActions>
        </TableCell>
      </TableRow>
      <Dialog
        open={isOpen}
        onOpenChange={(open) => (open ? openModal() : closeModal())}
      >
        <DialogContent>
          <EditUserModal
            currentUser={currUser}
            user={user}
            roles={roles}
            permissionLabels={permissionLabels}
          />
        </DialogContent>
      </Dialog>
      <ConfirmDialog config={confirm} onClose={() => setConfirm(null)} />
      <GeneratedPasswordModal
        open={!!generatedPassword}
        username={user.username}
        password={generatedPassword}
        title="New password"
        onClose={() => setGeneratedPassword(null)}
      />
    </>
  );
}

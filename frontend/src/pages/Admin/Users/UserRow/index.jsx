import { useRef, useState } from "react";
import { titleCase } from "text-case";
import Admin from "@/models/admin";
import EditUserModal from "./EditUserModal";
import showToast from "@/utils/toast";
import { useModal } from "@/hooks/useModal";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { TableCell, TableHead, TableRow } from "@/components/ui/table";
import { PERMISSIONS, userCan, canManageRole } from "@/utils/permissions";
import ConfirmDialog from "@/components/ConfirmDialog";
import GeneratedPasswordModal from "@/components/Modals/GeneratedPassword";

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
      <TableRow
        variant="none"
        ref={rowRef}
        className="bg-transparent text-theme-text-primary text-opacity-80 text-xs font-medium border-b border-theme-sidebar-border h-10"
      >
        <TableHead
          variant="none"
          scope="row"
          className="px-6 whitespace-nowrap"
        >
          {user.username}
        </TableHead>
        <TableCell variant="none" className="px-6">
          {user.email || <span className="text-white/40">—</span>}
        </TableCell>
        <TableCell variant="none" className="px-6">
          {roles.find((role) => role.name === user.role)?.displayName ??
            titleCase(user.role)}
        </TableCell>
        <TableCell variant="none" className="px-6">
          {user.createdAt}
        </TableCell>
        <TableCell
          variant="none"
          className="px-6 flex items-center gap-x-6 h-full mt-2"
        >
          {canModify && (
            <button
              onClick={openModal}
              className="text-xs font-medium text-white/80 light:text-black/80 rounded-lg hover:text-white hover:light:text-gray-500 px-2 py-1 hover:bg-white hover:bg-opacity-10"
            >
              Edit
            </button>
          )}
          {currUser?.id !== user.id && canModify && (
            <>
              <button
                onClick={handleResetPassword}
                className="text-xs font-medium text-white/80 light:text-black/80 rounded-lg hover:text-white hover:light:text-gray-500 px-2 py-1 hover:bg-white hover:bg-opacity-10 whitespace-nowrap"
              >
                Reset password
              </button>
              <button
                onClick={handleSuspend}
                className="text-xs font-medium text-white/80 light:text-black/80 hover:light:text-orange-500 hover:text-orange-300 rounded-lg px-2 py-1 hover:bg-white hover:light:bg-orange-50 hover:bg-opacity-10"
              >
                {suspended ? "Unsuspend" : "Suspend"}
              </button>
              <Button variant="danger" onClick={handleDelete}>
                Delete
              </Button>
            </>
          )}
        </TableCell>
      </TableRow>
      <Dialog
        open={isOpen}
        onOpenChange={(open) => (open ? openModal() : closeModal())}
      >
        <DialogContent className="max-w-2xl bg-theme-bg-secondary border-theme-modal-border">
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

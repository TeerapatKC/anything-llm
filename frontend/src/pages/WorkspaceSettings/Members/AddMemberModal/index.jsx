import { useState } from "react";
import { Search } from "lucide-react";
import Admin from "@/models/admin";
import showToast from "@/utils/toast";
import { Table, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import useRoles from "@/hooks/useRoles";
import { PERMISSIONS, roleNamesWith } from "@/utils/permissions";

export default function AddMemberModal({ workspace, users }) {
  const { roles } = useRoles();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUsers, setSelectedUsers] = useState(workspace?.userIds || []);

  const handleUpdate = async (e) => {
    e.preventDefault();
    const { success, error } = await Admin.updateUsersInWorkspace(
      workspace.id,
      selectedUsers
    );
    if (success) {
      showToast("Users updated successfully.", "success");
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
    showToast(error, "error");
  };

  const handleUserSelect = (userId) => {
    setSelectedUsers((prevSelectedUsers) => {
      if (prevSelectedUsers.includes(userId)) {
        return prevSelectedUsers.filter((id) => id !== userId);
      } else {
        return [...prevSelectedUsers, userId];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedUsers.length === filteredUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(filteredUsers.map((user) => user.id));
    }
  };

  const handleUnselect = () => {
    setSelectedUsers([]);
  };

  const isUserSelected = (userId) => {
    return selectedUsers.includes(userId);
  };

  const handleSearch = (event) => {
    setSearchTerm(event.target.value);
  };

  const allWorkspaceRoles = roleNamesWith(
    roles,
    PERMISSIONS.WORKSPACES_VIEW_ALL
  );
  const filteredUsers = users
    .filter((user) =>
      user.username.toLowerCase().includes(searchTerm.toLowerCase())
    )
    // Users whose role already grants access to every workspace do not need to be
    // added to one individually.
    .filter((user) => !allWorkspaceRoles.includes(user.role));

  return (
    <>
      <DialogHeader className="flex-row items-center space-y-0 gap-x-4 p-4">
        <DialogTitle className="text-sm font-semibold">Users</DialogTitle>
        <div className="relative">
          <input
            onChange={handleSearch}
            className="w-[400px] h-[34px] bg-theme-bg-primary rounded-[100px] text-theme-text-primary placeholder:text-theme-text-secondary text-sm px-10 pl-10"
            placeholder="Search for a user"
          />
          <Search
            size={16}
            className="text-theme-text-primary text-lg absolute left-3 top-1/2 transform -translate-y-1/2"
          />
        </div>
      </DialogHeader>
      <form onSubmit={handleUpdate}>
        <div className="py-[17px] pl-[20px]">
          <Table className="gap-y-[8px] flex flex-col max-h-[385px] overflow-y-auto pr-[20px]">
            {filteredUsers.length > 0 ? (
              filteredUsers.map((user) => (
                <TableRow
                  key={user.id}
                  className="flex items-center gap-x-2 cursor-pointer"
                  onClick={() => handleUserSelect(user.id)}
                >
                  <div
                    className="shrink-0 w-3 h-3 rounded border border-solid border-white light:border-black flex justify-center items-center"
                    role="checkbox"
                    aria-checked={isUserSelected(user.id)}
                    tabIndex={0}
                  >
                    {isUserSelected(user.id) && (
                      <div className="w-2 h-2 bg-white light:bg-black rounded-[2px]" />
                    )}
                  </div>
                  <p className="text-theme-text-primary text-sm font-medium">
                    {user.username}
                  </p>
                </TableRow>
              ))
            ) : (
              <p className="text-theme-text-secondary text-sm font-medium ">
                No users found
              </p>
            )}
          </Table>
        </div>
        <DialogFooter className="sm:justify-between items-center">
          <div className="flex items-center gap-x-2">
            <button
              type="button"
              onClick={handleSelectAll}
              className="flex items-center gap-x-2 ml-2"
            >
              <div
                className="shrink-0 w-3 h-3 rounded border border-white flex justify-center items-center cursor-pointer"
                role="checkbox"
                aria-checked={selectedUsers.length === filteredUsers.length}
                tabIndex={0}
              >
                {selectedUsers.length === filteredUsers.length && (
                  <div className="w-2 h-2 bg-white rounded-[2px]" />
                )}
              </div>
              <p className="text-theme-text-primary text-sm font-medium">
                Select All
              </p>
            </button>
            {selectedUsers.length > 0 && (
              <button
                type="button"
                onClick={handleUnselect}
                className="flex items-center gap-x-2 ml-2"
              >
                <p className="text-theme-text-secondary text-sm font-medium hover:text-theme-text-primary">
                  Unselect
                </p>
              </button>
            )}
          </div>
          <Button type="submit" variant="default" className="whitespace-nowrap">
            Save
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}

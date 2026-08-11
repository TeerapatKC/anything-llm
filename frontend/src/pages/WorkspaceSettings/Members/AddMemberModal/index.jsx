import { useState } from "react";
import { MagnifyingGlass } from "@phosphor-icons/react";
import Admin from "@/models/admin";
import showToast from "@/utils/toast";
import { Table, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export default function AddMemberModal({ workspace, users }) {
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

  const filteredUsers = users
    .filter((user) =>
      user.username.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .filter((user) => user.role !== "admin")
    .filter((user) => user.role !== "manager");

  return (
    <>
      <DialogHeader
        sticky={false}
        className="flex-row items-center space-y-0 gap-x-4 p-4"
      >
        <DialogTitle className="text-sm font-semibold">Users</DialogTitle>
        <div className="relative">
          <input
            onChange={handleSearch}
            className="w-[400px] h-[34px] bg-theme-bg-primary rounded-[100px] text-white placeholder:text-theme-text-secondary text-sm px-10 pl-10"
            placeholder="Search for a user"
          />
          <MagnifyingGlass
            size={16}
            weight="bold"
            className="text-white text-lg absolute left-3 top-1/2 transform -translate-y-1/2"
          />
        </div>
      </DialogHeader>
      <form onSubmit={handleUpdate}>
        <div className="py-[17px] pl-[20px]">
          <Table
            variant="none"
            className="gap-y-[8px] flex flex-col max-h-[385px] overflow-y-auto pr-[20px]"
          >
            {filteredUsers.length > 0 ? (
              filteredUsers.map((user) => (
                <TableRow
                  variant="none"
                  key={user.id}
                  className="flex items-center gap-x-2 cursor-pointer"
                  onClick={() => handleUserSelect(user.id)}
                >
                  <div
                    className="shrink-0 w-3 h-3 rounded border-[1px] border-solid border-white light:border-black flex justify-center items-center"
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
        <DialogFooter className="sm:justify-between items-center p-3">
          <div className="flex items-center gap-x-2">
            <button
              type="button"
              onClick={handleSelectAll}
              className="flex items-center gap-x-2 ml-2"
            >
              <div
                className="shrink-0 w-3 h-3 rounded border-[1px] border-white flex justify-center items-center cursor-pointer"
                role="checkbox"
                aria-checked={selectedUsers.length === filteredUsers.length}
                tabIndex={0}
              >
                {selectedUsers.length === filteredUsers.length && (
                  <div className="w-2 h-2 bg-white rounded-[2px]" />
                )}
              </div>
              <p className="text-white text-sm font-medium">Select All</p>
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

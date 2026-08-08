import { useRef } from "react";
import Admin from "@/models/admin";
import paths from "@/utils/paths";
import { LinkSimple, Trash } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { TableCell, TableHead, TableRow } from "@/components/ui/table";

export default function WorkspaceRow({
  workspace,
  users: _users,
  deletionProtected = false,
}) {
  const rowRef = useRef(null);
  const handleDelete = async () => {
    if (
      !window.confirm(
        `Are you sure you want to delete ${workspace.name}?\nAfter you do this it will be unavailable in this instance of AnythingLLM.\n\nThis action is irreversible.`
      )
    )
      return false;
    rowRef?.current?.remove();
    await Admin.deleteWorkspace(workspace.id);
  };

  return (
    <>
      <TableRow
        variant="none"
        ref={rowRef}
        className="bg-transparent text-white text-opacity-80 text-xs font-medium border-b border-white/10 h-10"
      >
        <TableHead
          variant="none"
          scope="row"
          className="px-6 whitespace-nowrap"
        >
          {workspace.name}
        </TableHead>
        <TableCell variant="none" className="px-6">
          <a
            href={paths.workspace.chat(workspace.slug)}
            target="_blank"
            rel="noreferrer"
            className="text-white flex items-center hover:underline"
          >
            <LinkSimple className="mr-2 w-4 h-4" /> {workspace.slug}
          </a>
        </TableCell>
        <TableCell variant="none" className="px-6">
          <a
            href={paths.workspace.settings.members(workspace.slug)}
            className="text-white flex items-center underline"
          >
            {workspace.userIds?.length}
          </a>
        </TableCell>
        <TableCell variant="none" className="px-6">
          {workspace.createdAt}
        </TableCell>
        <TableCell variant="none" className="px-6">
          {!deletionProtected && (
            <Button variant="danger" onClick={handleDelete}>
              <Trash className="h-5 w-5" />
            </Button>
          )}
        </TableCell>
      </TableRow>
    </>
  );
}

import { titleCase } from "text-case";
import { TableCell, TableHead, TableRow } from "@/components/ui/table";

export default function WorkspaceMemberRow({ user }) {
  return (
    <>
      <TableRow
        variant="none"
        className="bg-transparent text-theme-text-primary text-sm font-medium"
      >
        <TableHead
          variant="none"
          scope="row"
          className="px-6 py-4 whitespace-nowrap"
        >
          {user.username}
        </TableHead>
        <TableCell variant="none" className="px-6 py-4">
          {titleCase(user.role)}
        </TableCell>
        <TableCell variant="none" className="px-6 py-4">
          {user.lastUpdatedAt}
        </TableCell>
      </TableRow>
    </>
  );
}

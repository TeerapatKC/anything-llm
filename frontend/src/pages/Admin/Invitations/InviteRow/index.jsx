import { useEffect, useRef, useState } from "react";
import { titleCase } from "text-case";
import Admin from "@/models/admin";
import { Trash } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";

export default function InviteRow({ invite }) {
  const rowRef = useRef(null);
  const [status, setStatus] = useState(invite.status);
  const [copied, setCopied] = useState(false);
  const handleDelete = async () => {
    if (
      !window.confirm(
        `Are you sure you want to deactivate this invite?\nAfter you do this it will not longer be useable.\n\nThis action is irreversible.`
      )
    )
      return false;
    if (rowRef?.current) {
      rowRef.current.children[0].innerText = "Disabled";
    }
    setStatus("disabled");
    await Admin.disableInvite(invite.id);
  };
  const copyInviteLink = () => {
    if (!invite) return false;
    window.navigator.clipboard.writeText(
      `${window.location.origin}/accept-invite/${invite.code}`
    );
    setCopied(true);
  };

  useEffect(() => {
    function resetStatus() {
      if (!copied) return false;
      setTimeout(() => {
        setCopied(false);
      }, 3000);
    }
    resetStatus();
  }, [copied]);

  return (
    <>
      <TableRow
        variant="none"
        ref={rowRef}
        className="bg-transparent text-white text-opacity-80 text-xs font-medium border-b border-white/10 h-10"
      >
        <TableCell
          variant="none"
          scope="row"
          className="px-6 whitespace-nowrap"
        >
          {titleCase(status)}
        </TableCell>
        <TableCell variant="none" className="px-6">
          {invite.claimedBy
            ? invite.claimedBy?.username || "deleted user"
            : "--"}
        </TableCell>
        <TableCell variant="none" className="px-6">
          {invite.createdBy?.username || "deleted user"}
        </TableCell>
        <TableCell variant="none" className="px-6">
          {invite.createdAt}
        </TableCell>
        <TableCell
          variant="none"
          className="px-6 flex items-center gap-x-6 h-full mt-1"
        >
          {status === "pending" && (
            <>
              <button
                onClick={copyInviteLink}
                disabled={copied}
                className="text-xs font-medium text-blue-300 rounded-lg hover:text-blue-400 hover:underline"
              >
                {copied ? "Copied" : "Copy Invite Link"}
              </button>
              <Button variant="danger" onClick={handleDelete}>
                <Trash className="h-5 w-5" />
              </Button>
            </>
          )}
        </TableCell>
      </TableRow>
    </>
  );
}

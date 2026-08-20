import { useEffect, useRef, useState } from "react";
import { titleCase } from "text-case";
import Admin from "@/models/admin";
import { Copy, Trash2 } from "lucide-react";
import { TableCell, TableRow } from "@/components/ui/table";
import ConfirmDialog from "@/components/ConfirmDialog";
import TableRowActions from "@/components/lib/TableRowActions";
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

export default function InviteRow({ invite }) {
  const rowRef = useRef(null);
  const [status, setStatus] = useState(invite.status);
  const [copied, setCopied] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const handleDelete = async () => {
    setConfirm({
      title: "Deactivate this invite?",
      description:
        "After you do this it will no longer be usable. This action is irreversible.",
      confirmText: "Deactivate",
      variant: "destructive",
      onConfirm: async () => {
        if (rowRef?.current) {
          rowRef.current.children[0].innerText = "Disabled";
        }
        setStatus("disabled");
        await Admin.disableInvite(invite.id);
      },
    });
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
      <TableRow ref={rowRef}>
        <TableCell scope="row">{titleCase(status)}</TableCell>
        <TableCell>
          {invite.claimedBy
            ? invite.claimedBy?.username || "deleted user"
            : "--"}
        </TableCell>
        <TableCell>{invite.createdBy?.username || "deleted user"}</TableCell>
        <TableCell>{invite.createdAt}</TableCell>
        <TableCell className="text-right">
          <TableRowActions>
            {status === "pending" && (
              <>
                <DropdownMenuItem onClick={copyInviteLink} disabled={copied}>
                  <Copy />
                  {copied ? "Copied" : "Copy invite link"}
                </DropdownMenuItem>
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

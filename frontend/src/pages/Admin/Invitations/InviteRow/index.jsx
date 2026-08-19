import { useEffect, useRef, useState } from "react";
import { titleCase } from "text-case";
import Admin from "@/models/admin";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import ConfirmDialog from "@/components/ConfirmDialog";

export default function InviteRow({ invite }) {
  const rowRef = useRef(null);
  const [status, setStatus] = useState(invite.status);
  const [copied, setCopied] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const handleDelete = async () => {
    setConfirm({
      title: "Deactivate this invite?",
      description:
        "After you do this it will no longer be useable. This action is irreversible.",
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
      <TableRow
        ref={rowRef}
        className="bg-transparent text-theme-text-primary text-opacity-80 text-xs font-medium border-b border-theme-sidebar-border h-10"
      >
        <TableCell scope="row" className="px-6 whitespace-nowrap">
          {titleCase(status)}
        </TableCell>
        <TableCell className="px-6">
          {invite.claimedBy
            ? invite.claimedBy?.username || "deleted user"
            : "--"}
        </TableCell>
        <TableCell className="px-6">
          {invite.createdBy?.username || "deleted user"}
        </TableCell>
        <TableCell className="px-6">{invite.createdAt}</TableCell>
        <TableCell className="px-6 flex items-center gap-x-6 h-full mt-1">
          {status === "pending" && (
            <>
              <button
                onClick={copyInviteLink}
                disabled={copied}
                className="text-xs font-medium text-blue-300 rounded-lg hover:text-blue-400 hover:underline"
              >
                {copied ? "Copied" : "Copy Invite Link"}
              </button>
              <Button variant="destructive" onClick={handleDelete}>
                <Trash2 className="h-5 w-5" />
              </Button>
            </>
          )}
        </TableCell>
      </TableRow>
      <ConfirmDialog config={confirm} onClose={() => setConfirm(null)} />
    </>
  );
}

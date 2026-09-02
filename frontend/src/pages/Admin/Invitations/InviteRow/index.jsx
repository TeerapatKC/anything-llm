import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  const rowRef = useRef(null);
  const [status, setStatus] = useState(invite.status);
  const [copied, setCopied] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const handleDelete = async () => {
    setConfirm({
      title: t("admin-invites.row.delete-title"),
      description: t("admin-invites.row.delete-description"),
      confirmText: t("admin-invites.row.delete-confirm"),
      variant: "destructive",
      onConfirm: async () => {
        if (rowRef?.current) {
          rowRef.current.children[0].innerText = t(
            "admin-invites.row.disabled"
          );
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
        <TableCell>{invite.email || "--"}</TableCell>
        <TableCell>
          {invite.claimedBy
            ? invite.claimedBy?.username || t("admin-invites.deleted-user")
            : "--"}
        </TableCell>
        <TableCell>
          {invite.createdBy?.username || t("admin-invites.deleted-user")}
        </TableCell>
        <TableCell>{invite.createdAt}</TableCell>
        <TableCell className="text-right">
          <TableRowActions>
            {status === "pending" && (
              <>
                <DropdownMenuItem onClick={copyInviteLink} disabled={copied}>
                  <Copy />
                  {copied
                    ? t("admin-invites.row.copied")
                    : t("admin-invites.row.copy")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={handleDelete}>
                  <Trash2 />
                  {t("admin-invites.row.delete")}
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

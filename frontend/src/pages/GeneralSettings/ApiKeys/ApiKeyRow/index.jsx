import { useEffect, useState } from "react";
import Admin from "@/models/admin";
import { Copy, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { TableCell, TableRow } from "@/components/ui/table";
import ConfirmDialog from "@/components/ConfirmDialog";
import TableRowActions from "@/components/lib/TableRowActions";
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

export default function ApiKeyRow({ apiKey, removeApiKey }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const [confirm, setConfirm] = useState(null);

  const handleDelete = async () => {
    setConfirm({
      title: t("api.row.deleteConfirm"),
      confirmText: t("common.delete", "Delete"),
      variant: "destructive",
      onConfirm: async () => {
        await Admin.deleteApiKey(apiKey.id);
        removeApiKey(apiKey.id);
      },
    });
  };

  const copyApiKey = () => {
    if (!apiKey) return false;
    window.navigator.clipboard.writeText(apiKey.secret);
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
      <TableRow>
        <TableCell scope="row">{apiKey.name || t("api.row.unnamed")}</TableCell>
        <TableCell scope="row">
          <code className="font-mono text-[11px] break-all text-theme-text-primary">
            {apiKey.secret}
          </code>
        </TableCell>
        <TableCell className="text-left">
          {apiKey.createdBy?.username || "--"}
        </TableCell>
        <TableCell>{new Date(apiKey.createdAt).toLocaleString()}</TableCell>
        <TableCell className="text-right">
          <TableRowActions>
            <DropdownMenuItem onClick={copyApiKey} disabled={copied}>
              <Copy />
              {copied ? t("api.row.copied") : t("api.row.copy")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={handleDelete}>
              <Trash2 />
              Delete
            </DropdownMenuItem>
          </TableRowActions>
        </TableCell>
      </TableRow>
      <ConfirmDialog config={confirm} onClose={() => setConfirm(null)} />
    </>
  );
}

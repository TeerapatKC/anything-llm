import { useEffect, useState } from "react";
import Admin from "@/models/admin";
import { Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import ConfirmDialog from "@/components/ConfirmDialog";

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
        <TableCell>
          <div className="flex items-center gap-x-6">
            <button
              onClick={copyApiKey}
              disabled={copied}
              className="text-xs font-medium text-blue-300 rounded-lg hover:text-white/60 hover:light:text-blue-500 hover:underline"
            >
              {copied ? t("api.row.copied") : t("api.row.copy")}
            </button>
            <Button variant="destructive" onClick={handleDelete}>
              <Trash2 className="h-5 w-5" />
            </Button>
          </div>
        </TableCell>
      </TableRow>
      <ConfirmDialog config={confirm} onClose={() => setConfirm(null)} />
    </>
  );
}

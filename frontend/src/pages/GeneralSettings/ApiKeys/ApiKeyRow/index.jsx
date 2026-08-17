import { useEffect, useState } from "react";
import Admin from "@/models/admin";
import { Trash } from "@phosphor-icons/react";
import { userFromStorage } from "@/utils/request";
import System from "@/models/system";
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
        const user = userFromStorage();
        const Model = !!user ? Admin : System;
        await Model.deleteApiKey(apiKey.id);
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
      <TableRow
        variant="none"
        className="bg-transparent text-white text-opacity-80 text-xs font-medium border-b border-white/10"
      >
        <TableCell
          variant="none"
          scope="row"
          className="px-6 py-3 whitespace-nowrap align-middle"
        >
          {apiKey.name || t("api.row.unnamed")}
        </TableCell>
        <TableCell
          variant="none"
          scope="row"
          className="px-6 py-3 align-middle"
        >
          <code className="font-mono text-[11px] break-all text-theme-text-primary">
            {apiKey.secret}
          </code>
        </TableCell>
        <TableCell variant="none" className="px-6 py-3 text-left align-middle">
          {apiKey.createdBy?.username || "--"}
        </TableCell>
        <TableCell
          variant="none"
          className="px-6 py-3 whitespace-nowrap align-middle"
        >
          {new Date(apiKey.createdAt).toLocaleString()}
        </TableCell>
        <TableCell variant="none" className="px-6 py-3 align-middle">
          <div className="flex items-center gap-x-6">
            <button
              onClick={copyApiKey}
              disabled={copied}
              className="text-xs font-medium text-blue-300 rounded-lg hover:text-white hover:light:text-blue-500 hover:text-opacity-60 hover:underline"
            >
              {copied ? t("api.row.copied") : t("api.row.copy")}
            </button>
            <Button variant="danger" onClick={handleDelete}>
              <Trash className="h-5 w-5" />
            </Button>
          </div>
        </TableCell>
      </TableRow>
      <ConfirmDialog config={confirm} onClose={() => setConfirm(null)} />
    </>
  );
}

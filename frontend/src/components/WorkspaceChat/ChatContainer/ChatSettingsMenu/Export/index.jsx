import { useTranslation } from "react-i18next";
import { saveAs } from "file-saver";
import Workspace from "@/models/workspace";
import showToast from "@/utils/toast";
import moment from "moment";
import { useState } from "react";
import {
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

const EXPORT_FORMATS = [
  { key: "pdf", label: "PDF", ext: "pdf" },
  { key: "markdown", label: "Markdown", ext: "md" },
  { key: "plaintext", label: "Plain Text", ext: "txt" },
  { key: "json", label: "JSON", ext: "json" },
  { key: "html", label: "HTML", ext: "html" },
];

export default function ExportRow({
  history = [],
  workspace = null,
  threadSlug = null,
}) {
  const { t } = useTranslation();
  const [exporting, setExporting] = useState(false);

  async function handleExport(format) {
    if (exporting || !workspace?.slug) return;
    setExporting(true);
    const blob = await Workspace.exportChatsToType(
      workspace.slug,
      threadSlug,
      format.key
    );
    if (blob) {
      const stamp = moment().format("YYYY-MM-DD HH:mm:ss");
      saveAs(blob, `NexusAI Export - ${stamp}.${format.ext}`);
    } else {
      showToast("Failed to export chat.", "error");
    }
    setExporting(false);
  }

  if (history.length === 0) return null;
  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger disabled={exporting}>
        {exporting ? t("chat_window.exporting") : t("chat_window.export")}
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent>
        {EXPORT_FORMATS.map((format) => (
          <DropdownMenuItem
            key={format.key}
            disabled={exporting}
            onClick={() => handleExport(format)}
          >
            {format.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}

import { useRef, useState } from "react";
import BrowserExtensionApiKey from "@/models/browserExtensionApiKey";
import showToast from "@/utils/toast";
import { Check, Copy, Plug, Trash2 } from "lucide-react";
import { POPUP_BROWSER_EXTENSION_EVENT } from "@/utils/constants";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import ConfirmDialog from "@/components/ConfirmDialog";

export default function BrowserExtensionApiKeyRow({
  apiKey,
  removeApiKey,
  connectionString,
}) {
  const rowRef = useRef(null);
  const [copied, setCopied] = useState(false);
  const [confirm, setConfirm] = useState(null);

  const handleRevoke = async () => {
    setConfirm({
      title: "Revoke this API key?",
      description:
        "After revoking it will no longer be useable. This action is irreversible.",
      confirmText: "Revoke",
      variant: "destructive",
      onConfirm: async () => {
        const result = await BrowserExtensionApiKey.revoke(apiKey.id);
        if (result.success) {
          removeApiKey(apiKey.id);
          showToast("Browser Extension API Key permanently revoked", "info", {
            clear: true,
          });
        } else {
          showToast("Failed to revoke API Key", "error", { clear: true });
        }
      },
    });
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(connectionString);
    showToast("Connection string copied to clipboard", "success", {
      clear: true,
    });
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleConnect = () => {
    // Sending a message to Chrome extension to pop up the extension window
    // This will open the extension window and attempt to connect with the API key
    window.postMessage(
      { type: POPUP_BROWSER_EXTENSION_EVENT, apiKey: connectionString },
      "*"
    );
    showToast("Attempting to connect to browser extension...", "info", {
      clear: true,
    });
  };

  return (
    <TableRow
      variant="none"
      ref={rowRef}
      className="bg-transparent text-theme-text-primary text-opacity-80 text-xs font-medium border-b border-theme-sidebar-border h-10"
    >
      <TableCell
        variant="none"
        scope="row"
        className="px-6 py-2 whitespace-nowrap"
      >
        <div className="flex items-center">
          <span className="mr-2 font-mono">{connectionString}</span>
          <div className="flex items-center space-x-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleCopy}
                  className="border-none text-theme-text-primary hover:text-theme-text-secondary transition-colors duration-200 p-1 rounded"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[250px] text-xs">
                Copy connection string
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleConnect}
                  className="border-none text-theme-text-primary hover:text-theme-text-secondary transition-colors duration-200 p-1 rounded"
                >
                  <Plug className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[250px] text-xs">
                Automatically connect to extension
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </TableCell>
      <TableCell variant="none" className="px-6 py-2">
        {apiKey.user ? apiKey.user.username : "N/A"}
      </TableCell>
      <TableCell variant="none" className="px-6 py-2">
        {new Date(apiKey.createdAt).toLocaleString()}
      </TableCell>
      <TableCell variant="none" className="px-6 py-2">
        <Button variant="danger" onClick={handleRevoke}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </TableCell>
      <ConfirmDialog config={confirm} onClose={() => setConfirm(null)} />
    </TableRow>
  );
}

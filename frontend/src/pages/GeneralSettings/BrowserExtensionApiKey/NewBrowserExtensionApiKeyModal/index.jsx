import React, { useEffect, useState } from "react";
import BrowserExtensionApiKey from "@/models/browserExtensionApiKey";
import { fullApiUrl, POPUP_BROWSER_EXTENSION_EVENT } from "@/utils/constants";
import { Button } from "@/components/ui/button";
import {
  DialogClose,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export default function NewBrowserExtensionApiKeyModal({ onSuccess }) {
  const [apiKey, setApiKey] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  const handleCreate = async (e) => {
    setError(null);
    e.preventDefault();

    const { apiKey: newApiKey, error } =
      await BrowserExtensionApiKey.generateKey();
    if (!!newApiKey) {
      const fullApiKey = `${fullApiUrl()}|${newApiKey}`;
      setApiKey(fullApiKey);
      onSuccess();

      window.postMessage(
        { type: POPUP_BROWSER_EXTENSION_EVENT, apiKey: fullApiKey },
        "*"
      );
    }
    setError(error);
  };

  const copyApiKey = () => {
    if (!apiKey) return false;
    window.navigator.clipboard.writeText(apiKey);
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
      <DialogHeader className="p-0">
        <DialogTitle className="text-sm font-semibold">
          New Browser Extension API Key
        </DialogTitle>
      </DialogHeader>
      <form onSubmit={handleCreate}>
        <div className="space-y-4">
          {error && <p className="text-red-400 text-sm">Error: {error}</p>}
          {apiKey && (
            <input
              type="text"
              defaultValue={apiKey}
              disabled={true}
              className="border-none bg-theme-settings-input-bg w-full text-theme-text-primary placeholder:text-theme-settings-input-placeholder text-sm rounded-lg block p-2.5"
            />
          )}
          <p className="text-yellow-300 light:text-orange-500 text-xs md:text-sm font-semibold">
            Warning: this API key will allow access to all workspaces associated
            with your account. Please share it cautiously.
          </p>
          <p className="text-theme-text-primary/60 text-xs md:text-sm">
            After clicking "Create API Key", AnythingLLM will attempt to connect
            to your browser extension automatically.
          </p>
          <p className="text-theme-text-primary/60 text-xs md:text-sm">
            If you see "Connected to AnythingLLM" in the extension, the
            connection was successful. If not, please copy the connection string
            and paste it into the extension manually.
          </p>
        </div>
        <DialogFooter className="p-0 mt-4">
          {!apiKey ? (
            <>
              <DialogClose render={<Button variant="outline" type="button" />}>
                Cancel
              </DialogClose>
              <Button variant="default" type="submit">
                Create API Key
              </Button>
            </>
          ) : (
            <Button
              variant="default"
              onClick={copyApiKey}
              type="button"
              disabled={copied}
              className="w-full"
            >
              {copied ? "API Key Copied!" : "Copy API Key"}
            </Button>
          )}
        </DialogFooter>
      </form>
    </>
  );
}

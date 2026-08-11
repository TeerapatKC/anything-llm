import React, { useEffect, useState } from "react";
import { Copy, Check } from "@phosphor-icons/react";
import Admin from "@/models/admin";
import paths from "@/utils/paths";
import { userFromStorage } from "@/utils/request";
import System from "@/models/system";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  DialogClose,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export default function NewApiKeyModal({ onSuccess }) {
  const { t } = useTranslation();
  const [apiKey, setApiKey] = useState(null);
  const [name, setName] = useState("");
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  const handleCreate = async (e) => {
    setError(null);
    e.preventDefault();
    const user = userFromStorage();
    const Model = !!user ? Admin : System;

    const { apiKey: newApiKey, error } = await Model.generateApiKey({
      name,
    });
    if (!!newApiKey) {
      setApiKey(newApiKey);
      onSuccess();
    }
    setError(error);
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
      <DialogHeader className="p-0">
        <DialogTitle className="text-sm font-semibold">
          {t("api.modal.title")}
        </DialogTitle>
      </DialogHeader>
      <form onSubmit={handleCreate}>
        <div className="space-y-4">
          {error && (
            <p className="text-red-400 text-sm">
              {t("api.messages.error", { error })}
            </p>
          )}
          {!apiKey && (
            <div>
              <Label variant="field" className="block mb-2">
                {t("api.modal.name.label")}
              </Label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("api.modal.name.placeholder")}
                className="border-none bg-theme-settings-input-bg text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg outline-none block w-full p-2.5"
              />
              <p className="text-white text-opacity-60 text-xs md:text-sm mt-2">
                {t("api.modal.name.helper")}
              </p>
            </div>
          )}
          {apiKey && (
            <div className="relative">
              <input
                type="text"
                defaultValue={`${apiKey.secret}`}
                disabled={true}
                className="border-none bg-theme-settings-input-bg text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg outline-none block w-full p-2.5 pr-10"
              />
              <button
                type="button"
                onClick={copyApiKey}
                disabled={copied}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-theme-modal-border transition-all duration-300"
              >
                {copied ? (
                  <Check size={20} className="text-green-400" weight="bold" />
                ) : (
                  <Copy size={20} className="text-white" weight="bold" />
                )}
              </button>
            </div>
          )}
          <p className="text-white text-opacity-60 text-xs md:text-sm">
            {t("api.modal.helper")}
          </p>
          <a
            href={paths.apiDocs()}
            target="_blank"
            rel="noreferrer"
            className="text-blue-400 hover:underline"
          >
            Read the API documentation &rarr;
          </a>
        </div>
        <DialogFooter className="p-0 mt-4">
          {!apiKey ? (
            <>
              <DialogClose asChild>
                <Button variant="outline" type="button">
                  {t("api.modal.cancel")}
                </Button>
              </DialogClose>
              <Button variant="default" type="submit">
                {t("api.modal.create")}
              </Button>
            </>
          ) : (
            <DialogClose asChild>
              <Button variant="default" type="button">
                {t("api.modal.close")}
              </Button>
            </DialogClose>
          )}
        </DialogFooter>
      </form>
    </>
  );
}

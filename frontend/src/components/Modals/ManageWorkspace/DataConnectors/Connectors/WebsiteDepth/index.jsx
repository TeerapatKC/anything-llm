import React, { useState } from "react";
import System from "@/models/system";
import showToast from "@/utils/toast";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

function normalizeWebsiteUrl(value) {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) return null;
  const candidate = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  try {
    const url = new URL(candidate);
    return ["http:", "https:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

export default function WebsiteDepthOptions({ workspace, canCrawl = true }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [includeLinkedPages, setIncludeLinkedPages] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const form = new FormData(e.target);
    const url = normalizeWebsiteUrl(form.get("url"));
    if (!url) {
      showToast(t("connectors.website-depth.invalid-url"), "error");
      return;
    }

    try {
      setLoading(true);
      showToast(t("connectors.website-depth.importing"), "info", {
        clear: true,
        autoClose: false,
      });

      const { data, error } = await System.dataConnectors.websiteDepth.scrape({
        url,
        workspaceSlug: workspace.slug,
        depth: includeLinkedPages && canCrawl ? parseInt(form.get("depth")) : 0,
        maxLinks:
          includeLinkedPages && canCrawl ? parseInt(form.get("maxLinks")) : 1,
      });

      if (!!error) {
        showToast(error, "error", { clear: true });
        setLoading(false);
        return;
      }

      if (!data?.length) {
        showToast(t("connectors.website-depth.empty"), "error", {
          clear: true,
        });
        setLoading(false);
        return;
      }

      showToast(
        t("connectors.website-depth.success", { count: data.length }),
        "success",
        {
          clear: true,
        }
      );
      e.target.reset();
      setLoading(false);
    } catch (e) {
      console.error(e);
      showToast(e.message, "error", { clear: true });
      setLoading(false);
    }
  };

  return (
    <div className="flex w-full">
      <div className="flex flex-col w-full px-1 md:pb-6 pb-16">
        <form className="w-full" onSubmit={handleSubmit}>
          <div className="w-full flex flex-col py-2">
            <div className="w-full flex flex-col gap-4">
              <div className="flex flex-col gap-y-2">
                <Label>{t("connectors.website-depth.import-scope")}</Label>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    aria-pressed={!includeLinkedPages || !canCrawl}
                    onClick={() => setIncludeLinkedPages(false)}
                    className={cn(
                      "rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                      !includeLinkedPages || !canCrawl
                        ? "border-primary bg-primary/10 text-theme-text-primary"
                        : "border-theme-modal-border text-theme-text-secondary hover:text-theme-text-primary"
                    )}
                  >
                    {t("connectors.website-depth.single-page")}
                  </button>
                  {canCrawl && (
                    <button
                      type="button"
                      aria-pressed={includeLinkedPages}
                      onClick={() => setIncludeLinkedPages(true)}
                      className={cn(
                        "rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                        includeLinkedPages
                          ? "border-primary bg-primary/10 text-theme-text-primary"
                          : "border-theme-modal-border text-theme-text-secondary hover:text-theme-text-primary"
                      )}
                    >
                      {t("connectors.website-depth.linked-pages")}
                    </button>
                  )}
                </div>
              </div>
              <div className="flex flex-col pr-10">
                <div className="flex flex-col gap-y-1 mb-4">
                  <Label>{t("connectors.website-depth.URL")}</Label>
                  <p className="text-xs font-normal text-theme-text-secondary">
                    {t("connectors.website-depth.URL_explained")}
                  </p>
                </div>
                <Input
                  type="text"
                  inputMode="url"
                  name="url"
                  placeholder="https://example.com"
                  required={true}
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>
              {includeLinkedPages && canCrawl && (
                <div className="flex flex-col pr-10">
                  <div className="flex flex-col gap-y-1 mb-4">
                    <Label> {t("connectors.website-depth.depth")}</Label>
                    <p className="text-xs font-normal text-theme-text-secondary">
                      {t("connectors.website-depth.depth_explained")}
                    </p>
                  </div>
                  <Input
                    type="number"
                    name="depth"
                    min="1"
                    max="5"
                    required={true}
                    defaultValue="1"
                  />
                </div>
              )}
              {includeLinkedPages && canCrawl && (
                <div className="flex flex-col pr-10">
                  <div className="flex flex-col gap-y-1 mb-4">
                    <Label>{t("connectors.website-depth.max_pages")}</Label>
                    <p className="text-xs font-normal text-theme-text-secondary">
                      {t("connectors.website-depth.max_pages_explained")}
                    </p>
                  </div>
                  <Input
                    type="number"
                    name="maxLinks"
                    min="1"
                    required={true}
                    defaultValue="20"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-y-2 w-full pr-10">
            <Button variant="default" type="submit" disabled={loading}>
              {loading
                ? t("connectors.website-depth.importing")
                : includeLinkedPages && canCrawl
                  ? t("connectors.website-depth.import-linked")
                  : t("connectors.website-depth.import-single")}
            </Button>
            {loading && (
              <p className="text-xs text-theme-text-secondary">
                {t("connectors.website-depth.task_explained")}
              </p>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

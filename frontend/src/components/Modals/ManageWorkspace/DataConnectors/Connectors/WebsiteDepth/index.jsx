import React, { useState } from "react";
import System from "@/models/system";
import showToast from "@/utils/toast";
import pluralize from "pluralize";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export default function WebsiteDepthOptions() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const form = new FormData(e.target);

    try {
      setLoading(true);
      showToast("Scraping website - this may take a while.", "info", {
        clear: true,
        autoClose: false,
      });

      const { data, error } = await System.dataConnectors.websiteDepth.scrape({
        url: form.get("url"),
        depth: parseInt(form.get("depth")),
        maxLinks: parseInt(form.get("maxLinks")),
      });

      if (!!error) {
        showToast(error, "error", { clear: true });
        setLoading(false);
        return;
      }

      showToast(
        `Successfully scraped ${data.length} ${pluralize(
          "page",
          data.length
        )}!`,
        "success",
        { clear: true }
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
              <div className="flex flex-col pr-10">
                <div className="flex flex-col gap-y-1 mb-4">
                  <Label>{t("connectors.website-depth.URL")}</Label>
                  <p className="text-xs font-normal text-theme-text-secondary">
                    {t("connectors.website-depth.URL_explained")}
                  </p>
                </div>
                <Input
                  type="url"
                  name="url"
                  placeholder="https://example.com"
                  required={true}
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>
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
            </div>
          </div>

          <div className="flex flex-col gap-y-2 w-full pr-10">
            <Button variant="default" type="submit" disabled={loading}>
              {loading ? "Scraping website..." : "Submit"}
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

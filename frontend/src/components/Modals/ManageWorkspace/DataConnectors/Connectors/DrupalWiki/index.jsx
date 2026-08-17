/**
 * Copyright 2024
 *
 * Authors:
 *  - Eugen Mayer (KontextWork)
 */

import { useState } from "react";
import System from "@/models/system";
import showToast from "@/utils/toast";
import { AlertTriangle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export default function DrupalWikiOptions() {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const form = new FormData(e.target);

    try {
      setLoading(true);
      showToast(
        "Fetching all pages for the given Drupal Wiki spaces - this may take a while.",
        "info",
        {
          clear: true,
          autoClose: false,
        }
      );
      const { data, error } = await System.dataConnectors.drupalwiki.collect({
        baseUrl: form.get("baseUrl"),
        spaceIds: form.get("spaceIds"),
        accessToken: form.get("accessToken"),
      });

      if (!!error) {
        showToast(error, "error", { clear: true });
        setLoading(false);
        return;
      }

      showToast(
        `Pages collected from Drupal Wiki spaces ${data.spaceIds}. Output folder is ${data.destination}.`,
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
                  <Label variant="bold" className="flex gap-x-2 items-center">
                    <p className="font-bold text-white">Drupal Wiki base URL</p>
                  </Label>
                  <p className="text-xs font-normal text-theme-text-secondary">
                    This is the base URL of your&nbsp;
                    <a
                      href="https://drupal-wiki.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline"
                    >
                      Drupal Wiki
                    </a>
                    .
                  </p>
                </div>
                <Input
                  variant="settings"
                  type="url"
                  name="baseUrl"
                  placeholder="eg: https://mywiki.drupal-wiki.net, https://drupalwiki.mycompany.tld, etc..."
                  required={true}
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>
              <div className="flex flex-col pr-10">
                <div className="flex flex-col gap-y-1 mb-4">
                  <Label variant="bold">Drupal Wiki Space IDs</Label>
                  <p className="text-xs font-normal text-theme-text-secondary">
                    Comma separated Space IDs you want to extract. See the&nbsp;
                    <a
                      href="https://help.drupal-wiki.com/node/606"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      manual
                    </a>
                    &nbsp; on how to retrieve the Space IDs. Be sure that your
                    'API-Token User' has access to those spaces.
                  </p>
                </div>
                <Input
                  variant="settings"
                  type="text"
                  name="spaceIds"
                  placeholder="eg: 12,34,69"
                  required={true}
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>
              <div className="flex flex-col pr-10">
                <div className="flex flex-col gap-y-1 mb-4">
                  <Label variant="bold" className="flex gap-x-2 items-center">
                    <p className="font-bold text-white">
                      Drupal Wiki API Token
                    </p>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <AlertTriangle className="ml-1 h-3.5 w-3.5 text-orange-500 cursor-pointer" />
                      </TooltipTrigger>
                      <TooltipContent
                        side="right"
                        className="max-w-[250px] text-xs"
                      >
                        <p className="text-sm font-light text-theme-text-primary">
                          You need to provide an API token for authentication.
                          See the Drupal Wiki&nbsp;
                          <a
                            href="https://help.drupal-wiki.com/node/605#2-Zugriffs-Token-generieren"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline"
                          >
                            manual
                          </a>
                          &nbsp;on how to generate an API-Token for your user.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </Label>
                  <p className="text-xs font-normal text-theme-text-secondary">
                    Access token for authentication.
                  </p>
                </div>
                <Input
                  variant="settings"
                  type="password"
                  name="accessToken"
                  placeholder="pat:123"
                  required={true}
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-y-2 w-full pr-10">
            <Button variant="homePrimary" type="submit" disabled={loading}>
              {loading ? "Collecting pages..." : "Submit"}
            </Button>
            {loading && (
              <p className="text-xs text-theme-text-secondary">
                Once complete, all pages will be available for embedding into
                workspaces.
              </p>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

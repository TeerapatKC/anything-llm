import { useState } from "react";
import { useTranslation } from "react-i18next";
import System from "@/models/system";
import showToast from "@/utils/toast";
import { AlertTriangle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import Toggle from "@/components/lib/Toggle";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function ConfluenceOptions() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [accessType, setAccessType] = useState("username");
  const [isCloud, setIsCloud] = useState(true);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const form = new FormData(e.target);

    try {
      setLoading(true);
      showToast(
        "Fetching all pages for Confluence space - this may take a while.",
        "info",
        {
          clear: true,
          autoClose: false,
        }
      );
      const { data, error } = await System.dataConnectors.confluence.collect({
        baseUrl: form.get("baseUrl"),
        spaceKey: form.get("spaceKey"),
        username: form.get("username"),
        accessToken: form.get("accessToken"),
        cloud: form.get("isCloud") === "true",
        personalAccessToken: form.get("personalAccessToken"),
        bypassSSL: form.get("bypassSSL") === "true",
      });

      if (!!error) {
        showToast(error, "error", { clear: true });
        setLoading(false);
        return;
      }

      showToast(
        `Pages collected from Confluence space ${data.spaceKey}. Output folder is ${data.destination}.`,
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
                    <p className="font-bold text-theme-text-primary">
                      {t("connectors.confluence.deployment_type")}
                    </p>
                  </Label>
                  <p className="text-xs font-normal text-theme-text-secondary">
                    {t("connectors.confluence.deployment_type_explained")}
                  </p>
                </div>
                <Select
                  name="isCloud"
                  required={true}
                  autoComplete="off"
                  spellCheck={false}
                  defaultValue="true"
                  onValueChange={(value) => setIsCloud(value === "true")}
                >
                  <SelectTrigger variant="settings">
                    <SelectValue placeholder="Select an option" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Atlassian Cloud</SelectItem>
                    <SelectItem value="false">Self-hosted</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col pr-10">
                <div className="flex flex-col gap-y-1 mb-4">
                  <Label variant="bold" className="flex gap-x-2 items-center">
                    <p className="font-bold text-theme-text-primary">
                      {t("connectors.confluence.base_url")}
                    </p>
                  </Label>
                  <p className="text-xs font-normal text-theme-text-secondary">
                    {t("connectors.confluence.base_url_explained")}
                  </p>
                </div>
                <Input
                  variant="settings"
                  type="url"
                  name="baseUrl"
                  placeholder="eg: https://example.atlassian.net, http://localhost:8211, etc..."
                  required={true}
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>
              <div className="flex flex-col pr-10">
                <div className="flex flex-col gap-y-1 mb-4">
                  <Label variant="bold">
                    {t("connectors.confluence.space_key")}
                  </Label>
                  <p className="text-xs font-normal text-theme-text-secondary">
                    {t("connectors.confluence.space_key_explained")}
                  </p>
                </div>
                <Input
                  variant="settings"
                  type="text"
                  name="spaceKey"
                  placeholder="eg: ~7120208c08555d52224113949698b933a3bb56"
                  required={true}
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>
              <div className="flex flex-col pr-10">
                <div className="flex flex-col gap-y-1 mb-4">
                  <Label variant="bold">
                    {t("connectors.confluence.auth_type")}
                  </Label>
                  <p className="text-xs font-normal text-theme-text-secondary">
                    {t("connectors.confluence.auth_type_explained")}
                  </p>
                </div>
                <Select
                  name="accessType"
                  defaultValue={accessType}
                  onValueChange={setAccessType}
                >
                  <SelectTrigger className="border-none bg-theme-settings-input-bg w-fit mt-2 px-4 border-gray-500 text-theme-text-primary text-sm rounded-lg py-2">
                    <SelectValue placeholder="Select an option" />
                  </SelectTrigger>
                  <SelectContent>
                    {[
                      {
                        name: t("connectors.confluence.auth_type_username"),
                        value: "username",
                      },
                      {
                        name: t("connectors.confluence.auth_type_personal"),
                        value: "personalToken",
                      },
                    ].map((type) => {
                      return (
                        <SelectItem key={type.value} value={type.value}>
                          {type.name}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              {accessType === "username" && (
                <>
                  <div className="flex flex-col pr-10">
                    <div className="flex flex-col gap-y-1 mb-4">
                      <Label variant="bold">
                        {t("connectors.confluence.username")}
                      </Label>
                      <p className="text-xs font-normal text-theme-text-secondary">
                        {t("connectors.confluence.username_explained")}
                      </p>
                    </div>
                    <Input
                      variant="settings"
                      type="text"
                      name="username"
                      placeholder="jdoe@example.com"
                      required={true}
                      autoComplete="off"
                      spellCheck={false}
                    />
                  </div>
                  <div className="flex flex-col pr-10">
                    <div className="flex flex-col gap-y-1 mb-4">
                      <Label
                        variant="bold"
                        className="flex gap-x-2 items-center"
                      >
                        <p className="font-bold text-theme-text-primary">
                          {t("connectors.confluence.token")}
                        </p>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <AlertTriangle className="ml-1 h-3.5 w-3.5 text-orange-500 cursor-pointer" />
                          </TooltipTrigger>
                          <TooltipContent
                            side="right"
                            className="max-w-[250px] text-xs"
                          >
                            <p className="text-sm">
                              {t("connectors.confluence.token_explained_start")}
                              <a
                                href="https://id.atlassian.com/manage-profile/security/api-tokens"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="underline"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {t(
                                  "connectors.confluence.token_explained_link"
                                )}
                              </a>
                              .
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </Label>
                      <p className="text-xs font-normal text-theme-text-secondary">
                        {t("connectors.confluence.token_desc")}
                      </p>
                    </div>
                    <Input
                      variant="settings"
                      type="password"
                      name="accessToken"
                      placeholder="abcd1234"
                      required={true}
                      autoComplete="off"
                      spellCheck={false}
                    />
                  </div>
                </>
              )}
              {accessType === "personalToken" && (
                <div className="flex flex-col pr-10">
                  <div className="flex flex-col gap-y-1 mb-4">
                    <Label variant="bold">
                      {t("connectors.confluence.pat_token")}
                    </Label>
                    <p className="text-xs font-normal text-theme-text-secondary">
                      {t("connectors.confluence.pat_token_explained")}
                    </p>
                  </div>
                  <Input
                    variant="settings"
                    type="password"
                    name="personalAccessToken"
                    placeholder="abcd1234"
                    required={true}
                    autoComplete="off"
                    spellCheck={false}
                  />
                </div>
              )}
            </div>
          </div>

          {!isCloud && (
            <div className="w-full flex flex-col py-2">
              <div className="w-full flex flex-col gap-4">
                <div className="flex flex-col pr-10">
                  <div className="flex flex-col gap-y-1 mb-4">
                    <Label variant="bold" className="flex gap-x-2 items-center">
                      <Toggle size="md" name="bypassSSL" value="true" />
                      <p className="font-bold text-theme-text-primary">
                        {t("connectors.confluence.bypass_ssl")}
                      </p>
                    </Label>
                    <p className="text-xs font-normal text-theme-text-secondary">
                      {t("connectors.confluence.bypass_ssl_explained")}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-y-2 w-full pr-10">
            <Button variant="homePrimary" type="submit" disabled={loading}>
              {loading ? "Collecting pages..." : "Submit"}
            </Button>
            {loading && (
              <p className="text-xs text-theme-text-secondary">
                {t("connectors.confluence.task_explained")}
              </p>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

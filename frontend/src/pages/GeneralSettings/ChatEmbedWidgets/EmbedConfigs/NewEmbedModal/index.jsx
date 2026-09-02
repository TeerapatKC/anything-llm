import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import Workspace from "@/models/workspace";
import { TagsInput } from "react-tag-input-component";
import Embed from "@/models/embed";
import Toggle from "@/components/lib/Toggle";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DialogClose,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export function enforceSubmissionSchema(form) {
  const data = {};
  for (var [key, value] of form.entries()) {
    if (!value || value === null) continue;
    data[key] = value;
    if (value === "on") data[key] = true;
  }

  // Always set value on nullable keys since empty or off will not send anything from form element.
  if (!data.hasOwnProperty("allowlist_domains")) data.allowlist_domains = null;
  if (!data.hasOwnProperty("allow_model_override"))
    data.allow_model_override = false;
  if (!data.hasOwnProperty("allow_temperature_override"))
    data.allow_temperature_override = false;
  if (!data.hasOwnProperty("allow_prompt_override"))
    data.allow_prompt_override = false;
  if (!data.hasOwnProperty("message_limit")) data.message_limit = 20;
  return data;
}

export default function NewEmbedModal() {
  const { t } = useTranslation();
  const [error, setError] = useState(null);

  const handleCreate = async (e) => {
    setError(null);
    e.preventDefault();
    const form = new FormData(e.target);
    const data = enforceSubmissionSchema(form);
    const { embed, error } = await Embed.newEmbed(data);
    if (!!embed) window.location.reload();
    setError(error);
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-sm font-semibold">
          Create new embed for workspace
        </DialogTitle>
      </DialogHeader>
      <form onSubmit={handleCreate}>
        <div className="space-y-4">
          <WorkspaceSelection />
          <ChatModeSelection />
          <PermittedDomains />
          <NumberInput
            name="max_chats_per_day"
            title={t("embeds.modal.max-chats-day")}
            hint={t("embeds.modal.max-chats-day-hint")}
          />
          <NumberInput
            name="max_chats_per_session"
            title={t("embeds.modal.max-chats-session")}
            hint={t("embeds.modal.max-chats-session-hint")}
          />
          <NumberInput
            name="message_limit"
            title={t("embeds.modal.message-limit")}
            hint={t("embeds.modal.message-limit-hint")}
            defaultValue={20}
          />
          <BooleanInput
            name="allow_model_override"
            title={t("embeds.modal.model-override")}
            hint={t("embeds.modal.model-override-hint")}
          />
          <BooleanInput
            name="allow_temperature_override"
            title={t("embeds.modal.temperature-override")}
            hint={t("embeds.modal.temperature-override-hint")}
          />
          <BooleanInput
            name="allow_prompt_override"
            title={t("embeds.modal.prompt-override")}
            hint={t("embeds.modal.prompt-override-hint")}
          />

          {error && (
            <p className="text-red-400 text-sm">
              {t("embeds.modal.error", { error })}
            </p>
          )}
          <p className="text-theme-text-primary/60 text-xs md:text-sm">
            {t("help.new-embed-modal")}
            <code className="light:bg-stone-300 bg-stone-900 text-theme-text-primary mx-1 px-1 rounded-sm">
              &lt;script&gt;
            </code>{" "}
            tag.
          </p>
        </div>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" type="button" />}>
            Cancel
          </DialogClose>
          <Button variant="default" type="submit">
            Create embed
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}

export const WorkspaceSelection = ({ defaultValue = null }) => {
  const { t } = useTranslation();
  const [workspaces, setWorkspaces] = useState([]);
  useEffect(() => {
    async function fetchWorkspaces() {
      const _workspaces = await Workspace.all();
      setWorkspaces(_workspaces);
    }
    fetchWorkspaces();
  }, []);

  return (
    <div>
      <div className="flex flex-col mb-2">
        <Label htmlFor="workspace_id" className="block">
          Workspace
        </Label>
        <p className="text-theme-text-secondary text-xs">
          {t("help.new-embed-modal-2")}
        </p>
      </div>
      <Select name="workspace_id" required={true} defaultValue={defaultValue}>
        <SelectTrigger className="min-w-60 rounded-lg bg-theme-settings-input-bg px-4 py-2 text-sm text-theme-text-primary focus:ring-blue-500 focus:border-blue-500">
          <SelectValue placeholder={t("ui.select-option")} />
        </SelectTrigger>
        <SelectContent>
          {workspaces.map((workspace) => {
            return (
              <SelectItem key={workspace.id} value={workspace.id}>
                {workspace.name}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
};

export const ChatModeSelection = ({ defaultValue = null }) => {
  const { t } = useTranslation();
  const [chatMode, setChatMode] = useState(defaultValue ?? "query");

  return (
    <div>
      <div className="flex flex-col mb-2">
        <Label className="block" htmlFor="chat_mode">
          Allowed chat method
        </Label>
        <p className="text-theme-text-secondary text-xs">
          {t("help.new-embed-modal-3")}
          <br />
          {t("help.new-embed-modal-4")}
        </p>
      </div>
      <div className="mt-2 gap-y-3 flex flex-col">
        <label
          className={`transition-all duration-300 w-full h-11 p-2.5 rounded-lg flex justify-start items-center gap-2.5 cursor-pointer border ${
            chatMode === "chat"
              ? "border-theme-sidebar-item-workspace-active bg-theme-bg-secondary"
              : "border-theme-sidebar-border hover:border-theme-sidebar-border hover:bg-theme-bg-secondary"
          } `}
        >
          <input
            type="radio"
            name="chat_mode"
            value={"chat"}
            checked={chatMode === "chat"}
            onChange={(e) => setChatMode(e.target.value)}
            className="hidden"
          />
          <div
            className={`w-4 h-4 rounded-full border-2 border-theme-sidebar-border mr-2 ${
              chatMode === "chat"
                ? "bg-(--theme-sidebar-item-workspace-active)"
                : ""
            }`}
          ></div>
          <div className="text-theme-text-primary text-sm font-medium font-['Plus Jakarta Sans'] leading-tight">
            Chat: Respond to all questions regardless of context
          </div>
        </label>
        <label
          className={`transition-all duration-300 w-full h-11 p-2.5 rounded-lg flex justify-start items-center gap-2.5 cursor-pointer border ${
            chatMode === "query"
              ? "border-theme-sidebar-item-workspace-active bg-theme-bg-secondary"
              : "border-theme-sidebar-border hover:border-theme-sidebar-border hover:bg-theme-bg-secondary"
          } `}
        >
          <input
            type="radio"
            name="chat_mode"
            value={"query"}
            checked={chatMode === "query"}
            onChange={(e) => setChatMode(e.target.value)}
            className="hidden"
          />
          <div
            className={`w-4 h-4 rounded-full border-2 border-theme-sidebar-border mr-2 ${
              chatMode === "query"
                ? "bg-(--theme-sidebar-item-workspace-active)"
                : ""
            }`}
          ></div>
          <div className="text-theme-text-primary text-sm font-medium font-['Plus Jakarta Sans'] leading-tight">
            Query: Only respond to chats related to documents in workspace
          </div>
        </label>
      </div>
    </div>
  );
};

export const PermittedDomains = ({ defaultValue = [] }) => {
  const { t } = useTranslation();
  const [domains, setDomains] = useState(defaultValue);
  const handleChange = (data) => {
    const validDomains = data
      .map((input) => {
        let url = input;
        if (!url.includes("http://") && !url.includes("https://"))
          url = `https://${url}`;
        try {
          new URL(url);
          return url;
        } catch {
          return null;
        }
      })
      .filter((u) => !!u);
    setDomains(validDomains);
  };

  const handleBlur = (event) => {
    const currentInput = event.target.value;
    if (!currentInput) return;

    const validDomains = [...domains, currentInput].map((input) => {
      let url = input;
      if (!url.includes("http://") && !url.includes("https://"))
        url = `https://${url}`;
      try {
        new URL(url);
        return url;
      } catch {
        return null;
      }
    });
    event.target.value = "";
    setDomains(validDomains);
  };

  return (
    <div>
      <div className="flex flex-col mb-2">
        <Label htmlFor="allowlist_domains" className="block">
          Restrict requests from domains
        </Label>
        <p className="text-theme-text-secondary text-xs">
          {t("help.new-embed-modal-5")}
          <br />
          Leaving this empty means anyone can use your embed on any site.
        </p>
      </div>
      <input type="hidden" name="allowlist_domains" value={domains.join(",")} />
      <TagsInput
        value={domains}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder="https://mysite.com, https://anythingllm.com"
        classNames={{
          tag: "bg-theme-settings-input-bg light:bg-black/10 bg-blue-300/10 text-zinc-800",
          input:
            "flex p-1 bg-theme-settings-input-bg! text-theme-text-primary placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none",
        }}
      />
    </div>
  );
};

export const NumberInput = ({ name, title, hint, defaultValue = 0 }) => {
  return (
    <div>
      <div className="flex flex-col mb-2">
        <Label htmlFor={name} className="block">
          {title}
        </Label>
        <p className="text-theme-text-secondary text-xs">{hint}</p>
      </div>
      <input
        type="number"
        name={name}
        className="border-none bg-theme-settings-input-bg text-theme-text-primary placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-60 p-2.5"
        min={0}
        defaultValue={defaultValue}
        onScroll={(e) => e.target.blur()}
      />
    </div>
  );
};

export const BooleanInput = ({ name, title, hint, defaultValue = null }) => {
  const [status, setStatus] = useState(defaultValue ?? false);

  return (
    <Toggle
      name={name}
      size="md"
      variant="horizontal"
      label={title}
      description={hint}
      enabled={status}
      onChange={(checked) => setStatus(checked)}
    />
  );
};

import React, { useState } from "react";
import {
  BooleanInput,
  ChatModeSelection,
  NumberInput,
  PermittedDomains,
  WorkspaceSelection,
  enforceSubmissionSchema,
} from "../../NewEmbedModal";
import Embed from "@/models/embed";
import showToast from "@/utils/toast";
import { safeJsonParse } from "@/utils/request";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  DialogClose,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export default function EditEmbedModal({ embed }) {
  const { t } = useTranslation();
  const [error, setError] = useState(null);

  const handleUpdate = async (e) => {
    setError(null);
    e.preventDefault();
    const form = new FormData(e.target);
    const data = enforceSubmissionSchema(form);
    const { success, error } = await Embed.updateEmbed(embed.id, data);
    if (success) {
      showToast("Embed updated successfully.", "success", { clear: true });
      setTimeout(() => {
        window.location.reload();
      }, 800);
    }
    setError(error);
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-sm font-semibold">
          Update embed #{embed.id}
        </DialogTitle>
      </DialogHeader>
      <form onSubmit={handleUpdate}>
        <div className="space-y-4">
          <WorkspaceSelection defaultValue={embed.workspace.id} />
          <ChatModeSelection defaultValue={embed.chat_mode} />
          <PermittedDomains
            defaultValue={safeJsonParse(embed.allowlist_domains, null) || []}
          />
          <NumberInput
            name="max_chats_per_day"
            title={t("embeds.modal.max-chats-day")}
            hint={t("embeds.modal.max-chats-day-hint")}
            defaultValue={embed.max_chats_per_day}
          />
          <NumberInput
            name="max_chats_per_session"
            title={t("embeds.modal.max-chats-session")}
            hint={t("embeds.modal.max-chats-session-hint")}
            defaultValue={embed.max_chats_per_session}
          />
          <NumberInput
            name="message_limit"
            title={t("embeds.modal.message-limit")}
            hint={t("embeds.modal.message-limit-hint")}
            defaultValue={embed.message_limit}
          />
          <BooleanInput
            name="allow_model_override"
            title={t("embeds.modal.model-override")}
            hint={t("embeds.modal.model-override-hint")}
            defaultValue={embed.allow_model_override}
          />
          <BooleanInput
            name="allow_temperature_override"
            title={t("embeds.modal.temperature-override")}
            hint={t("embeds.modal.temperature-override-hint")}
            defaultValue={embed.allow_temperature_override}
          />
          <BooleanInput
            name="allow_prompt_override"
            title={t("embeds.modal.prompt-override")}
            hint={t("embeds.modal.prompt-override-hint")}
            defaultValue={embed.allow_prompt_override}
          />

          {error && (
            <p className="text-red-400 text-sm">
              {t("embeds.modal.error", { error })}
            </p>
          )}
          <p className="text-theme-text-primary/60 text-xs md:text-sm">
            {t("help.edit-embed-modal")}
            <code className="border-none bg-theme-settings-input-bg text-theme-text-primary mx-1 px-1 rounded-sm">
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
            Update embed
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}

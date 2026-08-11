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
import { Button } from "@/components/ui/button";
import {
  DialogClose,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export default function EditEmbedModal({ embed }) {
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
      <DialogHeader className="p-0">
        <DialogTitle className="text-sm font-semibold">
          Update embed #{embed.id}
        </DialogTitle>
      </DialogHeader>
      <form onSubmit={handleUpdate}>
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
          <WorkspaceSelection defaultValue={embed.workspace.id} />
          <ChatModeSelection defaultValue={embed.chat_mode} />
          <PermittedDomains
            defaultValue={safeJsonParse(embed.allowlist_domains, null) || []}
          />
          <NumberInput
            name="max_chats_per_day"
            title="Max chats per day"
            hint="Limit the amount of chats this embedded chat can process in a 24 hour period. Zero is unlimited."
            defaultValue={embed.max_chats_per_day}
          />
          <NumberInput
            name="max_chats_per_session"
            title="Max chats per session"
            hint="Limit the amount of chats a session user can send with this embed in a 24 hour period. Zero is unlimited."
            defaultValue={embed.max_chats_per_session}
          />
          <NumberInput
            name="message_limit"
            title="Message History Limit"
            hint="The number of previous messages to include in the chat context. Default is 20."
            defaultValue={embed.message_limit}
          />
          <BooleanInput
            name="allow_model_override"
            title="Enable dynamic model use"
            hint="Allow setting of the preferred LLM model to override the workspace default."
            defaultValue={embed.allow_model_override}
          />
          <BooleanInput
            name="allow_temperature_override"
            title="Enable dynamic LLM temperature"
            hint="Allow setting of the LLM temperature to override the workspace default."
            defaultValue={embed.allow_temperature_override}
          />
          <BooleanInput
            name="allow_prompt_override"
            title="Enable Prompt Override"
            hint="Allow setting of the system prompt to override the workspace default."
            defaultValue={embed.allow_prompt_override}
          />

          {error && <p className="text-red-400 text-sm">Error: {error}</p>}
          <p className="text-white text-opacity-60 text-xs md:text-sm">
            After creating an embed you will be provided a link that you can
            publish on your website with a simple
            <code className="border-none bg-theme-settings-input-bg text-white mx-1 px-1 rounded-sm">
              &lt;script&gt;
            </code>{" "}
            tag.
          </p>
        </div>
        <DialogFooter className="p-0 mt-4">
          <DialogClose asChild>
            <Button variant="outline" type="button">
              Cancel
            </Button>
          </DialogClose>
          <Button variant="default" type="submit">
            Update embed
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}

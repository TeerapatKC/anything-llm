import { useRef, useState } from "react";
import WorkspaceLLMSelection from "@/pages/WorkspaceSettings/ChatSettings/WorkspaceLLMSelection";
import ChatModeSelection from "@/pages/WorkspaceSettings/ChatSettings/ChatModeSelection";
import ChatHistorySettings from "@/pages/WorkspaceSettings/ChatSettings/ChatHistorySettings";
import ChatPromptSettings from "@/pages/WorkspaceSettings/ChatSettings/ChatPromptSettings";
import ChatQueryRefusalResponse from "@/pages/WorkspaceSettings/ChatSettings/ChatQueryRefusalResponse";
import ChatTemperatureSettings from "@/pages/WorkspaceSettings/ChatSettings/ChatTemperatureSettings";
import { collectFields, SaveBar } from "./index";

/**
 * The chat settings every private workspace is created with.
 *
 * Field for field the same screen a workspace's own Chat Settings tab shows, because it
 * is literally the same components - the only difference is that what they edit is the
 * profile rather than one workspace, and the prompt has no revision history to offer
 * since no conversation has happened in a template.
 */
export default function ChatDefaults({ workspace, settings, onSave }) {
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const formEl = useRef(null);

  async function handleUpdate(e) {
    e.preventDefault();
    setSaving(true);
    const saved = await onSave(collectFields(formEl.current));
    setSaving(false);
    if (saved) setHasChanges(false);
  }

  if (!workspace) return null;
  return (
    <div className="relative">
      <form
        ref={formEl}
        onSubmit={handleUpdate}
        className="flex w-1/2 flex-col gap-y-[32px]"
      >
        <SaveBar hasChanges={hasChanges} saving={saving} />
        <WorkspaceLLMSelection
          settings={settings}
          workspace={workspace}
          setHasChanges={setHasChanges}
        />
        <ChatModeSelection
          workspace={workspace}
          setHasChanges={setHasChanges}
        />
        <ChatHistorySettings
          workspace={workspace}
          setHasChanges={setHasChanges}
        />
        <ChatPromptSettings
          workspace={workspace}
          setHasChanges={setHasChanges}
          showHistory={false}
        />
        <ChatQueryRefusalResponse
          workspace={workspace}
          setHasChanges={setHasChanges}
        />
        <ChatTemperatureSettings
          settings={settings}
          workspace={workspace}
          setHasChanges={setHasChanges}
        />
      </form>
    </div>
  );
}

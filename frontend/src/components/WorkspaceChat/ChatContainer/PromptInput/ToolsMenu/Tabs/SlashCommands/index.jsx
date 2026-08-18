import { useState, useEffect, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { SlidersHorizontal } from "lucide-react";
import System from "@/models/system";
import Workspace from "@/models/workspace";
import paths from "@/utils/paths";
import useUser from "@/hooks/useUser";
import { WORKSPACE_PERMISSIONS as WS, workspaceCan } from "@/utils/permissions";
import { PROMPT_INPUT_EVENT } from "@/components/WorkspaceChat/ChatContainer/PromptInput";
import useToolsMenuItems from "../../useToolsMenuItems";
import SlashCommandRow from "./SlashCommandRow";

/**
 * Lists the slash commands runnable in this workspace - its own plus the instance-wide
 * built-ins. This menu is read-only on purpose: commands are managed in workspace
 * settings, or in /settings/slash-commands for the built-ins, so that what a command
 * does is a workspace decision rather than something any chatter can redefine.
 */
export default function SlashCommandsTab({
  sendCommand,
  setShowing,
  promptRef,
  highlightedIndex = -1,
  registerItemCount,
  workspace,
}) {
  const { t } = useTranslation();
  const { user } = useUser();
  const [presets, setPresets] = useState([]);
  const [imageGenEnabled, setImageGenEnabled] = useState(false);
  const canManage = workspaceCan(WS.SETTINGS_MANAGE, workspace?.slug, user);

  useEffect(() => {
    async function load() {
      if (!workspace?.slug) return;
      const [presets, settings] = await Promise.all([
        Workspace.slashCommands.all(workspace.slug),
        System.keys(),
      ]);
      setPresets(presets);
      setImageGenEnabled(!!settings?.ImageGenerationProvider);
    }
    load();
  }, [workspace?.slug]);

  const items = useMemo(
    () => [
      {
        command: "/reset",
        description: t("chat_window.preset_reset_description"),
        autoSubmit: true,
      },
      ...(imageGenEnabled
        ? [
            {
              command: "/img",
              description: t("chat_window.preset_img_description"),
              autoSubmit: false,
            },
          ]
        : []),
      ...presets.map((preset) => ({
        command: preset.command,
        description: preset.description,
        autoSubmit: false,
        preset,
      })),
    ],
    [presets, imageGenEnabled, t]
  );

  const handleUseCommand = useCallback(
    (command, autoSubmit = false) => {
      setShowing(false);

      // Auto-submit commands (/reset) fire immediately
      if (autoSubmit) {
        sendCommand({ text: command, autoSubmit: true });
        promptRef?.current?.focus();
        return;
      }

      // Insert the command at the cursor, replacing a trailing "/" if present
      const textarea = promptRef?.current;
      if (!textarea) return;
      const cursor = textarea.selectionStart;
      const value = textarea.value;
      const charBefore = cursor > 0 ? value[cursor - 1] : "";
      const insertStart = charBefore === "/" ? cursor - 1 : cursor;
      const newValue =
        value.slice(0, insertStart) + command + value.slice(cursor);

      window.dispatchEvent(
        new CustomEvent(PROMPT_INPUT_EVENT, {
          detail: { messageContent: newValue },
        })
      );
      textarea.focus();
      const newCursor = insertStart + command.length;
      setTimeout(() => textarea.setSelectionRange(newCursor, newCursor), 0);
    },
    [sendCommand, setShowing, promptRef]
  );

  useToolsMenuItems({
    items,
    highlightedIndex,
    onSelect: (item) => {
      const text = item.autoSubmit ? item.command : `${item.command} `;
      handleUseCommand(text, item.autoSubmit);
    },
    registerItemCount,
  });

  return (
    <>
      {items.map((item, index) => (
        <SlashCommandRow
          key={item.preset?.id ?? item.command}
          command={item.command}
          description={item.description}
          onClick={() =>
            handleUseCommand(
              item.autoSubmit ? item.command : `${item.command} `,
              item.autoSubmit
            )
          }
          highlighted={highlightedIndex === index}
        />
      ))}

      {canManage && workspace?.slug && (
        <Link
          to={paths.workspace.settings.slashCommands(workspace.slug)}
          onClick={() => setShowing(false)}
          className="flex items-center gap-1.5 px-2 py-1 rounded cursor-pointer hover:bg-zinc-700/50 light:hover:bg-slate-100"
        >
          <SlidersHorizontal className="size-3 text-white light:text-slate-900" />
          <span className="text-xs text-white light:text-slate-900">
            Manage slash commands
          </span>
        </Link>
      )}
    </>
  );
}

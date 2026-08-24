import React from "react";
import { Ellipsis, GitFork, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

function ActionMenu({ chatId, forkThread, isEditing, role }) {
  const { t } = useTranslation();

  const handleFork = () => forkThread(chatId);
  const handleDelete = () =>
    window.dispatchEvent(
      new CustomEvent("delete-message", { detail: { chatId } })
    );

  if (!chatId || isEditing || role === "user") return null;

  return (
    <DropdownMenu>
      <div>
        <Tooltip>
          <TooltipTrigger
            render={
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="size-7 text-zinc-400 hover:bg-white/5 hover:text-zinc-200 light:text-slate-500 light:hover:bg-black/5 light:hover:text-slate-700"
                    aria-label={t("chat_window.more_actions")}
                  />
                }
              />
            }
          >
            <Ellipsis className="size-4" />
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[250px] text-xs">
            {t("chat_window.more_actions")}
          </TooltipContent>
        </Tooltip>
      </div>
      <DropdownMenuContent align="start" className="w-40">
        <DropdownMenuItem onClick={handleFork}>
          <GitFork />
          {t("chat_window.fork")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={handleDelete}>
          <Trash2 />
          {t("chat_window.delete")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default ActionMenu;

import React from "react";
import { EllipsisVertical, ListTree, Trash2 } from "lucide-react";
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
      <div className="mt-2 -ml-0.5">
        <Tooltip>
          <TooltipTrigger
            render={
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-zinc-300 light:text-slate-500"
                    aria-label={t("chat_window.more_actions")}
                  />
                }
              />
            }
          >
            <EllipsisVertical />
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[250px] text-xs">
            {t("chat_window.more_actions")}
          </TooltipContent>
        </Tooltip>
      </div>
      <DropdownMenuContent align="start" className="w-40">
        <DropdownMenuItem onClick={handleFork}>
          <ListTree />
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

import { EllipsisVertical } from "lucide-react";
import { useMemoriesContext, LIMITS } from "../MemoriesContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import CardMenu from "./CardMenu";

export default function MemoryCard({ memory }) {
  const {
    activeTab,
    memories,
    handleDelete,
    openEditModal,
    handlePromote,
    handleDemote,
  } = useMemoriesContext();

  const isWorkspace = activeTab === "workspace";
  const canMove = isWorkspace
    ? memories.global.length < LIMITS.global
    : memories.workspace.length < LIMITS.workspace;

  return (
    <div className="relative shrink-0 bg-zinc-900 light:bg-white light:border light:border-slate-300 rounded-lg p-3 flex gap-0.5 items-start">
      <div className="flex-1 min-w-0">
        <p className="text-sm leading-5 text-zinc-50 light:text-slate-900">
          {memory.content}
        </p>
        <p className="text-xs leading-4 text-zinc-400 light:text-slate-500 mt-1.5">
          {new Date(memory.createdAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </p>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              className="shrink-0 text-zinc-400 light:text-slate-400"
              aria-label="Memory actions"
            />
          }
        >
          <EllipsisVertical />
        </DropdownMenuTrigger>
        <CardMenu
          isWorkspace={isWorkspace}
          canMove={canMove}
          onEdit={() => openEditModal(memory)}
          onMove={() => {
            if (isWorkspace) handlePromote(memory.id);
            else handleDemote(memory.id);
          }}
          onDelete={() => handleDelete(memory.id)}
        />
      </DropdownMenu>
    </div>
  );
}

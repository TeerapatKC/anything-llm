import React from "react";
import { ChevronDown, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BLOCK_TYPES, BLOCK_INFO } from "../BlockList";

/**
 * Check if the last configurable block has direct output disabled or undefined
 * If this property is true then you cannot add a new block after it.
 * @param {Array} blocks - The blocks array
 * @returns {Boolean} True if the last configurable block has direct output disabled, false otherwise
 */
function checkIfCanAddBlock(blocks) {
  const lastConfigurableBlock = blocks[blocks.length - 2];
  if (!lastConfigurableBlock) return true;
  return (
    lastConfigurableBlock?.config?.directOutput === false ||
    lastConfigurableBlock?.config?.directOutput === undefined
  );
}

export default function AddBlockMenu({
  blocks,
  showBlockMenu,
  setShowBlockMenu,
  addBlock,
}) {
  if (checkIfCanAddBlock(blocks) === false) return null;
  return (
    <div className="mx-auto mt-4 w-[280px] pb-4">
      <DropdownMenu open={showBlockMenu} onOpenChange={setShowBlockMenu}>
        <DropdownMenuTrigger
          render={<Button variant="outline" size="lg" className="w-full" />}
        >
          <Plus />
          Add Block
          <ChevronDown className="transition-transform duration-300 group-aria-expanded/button:rotate-180" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {Object.entries(BLOCK_INFO).map(
            ([type, info]) =>
              type !== BLOCK_TYPES.START &&
              type !== BLOCK_TYPES.FINISH &&
              type !== BLOCK_TYPES.FLOW_INFO && (
                <DropdownMenuItem
                  key={type}
                  onClick={() => addBlock(type)}
                  className="gap-3 p-2.5"
                >
                  <div className="flex size-7 items-center justify-center rounded-lg bg-white/10">
                    {info.icon}
                  </div>
                  <div className="flex-1 text-left">
                    <div className="text-sm font-medium">{info.label}</div>
                    <div className="text-xs text-muted-foreground">
                      {info.description}
                    </div>
                  </div>
                </DropdownMenuItem>
              )
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

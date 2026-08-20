import React from "react";
import { cn } from "@/lib/utils";

/** Two-letter workspace marker shared by the workspace list and settings. */
export default function WorkspaceMonogram({ name, isActive, className }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex shrink-0 items-center justify-center rounded-md border text-[10px] font-semibold uppercase leading-none transition-colors",
        isActive
          ? "border-transparent bg-sidebar-primary text-sidebar-primary-foreground"
          : "border-sidebar-border bg-sidebar-accent/40 text-sidebar-foreground/70",
        className
      )}
    >
      {name?.slice(0, 2)}
    </span>
  );
}

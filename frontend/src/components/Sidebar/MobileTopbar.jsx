import React from "react";
import { Menu } from "lucide-react";
import { Link } from "react-router-dom";
import useLogo from "@/hooks/useLogo";
import paths from "@/utils/paths";

export default function MobileSidebarTopbar({ onToggle }) {
  const { logo } = useLogo();

  return (
    <div className="min-[1100px]:hidden fixed top-0 inset-x-0 z-40 flex items-center justify-between gap-2 h-14 px-4 bg-theme-bg-sidebar light:bg-white light:border-b light:border-theme-sidebar-border">
      <button
        type="button"
        onClick={onToggle}
        aria-label="Toggle sidebar"
        className="flex h-9 w-9 items-center justify-center rounded-md text-theme-text-secondary hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
      >
        <Menu className="h-5 w-5" />
      </button>
      <Link
        to={paths.home()}
        aria-label="Home"
        className="flex items-center"
      >
        <img
          src={logo}
          alt="Logo"
          className="h-6 w-auto object-contain"
          style={{ maxHeight: "32px" }}
        />
      </Link>
      <div className="h-9 w-9" />
    </div>
  );
}

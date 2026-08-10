import System from "@/models/system";
import paths from "@/utils/paths";
import {
  BookOpen,
  DiscordLogo,
  GithubLogo,
  Briefcase,
  Envelope,
  Globe,
  HouseLine,
  Info,
  LinkSimple,
} from "@phosphor-icons/react";
import React, { useEffect, useState } from "react";
import UserButton from "../UserMenu/UserButton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Link } from "react-router-dom";

export const MAX_ICONS = 3;
export const ICON_COMPONENTS = {
  BookOpen: BookOpen,
  DiscordLogo: DiscordLogo,
  GithubLogo: GithubLogo,
  Envelope: Envelope,
  LinkSimple: LinkSimple,
  HouseLine: HouseLine,
  Globe: Globe,
  Briefcase: Briefcase,
  Info: Info,
};

export default function Footer() {
  const [footerData, setFooterData] = useState(false);

  useEffect(() => {
    async function fetchFooterData() {
      const { footerData } = await System.fetchCustomFooterIcons();
      setFooterData(footerData);
    }
    fetchFooterData();
  }, []);

  // wait for some kind of non-false response from footer data first
  // to prevent pop-in.
  if (footerData === false) return null;

  return (
    <div className="flex flex-col gap-y-2 w-full">
      <div className="flex justify-center group-data-[collapsible=icon]:hidden">
        <div className="flex space-x-4">
          {!Array.isArray(footerData) || footerData.length === 0 ? (
            <>
              <div className="flex w-fit">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link
                      to={paths.github()}
                      target="_blank"
                      rel="noreferrer"
                      className="transition-all duration-300 p-2 rounded-full bg-theme-sidebar-footer-icon hover:bg-theme-sidebar-footer-icon-hover"
                      aria-label="Find us on GitHub"
                    >
                      <GithubLogo
                        weight="fill"
                        className="h-5 w-5 text-white light:text-slate-800"
                      />
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[250px] text-xs">
                    View Source Code
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="flex w-fit">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link
                      to={paths.docs()}
                      target="_blank"
                      rel="noreferrer"
                      className="transition-all duration-300 p-2 rounded-full bg-theme-sidebar-footer-icon hover:bg-theme-sidebar-footer-icon-hover"
                      aria-label="Docs"
                    >
                      <BookOpen
                        weight="fill"
                        className="h-5 w-5 text-white light:text-slate-800"
                      />
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[250px] text-xs">
                    Open AnythingLLM help docs
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="flex w-fit">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link
                      to={paths.discord()}
                      target="_blank"
                      rel="noreferrer"
                      className="transition-all duration-300 p-2 rounded-full bg-theme-sidebar-footer-icon hover:bg-theme-sidebar-footer-icon-hover"
                      aria-label="Join our Discord server"
                    >
                      <DiscordLogo
                        weight="fill"
                        className="h-5 w-5 text-white light:text-slate-800"
                      />
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[250px] text-xs">
                    Join the AnythingLLM Discord
                  </TooltipContent>
                </Tooltip>
              </div>
            </>
          ) : (
            footerData.map((item, index) => (
              <a
                key={index}
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="transition-all duration-300 flex w-fit h-fit p-2 rounded-full bg-theme-sidebar-footer-icon hover:bg-theme-sidebar-footer-icon-hover hover:border-slate-100"
              >
                {React.createElement(
                  ICON_COMPONENTS?.[item.icon] ?? ICON_COMPONENTS.Info,
                  {
                    weight: "fill",
                    className: "h-5 w-5",
                    color: "var(--theme-sidebar-footer-icon-fill)",
                  }
                )}
              </a>
            ))
          )}
        </div>
      </div>
      {/* Full-width profile row. Settings lives in its dropdown menu now,
          rather than as its own footer icon — see UserButton. It collapses to
          just the avatar on its own when a `Sidebar` ancestor is icon-only. */}
      <UserButton />
    </div>
  );
}

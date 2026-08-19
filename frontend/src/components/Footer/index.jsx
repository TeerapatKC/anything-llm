import System from "@/models/system";
import {
  BookOpen,
  Briefcase,
  Globe,
  House,
  Info,
  Link as LinkIcon,
  Mail,
} from "lucide-react";
import { DiscordLogo, GithubLogo } from "@phosphor-icons/react";
import React, { useEffect, useState } from "react";
import UserButton from "../UserMenu/UserButton";

export const MAX_ICONS = 3;
export const ICON_COMPONENTS = {
  BookOpen: BookOpen,
  DiscordLogo: DiscordLogo,
  GithubLogo: GithubLogo,
  Mail: Mail,
  Link: LinkIcon,
  House: House,
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
      <div className="flex justify-center group-data-[collapsible=icon]:invisible">
        <div className="flex space-x-4">
          {footerData.map((item, index) => (
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
          ))}
        </div>
      </div>
      {/* Full-width profile row. Settings lives in its dropdown menu now,
          rather than as its own footer icon — see UserButton. It collapses to
          just the avatar on its own when a `Sidebar` ancestor is icon-only. */}
      <UserButton />
    </div>
  );
}

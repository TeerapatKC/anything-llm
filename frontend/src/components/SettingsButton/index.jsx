import useUser from "@/hooks/useUser";
import paths from "@/utils/paths";
import { ArrowUUpLeft, Wrench } from "@phosphor-icons/react";
import { Link } from "react-router-dom";
import { useMatch } from "react-router-dom";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { userIsChatOnly } from "@/utils/permissions";

export default function SettingsButton() {
  const isInSettings = !!useMatch("/settings/*");
  const { user } = useUser();

  if (userIsChatOnly(user)) return null;

  if (isInSettings)
    return (
      <div className="flex w-fit">
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              to={paths.home()}
              className="transition-all duration-300 p-2 rounded-full bg-theme-sidebar-footer-icon hover:bg-theme-sidebar-footer-icon-hover"
              aria-label="Home"
            >
              <ArrowUUpLeft
                className="h-5 w-5 text-white light:text-slate-800"
                weight="fill"
              />
            </Link>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[250px] text-xs">
            Back to workspaces
          </TooltipContent>
        </Tooltip>
      </div>
    );

  return (
    <div className="flex w-fit">
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            to={paths.settings.interface()}
            className="transition-all duration-300 p-2 rounded-full bg-theme-sidebar-footer-icon hover:bg-theme-sidebar-footer-icon-hover"
            aria-label="Settings"
          >
            <Wrench
              className="h-5 w-5 text-white light:text-slate-800"
              weight="fill"
            />
          </Link>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[250px] text-xs">
          Open settings
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

import useLoginMode from "@/hooks/useLoginMode";
import usePfp from "@/hooks/usePfp";
import useUser from "@/hooks/useUser";
import System from "@/models/system";
import paths from "@/utils/paths";
import { userFromStorage } from "@/utils/request";
import { Person } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import AccountModal from "../AccountModal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AUTH_TIMESTAMP,
  AUTH_TOKEN,
  AUTH_USER,
  LAST_VISITED_WORKSPACE,
  USER_PROMPT_INPUT_MAP,
} from "@/utils/constants";
import { useTranslation } from "react-i18next";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * Account button. Lives in the sidebar footer alongside the other footer icons,
 * so it is sized and coloured to match them rather than floating over the page.
 *
 * The menu opens upward because the footer sits at the bottom of the sidebar;
 * Radix flips it automatically if there is not enough room.
 */
export default function UserButton() {
  const { t } = useTranslation();
  const mode = useLoginMode();
  const { user } = useUser();
  const [showAccountSettings, setShowAccountSettings] = useState(false);
  const [supportEmail, setSupportEmail] = useState("");

  useEffect(() => {
    const fetchSupportEmail = async () => {
      const supportEmail = await System.fetchSupportEmail();
      setSupportEmail(
        supportEmail?.email
          ? `mailto:${supportEmail.email}`
          : paths.mailToMintplex()
      );
    };
    fetchSupportEmail();
  }, []);

  if (mode === null) return null;

  return (
    <div className="flex w-fit">
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger
              type="button"
              aria-label={t("profile_settings.account")}
              className="uppercase transition-all duration-300 h-9 w-9 text-xs font-semibold rounded-full flex items-center justify-center overflow-hidden bg-theme-sidebar-footer-icon hover:bg-theme-sidebar-footer-icon-hover text-white light:text-slate-800"
            >
              {mode === "multi" ? <UserDisplay /> : <Person size={18} />}
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[250px] text-xs">
            {t("profile_settings.account")}
          </TooltipContent>
        </Tooltip>
        <DropdownMenuContent
          side="top"
          align="start"
          className="bg-theme-action-menu-bg border-theme-modal-border"
        >
          {mode === "multi" && !!user && (
            <DropdownMenuItem
              onSelect={() => setShowAccountSettings(true)}
              className="text-white focus:bg-theme-action-menu-item-hover focus:text-white cursor-pointer"
            >
              {t("profile_settings.account")}
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            asChild
            className="text-white focus:bg-theme-action-menu-item-hover focus:text-white cursor-pointer"
          >
            <a href={supportEmail}>{t("profile_settings.support")}</a>
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => {
              window.localStorage.removeItem(AUTH_USER);
              window.localStorage.removeItem(AUTH_TOKEN);
              window.localStorage.removeItem(AUTH_TIMESTAMP);
              window.localStorage.removeItem(LAST_VISITED_WORKSPACE);
              window.localStorage.removeItem(USER_PROMPT_INPUT_MAP);
              window.location.replace(paths.home());
            }}
            className="text-white focus:bg-theme-action-menu-item-hover focus:text-white cursor-pointer"
          >
            {t("profile_settings.signout")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {user && showAccountSettings && (
        <AccountModal
          user={user}
          hideModal={() => setShowAccountSettings(false)}
        />
      )}
    </div>
  );
}

function UserDisplay() {
  const { pfp } = usePfp();
  const user = userFromStorage();

  if (pfp)
    return (
      <img
        src={pfp}
        alt="User profile picture"
        className="w-full h-full object-cover"
      />
    );

  return user?.username?.slice(0, 2) || "AA";
}

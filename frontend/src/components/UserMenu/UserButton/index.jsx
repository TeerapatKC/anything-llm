import useLoginMode from "@/hooks/useLoginMode";
import usePfp from "@/hooks/usePfp";
import useUser from "@/hooks/useUser";
import System from "@/models/system";
import paths from "@/utils/paths";
import { userFromStorage } from "@/utils/request";
import {
  CaretUpDown,
  Person,
  Question,
  SignOut,
  Wrench,
} from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AccountModal from "../AccountModal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
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
 * Account button. Lives in the sidebar footer as a full-width row (avatar +
 * name + role) so it reads like a profile card, and collapses to just the
 * avatar when an ancestor `Sidebar` is in icon mode — purely via the
 * `group-data-[collapsible=icon]:*` utility classes below, not React state,
 * so this component stays safe to render outside a SidebarProvider too (it
 * is shared with SettingsSidebar, which has no such provider).
 *
 * Settings lives inside this menu rather than as its own footer icon, per
 * the shadcn NavUser pattern this is modelled on.
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
  const canSeeSettings = !user || user?.role !== "default";
  const displayName =
    mode === "multi" && user?.username
      ? user.username
      : t("profile_settings.account");

  return (
    <div className="w-full">
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger
              type="button"
              aria-label={t("profile_settings.account")}
              className="flex w-full items-center gap-2 rounded-lg p-1.5 text-left transition-colors duration-300 hover:bg-theme-sidebar-item-hover data-[state=open]:bg-theme-sidebar-item-hover group-data-[collapsible=icon]:!size-8 group-data-[collapsible=icon]:!p-0 group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:justify-center"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-theme-sidebar-footer-icon text-xs font-semibold uppercase text-white light:text-slate-800">
                {mode === "multi" ? <UserDisplay /> : <Person size={16} />}
              </span>
              <span className="grid flex-1 text-left leading-tight group-data-[collapsible=icon]:hidden">
                <span className="truncate text-sm font-semibold text-theme-text-primary">
                  {displayName}
                </span>
                {mode === "multi" && !!user?.role && (
                  <span className="truncate text-xs capitalize text-theme-text-secondary">
                    {user.role}
                  </span>
                )}
              </span>
              <CaretUpDown
                size={14}
                weight="bold"
                className="ml-auto shrink-0 text-theme-text-secondary group-data-[collapsible=icon]:hidden"
              />
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[250px] text-xs">
            {displayName}
          </TooltipContent>
        </Tooltip>
        <DropdownMenuContent
          side="top"
          align="start"
          className="w-64 bg-theme-action-menu-bg border-theme-modal-border"
        >
          <DropdownMenuLabel className="font-normal">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-theme-sidebar-footer-icon text-xs font-semibold uppercase text-white light:text-slate-800">
                {mode === "multi" ? <UserDisplay /> : <Person size={16} />}
              </span>
              <span className="grid flex-1 leading-tight">
                <span className="truncate text-sm font-semibold text-white">
                  {displayName}
                </span>
                {mode === "multi" && !!user?.role && (
                  <span className="truncate text-xs capitalize text-theme-text-secondary">
                    {user.role}
                  </span>
                )}
              </span>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-theme-modal-border" />
          {mode === "multi" && !!user && (
            <DropdownMenuItem
              onSelect={() => setShowAccountSettings(true)}
              className="text-white focus:bg-theme-action-menu-item-hover focus:text-white cursor-pointer"
            >
              <Person size={16} />
              {t("profile_settings.account")}
            </DropdownMenuItem>
          )}
          {canSeeSettings && (
            <DropdownMenuItem
              asChild
              className="text-white focus:bg-theme-action-menu-item-hover focus:text-white cursor-pointer"
            >
              <Link to={paths.settings.interface()}>
                <Wrench size={16} />
                Settings
              </Link>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            asChild
            className="text-white focus:bg-theme-action-menu-item-hover focus:text-white cursor-pointer"
          >
            <a href={supportEmail}>
              <Question size={16} />
              {t("profile_settings.support")}
            </a>
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-theme-modal-border" />
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
            <SignOut size={16} />
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

import Telegram from "@/models/telegram";
import showToast from "@/utils/toast";
import { useTranslation } from "react-i18next";

/**
 * Every Telegram chat bound to an account on this instance. Each row is one
 * person: the bot answers them as that account, with their own workspaces.
 */
export default function UsersSection({ linkedUsers, fetchUsers }) {
  const { t } = useTranslation();

  async function handleUnlink(chatId) {
    const res = await Telegram.unlinkUser(chatId);
    if (!res.success) {
      showToast(res.error || t("telegram.users.toast-unlink-failed"), "error");
      return;
    }
    showToast(t("telegram.users.toast-unlinked"), "success");
    fetchUsers();
  }

  return (
    <div className="flex flex-col gap-y-[18px] w-[700px]">
      <div className="flex flex-col gap-y-2">
        <p className="text-base font-semibold text-theme-text-primary light:text-slate-900">
          {t("telegram.users.title")}
        </p>
        <p className="text-xs text-zinc-400 light:text-slate-600">
          {t("telegram.users.description")}
        </p>
      </div>
      <div className="border-t border-zinc-700 light:border-slate-200" />
      {linkedUsers.length === 0 ? (
        <p className="text-xs text-zinc-400 light:text-slate-600 py-2">
          {t("telegram.users.empty")}
        </p>
      ) : (
        <div className="flex flex-col gap-y-2">
          {linkedUsers.map((user) => (
            <UserRow key={user.chatId} user={user} onUnlink={handleUnlink} />
          ))}
        </div>
      )}
    </div>
  );
}

function UserRow({ user, onUnlink }) {
  const { t } = useTranslation();
  const account = user.username || t("telegram.users.unknown");
  const telegramHandle = user.telegramUsername
    ? `@${user.telegramUsername}`
    : user.telegramFirstName || `ID ${user.chatId}`;
  const initial = (account || "?")[0].toUpperCase();

  return (
    <>
      <div className="flex items-center gap-x-3">
        <div className="bg-zinc-800 light:bg-slate-300 size-8 rounded-full flex items-center justify-center shrink-0">
          <span className="text-sm font-semibold text-theme-text-primary light:text-slate-900">
            {initial}
          </span>
        </div>
        <div className="flex flex-col min-w-0 flex-1">
          <span className="text-sm font-medium text-theme-text-primary light:text-slate-900 truncate">
            {account}
          </span>
          <span className="text-xs text-zinc-400 light:text-slate-600 truncate">
            {telegramHandle}
          </span>
        </div>
        <span className="text-xs text-zinc-400 light:text-slate-600 truncate w-[180px] shrink-0">
          {user.workspace || t("telegram.users.no-workspace")}
        </span>
        <button
          onClick={() => onUnlink(user.chatId)}
          className="text-sm text-white/80 light:text-slate-500 hover:text-white light:hover:text-slate-700 transition-colors shrink-0"
        >
          {t("telegram.users.disconnect")}
        </button>
      </div>
      <div className="border-t border-zinc-800 light:border-slate-200" />
    </>
  );
}

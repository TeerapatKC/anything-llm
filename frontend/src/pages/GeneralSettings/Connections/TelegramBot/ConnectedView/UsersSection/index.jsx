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
    <section className="min-w-0 rounded-2xl border border-white/10 bg-zinc-800/50 p-5 shadow-sm light:border-slate-200 light:bg-white sm:p-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold text-theme-text-primary light:text-slate-900">
          {t("telegram.users.title")}
        </h2>
        <p className="text-sm leading-6 text-zinc-400 light:text-slate-600">
          {t("telegram.users.description")}
        </p>
      </div>
      {linkedUsers.length === 0 ? (
        <p className="mt-5 rounded-xl border border-dashed border-white/15 px-4 py-8 text-center text-sm text-zinc-400 light:border-slate-300 light:text-slate-600">
          {t("telegram.users.empty")}
        </p>
      ) : (
        <div className="mt-5 divide-y divide-white/10 light:divide-slate-200">
          {linkedUsers.map((user) => (
            <UserRow key={user.chatId} user={user} onUnlink={handleUnlink} />
          ))}
        </div>
      )}
    </section>
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
    <div className="flex flex-wrap items-center gap-3 py-3">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-sky-500/15">
        <span className="text-sm font-semibold text-sky-300 light:text-sky-700">
          {initial}
        </span>
      </div>
      <div className="flex min-w-[120px] flex-1 flex-col">
        <span className="truncate text-sm font-medium text-theme-text-primary light:text-slate-900">
          {account}
        </span>
        <span className="truncate text-xs text-zinc-400 light:text-slate-600">
          {telegramHandle}
        </span>
      </div>
      <span className="max-w-full truncate text-xs text-zinc-400 light:text-slate-600">
        {user.workspace || t("telegram.users.no-workspace")}
      </span>
      <button
        onClick={() => onUnlink(user.chatId)}
        className="shrink-0 text-sm text-red-300 transition-colors hover:text-red-200 light:text-red-700 light:hover:text-red-800"
      >
        {t("telegram.users.disconnect")}
      </button>
    </div>
  );
}

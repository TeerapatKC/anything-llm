import { useState } from "react";
import { Unlink } from "lucide-react";
import Telegram from "@/models/telegram";
import showToast from "@/utils/toast";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * Every Telegram chat bound to an account on this instance. Each row is one
 * person: the bot answers them as that account, with their own workspaces.
 */
export default function UsersSection({ linkedUsers, fetchUsers }) {
  const { t } = useTranslation();
  // The chat being confirmed. Kept after the dialog closes so its text does not
  // blank out during the closing animation.
  const [target, setTarget] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  // The chat whose unlink request is in flight, so only that row shows it.
  const [unlinkingId, setUnlinkingId] = useState(null);
  const busy = unlinkingId !== null;

  function askToUnlink(user) {
    setTarget(user);
    setConfirmOpen(true);
  }

  async function handleUnlink() {
    if (!target || busy) return;
    setUnlinkingId(target.chatId);
    const res = await Telegram.unlinkUser(target.chatId);
    if (!res?.success) {
      setUnlinkingId(null);
      // Left open, so the admin can try again or cancel.
      showToast(res?.error || t("telegram.users.toast-unlink-failed"), "error");
      return;
    }
    // The row stays in its loading state until the refreshed list drops it,
    // rather than flicking back to a live button for a moment.
    await fetchUsers();
    setUnlinkingId(null);
    setConfirmOpen(false);
    showToast(t("telegram.users.toast-unlinked"), "success");
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
            <UserRow
              key={user.chatId}
              user={user}
              unlinking={unlinkingId === user.chatId}
              disabled={busy}
              onUnlink={askToUnlink}
            />
          ))}
        </div>
      )}
      <ConfirmUnlinkDialog
        open={confirmOpen}
        user={target}
        unlinking={busy}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={handleUnlink}
      />
    </section>
  );
}

function accountLabels(user, t) {
  const account = user?.username || t("telegram.users.unknown");
  const telegramHandle = user?.telegramUsername
    ? `@${user.telegramUsername}`
    : user?.telegramFirstName || `ID ${user?.chatId}`;
  return { account, telegramHandle };
}

function UserRow({ user, unlinking, disabled, onUnlink }) {
  const { t } = useTranslation();
  const { account, telegramHandle } = accountLabels(user, t);
  const initial = (account || "?")[0].toUpperCase();

  return (
    <div
      className={`flex flex-wrap items-center gap-3 py-3 transition-opacity ${unlinking ? "opacity-60" : ""}`}
      aria-busy={unlinking}
    >
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
      <Button
        variant="destructive"
        size="sm"
        onClick={() => onUnlink(user)}
        disabled={disabled}
        aria-label={t("telegram.users.disconnect-label", { account })}
        className="shrink-0"
      >
        {unlinking ? (
          <>
            <Spinner className="size-3.5" />
            {t("telegram.users.disconnecting")}
          </>
        ) : (
          <>
            <Unlink />
            {t("telegram.users.disconnect")}
          </>
        )}
      </Button>
    </div>
  );
}

function ConfirmUnlinkDialog({ open, user, unlinking, onCancel, onConfirm }) {
  const { t } = useTranslation();
  const { account, telegramHandle } = accountLabels(user, t);

  return (
    <Dialog
      open={open}
      // Not closable mid-request: closing would hide the only place that says
      // whether the disconnect went through.
      onOpenChange={(next) => !next && !unlinking && onCancel()}
    >
      <DialogContent size="sm" showCloseButton={!unlinking}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Unlink className="size-4 text-destructive" />
            {t("telegram.users.confirm-title")}
          </DialogTitle>
          <DialogDescription>
            {t("telegram.users.confirm-description", {
              account,
              handle: telegramHandle,
            })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={onCancel} disabled={unlinking}>
            {t("telegram.users.cancel")}
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={unlinking}
            aria-busy={unlinking}
          >
            {unlinking ? (
              <>
                <Spinner size="sm" />
                {t("telegram.users.disconnecting")}
              </>
            ) : (
              <>
                <Unlink />
                {t("telegram.users.disconnect")}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

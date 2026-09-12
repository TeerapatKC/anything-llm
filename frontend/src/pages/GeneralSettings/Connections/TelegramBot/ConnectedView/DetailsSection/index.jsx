import { useState } from "react";
import { Spinner } from "@/components/ui/spinner";
import Telegram from "@/models/telegram";
import showToast from "@/utils/toast";
import { useTranslation } from "react-i18next";

export default function DetailsSection({ config, onDisconnected }) {
  const { t } = useTranslation();
  return (
    <section className="min-w-0 rounded-2xl border border-white/10 bg-zinc-800/50 p-5 shadow-sm light:border-slate-200 light:bg-white sm:p-6">
      <h2 className="text-lg font-semibold text-theme-text-primary light:text-slate-900">
        {t("telegram.connected.bot-details")}
      </h2>
      <div className="mt-5 divide-y divide-white/10 rounded-xl border border-white/10 light:divide-slate-200 light:border-slate-200">
        <div className="flex flex-col text-sm">
          <DetailRow
            label={t("telegram.connected.linked-accounts")}
            value={config.linked_user_count ?? 0}
          />
          <DetailRow
            label={t("telegram.connected.bot-link")}
            value={
              <a
                href={`https://t.me/${config.bot_username}`}
                target="_blank"
                rel="noreferrer"
                className="break-all font-medium text-sky-400 underline underline-offset-2 light:text-sky-600"
              >
                t.me/{config.bot_username}
              </a>
            }
          />
        </div>
      </div>
      <p className="mt-5 text-sm leading-6 text-zinc-400 light:text-slate-600">
        {t("telegram.connected.per-user-note")}
      </p>
      <div className="mt-6 border-t border-white/10 pt-5 light:border-slate-200">
        <DisconnectButton onDisconnected={onDisconnected} />
      </div>
    </section>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <span className="text-zinc-400 light:text-slate-500">{label}</span>
      <span className="min-w-0 text-theme-text-primary light:text-slate-900">
        {value}
      </span>
    </div>
  );
}

function DisconnectButton({ onDisconnected }) {
  const { t } = useTranslation();
  const [disconnecting, setDisconnecting] = useState(false);

  async function handleDisconnect() {
    setDisconnecting(true);
    const res = await Telegram.disconnect();
    setDisconnecting(false);

    if (!res.success) {
      showToast(
        res.error || t("telegram.connected.toast-disconnect-failed"),
        "error"
      );
      return;
    }
    onDisconnected();
  }

  return (
    <button
      onClick={handleDisconnect}
      disabled={disconnecting}
      className="flex min-h-10 items-center justify-center gap-2 rounded-xl border border-red-400/30 px-4 text-sm font-medium text-red-300 transition-colors hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50 light:text-red-700"
    >
      {disconnecting ? (
        <>
          <Spinner size="sm" />
          {t("telegram.connected.disconnecting")}
        </>
      ) : (
        t("telegram.connected.disconnect")
      )}
    </button>
  );
}

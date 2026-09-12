import { TelegramLogo } from "@/components/lib/BrandIcon";
import { useTranslation } from "react-i18next";

export default function ConnectedBotCard({ config }) {
  const { t } = useTranslation();
  return (
    <section className="flex flex-wrap items-center gap-4 rounded-2xl border border-white/10 bg-zinc-800/50 p-5 shadow-sm light:border-slate-200 light:bg-white sm:p-6">
      <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-white p-2.5">
        <TelegramLogo className="size-full" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium uppercase tracking-widest text-zinc-400 light:text-slate-500">
          {t("telegram.title")}
        </p>
        <p className="mt-1 truncate text-lg font-semibold text-theme-text-primary light:text-slate-900">
          @{config.bot_username}
        </p>
      </div>
      <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-300 light:text-emerald-700">
        <span className="size-2 rounded-full bg-emerald-400" />
        {t("telegram.connected.status")}
      </span>
    </section>
  );
}

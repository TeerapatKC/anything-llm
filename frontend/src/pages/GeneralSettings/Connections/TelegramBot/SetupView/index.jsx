import { useState } from "react";
import { Spinner } from "@/components/ui/spinner";
import { Eye, EyeOff } from "lucide-react";
import { TelegramLogo } from "@/components/lib/BrandIcon";
import Telegram from "@/models/telegram";
import showToast from "@/utils/toast";
import CreateBotSection from "./CreateBotSection";
import { useTranslation } from "react-i18next";

export default function SetupView({ onConnected }) {
  const { t } = useTranslation();
  const [botToken, setBotToken] = useState("");
  const [connecting, setConnecting] = useState(false);

  async function handleConnect(e) {
    e.preventDefault();
    if (!botToken.trim())
      return showToast(t("telegram.setup.toast-enter-token"), "error");

    setConnecting(true);
    const res = await Telegram.connect(botToken.trim());
    setConnecting(false);

    if (!res.success) {
      showToast(res.error || t("telegram.setup.toast-connect-failed"), "error");
      return;
    }

    const configRes = await Telegram.getConfig();
    onConnected(configRes?.config);
  }

  return (
    <div className="mt-6 grid items-start gap-6 min-[1300px]:grid-cols-[minmax(0,1.3fr)_minmax(300px,0.7fr)]">
      <CreateBotSection />
      <form
        onSubmit={handleConnect}
        className="flex min-w-0 flex-col gap-6 rounded-2xl border border-white/10 bg-zinc-800/50 p-5 shadow-sm light:border-slate-200 light:bg-white sm:p-6"
      >
        <div className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold text-theme-text-primary light:text-slate-900">
            {t("telegram.setup.step2.title")}
          </h2>
          <p className="text-sm leading-6 text-zinc-400 light:text-slate-600">
            {t("telegram.setup.step2.description")}
          </p>
        </div>
        <BotTokenInput botToken={botToken} setBotToken={setBotToken} />
        <button
          type="submit"
          disabled={connecting}
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#229ed9] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#168ac3] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {connecting ? (
            <>
              <Spinner size="sm" />
              {t("telegram.setup.step2.connecting")}
            </>
          ) : (
            <>
              <TelegramLogo className="size-5" />
              {t("telegram.setup.step2.connect-bot")}
            </>
          )}
        </button>
      </form>
    </div>
  );
}

function BotTokenInput({ botToken, setBotToken }) {
  const { t } = useTranslation();
  const [showToken, setShowToken] = useState(false);
  const Icon = showToken ? Eye : EyeOff;

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <label
        htmlFor="telegram-bot-token"
        className="text-sm font-medium text-zinc-200 light:text-slate-900"
      >
        {t("telegram.setup.step2.bot-token")}
      </label>
      <div className="flex h-11 items-center gap-3 rounded-xl border border-white/10 bg-zinc-900 px-3.5 focus-within:border-sky-500 light:border-slate-300 light:bg-slate-50">
        <button
          type="button"
          onClick={() => setShowToken(!showToken)}
          aria-label={t("telegram.setup.step2.bot-token")}
          className="shrink-0 text-zinc-400 transition-colors hover:text-zinc-200 light:text-slate-500 light:hover:text-slate-700"
        >
          <Icon className="h-4 w-4" />
        </button>
        <input
          id="telegram-bot-token"
          type={showToken ? "text" : "password"}
          value={botToken}
          onChange={(e) => setBotToken(e.target.value)}
          placeholder="123456:ABC-DEF123ghlkl-zyx57W2v"
          className="min-w-0 flex-1 bg-transparent text-sm text-theme-text-primary outline-none placeholder:text-zinc-500 light:text-slate-900 light:placeholder:text-slate-400"
          autoComplete="off"
        />
      </div>
    </div>
  );
}

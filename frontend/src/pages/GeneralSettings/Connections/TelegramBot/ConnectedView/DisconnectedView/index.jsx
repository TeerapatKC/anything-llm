import { useRef, useState } from "react";
import { Spinner } from "@/components/ui/spinner";
import { Eye, EyeOff } from "lucide-react";
import { TelegramLogo } from "@/components/lib/BrandIcon";
import Telegram from "@/models/telegram";
import { useTranslation } from "react-i18next";

export default function DisconnectedView({
  config,
  onReconnected,
  newToken,
  setNewToken,
}) {
  const { t } = useTranslation();
  const [reconnecting, setReconnecting] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [error, setError] = useState("");
  const tokenInputRef = useRef(null);
  const Icon = showToken ? Eye : EyeOff;

  async function handleReconnect(e) {
    e.preventDefault();
    if (!newToken.trim()) {
      setError(t("telegram.setup.toast-enter-token"));
      tokenInputRef.current?.focus();
      return;
    }
    setError("");
    setReconnecting(true);
    const res = await Telegram.connect(newToken.trim());
    setReconnecting(false);
    if (!res.success) {
      setError(res.error || t("telegram.connected.toast-reconnect-failed"));
      return;
    }

    setNewToken("");
    const configRes = await Telegram.getConfig();
    onReconnected(configRes?.config);
  }

  return (
    <section className="min-w-0 max-w-xl rounded-2xl border border-red-500/25 bg-zinc-800/50 p-5 shadow-sm light:bg-white">
      <div className="flex items-center gap-4">
        <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-white p-2.5">
          <TelegramLogo className="size-full" />
        </div>
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-theme-text-primary light:text-slate-900">
            {t("telegram.setup.reconnect.step2-title")}
          </h2>
          <p className="mt-1 truncate text-sm text-zinc-400 light:text-slate-600">
            @{config.bot_username}
          </p>
        </div>
      </div>
      <p className="mt-4 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300 light:text-red-700">
        {t("telegram.connected.status-disconnected")}
      </p>
      <form
        onSubmit={handleReconnect}
        className="mt-4 flex min-w-0 flex-col gap-2.5"
      >
        <label
          htmlFor="telegram-reconnect-token"
          className="text-sm font-medium text-theme-text-primary light:text-slate-900"
        >
          {t("telegram.setup.step2.bot-token")}
        </label>
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row">
          <div className="flex min-h-14 w-full min-w-0 flex-1 items-center gap-3 rounded-xl border border-white/10 bg-zinc-900 px-4 focus-within:border-sky-500 light:border-slate-300 light:bg-slate-50 sm:min-h-11 sm:px-3">
            <input
              id="telegram-reconnect-token"
              ref={tokenInputRef}
              type={showToken ? "text" : "password"}
              value={newToken}
              onChange={(e) => {
                setNewToken(e.target.value);
                if (error) setError("");
              }}
              placeholder={t("telegram.connected.placeholder-token")}
              className="h-12 w-full min-w-0 flex-1 bg-transparent text-base text-theme-text-primary outline-none placeholder:text-zinc-500 light:text-slate-900 light:placeholder:text-slate-400 sm:h-10 sm:text-sm"
              autoComplete="off"
              aria-invalid={!!error}
              aria-describedby={error ? "telegram-reconnect-error" : undefined}
            />
            <button
              type="button"
              onClick={() => setShowToken(!showToken)}
              aria-label={t("telegram.setup.step2.bot-token")}
              className="flex size-10 shrink-0 items-center justify-center text-zinc-400 transition-colors hover:text-zinc-200 light:text-slate-500 light:hover:text-slate-700"
            >
              <Icon className="size-5" />
            </button>
          </div>
          <button
            type="submit"
            disabled={reconnecting}
            className="flex min-h-12 w-full items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-[#229ed9] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#168ac3] disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-11 sm:w-auto sm:min-w-32"
          >
            {reconnecting ? (
              <Spinner size="sm" />
            ) : (
              t("telegram.connected.reconnect")
            )}
          </button>
        </div>
        {error && (
          <p
            id="telegram-reconnect-error"
            role="alert"
            className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300 light:text-red-700"
          >
            {error}
          </p>
        )}
      </form>
    </section>
  );
}

/**
This code is disabled for now - works fine, but I am not sure we want to enabled this feature.
How many people really need a REPLY with voice mode? Even then, we should support on device TTS
and more it out the frontend so people can do voice gen without having to pay for it.

When we do enabled this, we should uncomment this code and remove the disabled comment.

const getVoiceModeOptions = (t) => {
  return [
    { value: "text_only", label: t("telegram.connected.voice-text-only") },
    { value: "mirror", label: t("telegram.connected.voice-mirror") },
    { value: "always_voice", label: t("telegram.connected.voice-always") },
  ];
};

function VoiceModeSelector({ config }) {
  const { t } = useTranslation();
  const [voiceMode, setVoiceMode] = useState(
    config.voice_response_mode || "text_only"
  );

  async function handleVoiceModeChange(e) {
    const mode = e.target.value;
    setVoiceMode(mode);
    const res = await Telegram.updateConfig({ voice_response_mode: mode });
    if (!res.success) {
      showToast(
        res.error || t("telegram.connected.toast-voice-failed"),
        "error"
      );
      setVoiceMode(config.voice_response_mode || "text_only");
    }
  }

  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-theme-text-primary">
        {t("telegram.connected.voice-response")}
      </span>
      <select
        value={voiceMode}
        onChange={handleVoiceModeChange}
        className="text-xs text-right bg-transparent text-theme-text-primary rounded-md px-2 py-1 outline-none max-w-[260px]"
      >
        {getVoiceModeOptions(t).map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

*/

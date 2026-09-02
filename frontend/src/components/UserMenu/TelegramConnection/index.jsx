import { useCallback, useEffect, useState } from "react";
import { Copy, Check } from "lucide-react";
import Telegram from "@/models/telegram";
import showToast from "@/utils/toast";
import { Button } from "@/components/ui/button";
import { TelegramLogo } from "@/components/lib/BrandIcon";
import { Spinner } from "@/components/ui/spinner";
import { useTranslation } from "react-i18next";
import { QRCodeSVG } from "qrcode.react";
import ConnectionCard, { ConnectionUnavailable } from "../ConnectionCard";

/**
 * Bind this account to a Telegram chat.
 *
 * The instance runs one shared bot, so the code minted here is what proves to the
 * bot which account is on the other end - it is only readable by someone already
 * signed in as that user, and it dies after a few minutes.
 */
export default function TelegramConnection({ user }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [connection, setConnection] = useState(null);
  const [pairing, setPairing] = useState(null);
  const [requesting, setRequesting] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [copied, setCopied] = useState(false);

  const fetchConnection = useCallback(async () => {
    const res = await Telegram.myConnection();
    setConnection(res);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchConnection();
  }, [fetchConnection]);

  // Count the code down so nobody sits on a dead code wondering why it fails.
  useEffect(() => {
    if (!pairing?.expiresAt) return;
    const tick = () => {
      const remaining = Math.max(
        0,
        Math.round((pairing.expiresAt - Date.now()) / 1000)
      );
      setSecondsLeft(remaining);
      if (remaining === 0) setPairing(null);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [pairing]);

  // A chat that links while this dialog is open should be reflected without a
  // reload, so poll while a code is live.
  useEffect(() => {
    if (!pairing) return;
    const interval = setInterval(async () => {
      const res = await Telegram.myConnection();
      setConnection(res);
      if (res?.link) setPairing(null);
    }, 5_000);
    return () => clearInterval(interval);
  }, [pairing]);

  async function handleRequestCode() {
    setRequesting(true);
    const res = await Telegram.requestPairingCode();
    setRequesting(false);
    if (!res.success || !res.code) {
      showToast(
        res.error || t("profile_settings.telegram.code_failed"),
        "error"
      );
      return;
    }
    setCopied(false);
    setPairing(res);
  }

  async function handleDisconnect() {
    const res = await Telegram.unlinkSelf();
    if (!res.success) {
      showToast(
        res.error || t("profile_settings.telegram.disconnect_failed"),
        "error"
      );
      return;
    }
    setPairing(null);
    showToast(t("profile_settings.telegram.disconnected"), "success");
    fetchConnection();
  }

  async function handleCopy(command) {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast(t("profile_settings.telegram.copy_failed"), "error");
    }
  }

  if (loading) return null;

  // Nothing to offer when no bot is running and this account has no leftover
  // link. Inside its own dialog that has to be said out loud - the reader
  // opened it deliberately and an empty box explains nothing.
  if (!connection?.available && !connection?.link) {
    return (
      <ConnectionCard
        icon={<TelegramLogo className="h-5 w-5 text-white" />}
        accentClassName="bg-[#00ADEC]"
        title={t("profile_settings.telegram.title")}
        status="unavailable"
      >
        <ConnectionUnavailable
          message={t("profile_settings.telegram.unavailable")}
        />
      </ConnectionCard>
    );
  }

  const link = connection?.link;
  const command = pairing
    ? `/link ${pairing.username || user.username} ${pairing.code}`
    : null;
  const botUrl = connection?.bot_username
    ? `https://t.me/${connection.bot_username}`
    : null;

  return (
    <ConnectionCard
      icon={<TelegramLogo className="h-5 w-5 text-white" />}
      accentClassName="bg-[#00ADEC]"
      title={t("profile_settings.telegram.title")}
      description={
        link
          ? t("profile_settings.telegram.connected_description")
          : t("profile_settings.telegram.description")
      }
      status={link ? "connected" : "disconnected"}
    >
      {link ? (
        <div className="flex items-center justify-between gap-x-3">
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-sm text-theme-text-primary">
              {link.telegramUsername
                ? `@${link.telegramUsername}`
                : link.telegramFirstName ||
                  t("profile_settings.telegram.connected_chat")}
            </span>
            {!!connection?.bot_username && (
              <span className="truncate text-xs text-theme-text-secondary">
                @{connection.bot_username}
              </span>
            )}
          </div>
          <Button variant="outline" type="button" onClick={handleDisconnect}>
            {t("profile_settings.telegram.disconnect")}
          </Button>
        </div>
      ) : (
        // One card, two halves: what to send on the left, where to send it on
        // the right. They are the two things needed at once, and splitting
        // them across cards meant reading one and then hunting for the other.
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex min-w-0 flex-1 flex-col gap-y-2">
            {pairing ? (
              <>
                <span className="text-xs text-theme-text-secondary">
                  {t("profile_settings.telegram.send_this", {
                    bot: connection.bot_username
                      ? `@${connection.bot_username}`
                      : t("profile_settings.telegram.the_bot"),
                  })}
                </span>
                <div className="flex items-center gap-x-2">
                  <code className="flex-1 overflow-x-auto rounded-lg bg-theme-bg-primary px-2.5 py-2 text-sm whitespace-nowrap text-theme-text-primary">
                    {command}
                  </code>
                  <button
                    type="button"
                    onClick={() => handleCopy(command)}
                    className="shrink-0 text-theme-text-secondary transition-colors hover:text-theme-text-primary"
                    aria-label={t("profile_settings.telegram.copy")}
                  >
                    {copied ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <span className="text-xs text-theme-text-secondary">
                  {t("profile_settings.telegram.expires_in", {
                    seconds: secondsLeft,
                  })}
                </span>
              </>
            ) : (
              <>
                <span className="text-xs text-theme-text-secondary">
                  {t("profile_settings.telegram.description")}
                </span>
                <Button
                  variant="default"
                  type="button"
                  className="w-fit"
                  onClick={handleRequestCode}
                  disabled={requesting}
                >
                  {requesting ? (
                    <Spinner size="sm" />
                  ) : (
                    t("profile_settings.telegram.connect")
                  )}
                </Button>
              </>
            )}
          </div>

          {!!botUrl && (
            <div className="flex shrink-0 flex-col items-center gap-y-1.5 sm:border-l sm:border-theme-modal-border sm:pl-4">
              {/* Black on white whatever the theme: a dark-on-dark code will
                    not scan. */}
              <a
                href={botUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg bg-white p-2 transition-opacity hover:opacity-80"
                aria-label={t("profile_settings.telegram.open_bot")}
              >
                <QRCodeSVG
                  value={botUrl}
                  size={92}
                  bgColor="#ffffff"
                  fgColor="#000000"
                />
              </a>
              <span className="max-w-[128px] text-center text-[11px] leading-tight text-theme-text-secondary">
                {t("profile_settings.telegram.scan_hint")}
              </span>
            </div>
          )}
        </div>
      )}
    </ConnectionCard>
  );
}

import { useEffect, useState } from "react";
import { Copy, Check } from "lucide-react";
import Sidebar from "@/components/SettingsSidebar";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fullApiUrl } from "@/utils/constants";
import { LineLogo } from "@/components/lib/BrandIcon";
import Line from "@/models/line";
import showToast from "@/utils/toast";
import { useTranslation } from "react-i18next";

/**
 * Settings > Channels > LINE. Lets an admin paste the LINE bot's channel
 * access token + secret (verified against LINE's API, stored encrypted),
 * and shows the webhook URL to register in the LINE Developers Console.
 */
export default function LineBotSettings() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState(null);
  const [copied, setCopied] = useState(false);

  const webhookUrl = config?.webhookSecret
    ? `${fullApiUrl()}/webhooks/line/${config.webhookSecret}`
    : `${fullApiUrl()}/webhooks/line`;

  async function loadConfig() {
    const res = await Line.config();
    setConfig(res?.error ? null : res);
    setLoading(false);
  }

  useEffect(() => {
    loadConfig();
  }, []);

  const copyWebhookUrl = () => {
    window.navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
  };

  useEffect(() => {
    if (!copied) return;
    const timeout = setTimeout(() => setCopied(false), 2_500);
    return () => clearTimeout(timeout);
  }, [copied]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-zinc-950 light:bg-slate-50">
      <Sidebar />
      <main className="min-w-0 flex-1 overflow-y-auto bg-zinc-900 light:bg-slate-50">
        <div className="mx-auto w-full max-w-6xl px-4 pb-16 pt-20 sm:px-6 min-[1100px]:px-10 min-[1100px]:pt-10">
          <header className="flex items-start gap-4 border-b border-white/20 pb-6 light:border-slate-300">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-white p-2">
              <LineLogo className="size-full" />
            </div>
            <div className="min-w-0 max-w-3xl">
              <p className="text-xs font-medium text-zinc-400 light:text-slate-500">
                {t("settings.channels")}
              </p>
              <h1 className="mt-1 text-lg font-semibold leading-7 text-theme-text-primary light:text-slate-900">
                LINE
              </h1>
              <p className="mt-2 text-sm leading-6 text-zinc-400 light:text-slate-600">
                Lets a LINE Official Account forward messages to a workspace and
                reply with its response. Users link their own account from
                Settings {"> "}Connected apps, then send a one-time /link
                command to the bot, and are then limited to the workspaces that
                account can access.
              </p>
            </div>
          </header>

          {!loading && config?.configured && !config?.smtpConfigured && (
            <p className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm leading-6 text-amber-300 light:text-amber-700">
              SMTP is not configured, so the verification code can't be emailed
              to anyone - nobody will be able to link their account. Set it up
              under{" "}
              <a href="/settings/smtp" className="underline">
                Settings {"> "}SMTP
              </a>
              .
            </p>
          )}

          {loading ? (
            <div className="flex min-h-[240px] items-center justify-center">
              <Spinner
                size="lg"
                className="text-zinc-400 light:text-slate-400"
              />
            </div>
          ) : (
            <div className="mt-6 grid items-start gap-6 min-[1300px]:grid-cols-2">
              {config?.configured && config?.active ? (
                <>
                  <ConnectedView config={config} onDisconnected={loadConfig} />
                  <WebhookSection
                    webhookUrl={webhookUrl}
                    hasSecret={!!config.webhookSecret}
                    copied={copied}
                    onCopy={copyWebhookUrl}
                  />
                </>
              ) : (
                <>
                  <WebhookSection
                    webhookUrl={webhookUrl}
                    hasSecret={!!config?.webhookSecret}
                    copied={copied}
                    onCopy={copyWebhookUrl}
                  />
                  <ConnectForm onConnected={loadConfig} />
                </>
              )}
              {config?.configured && config?.active && (
                <div className="min-[1300px]:col-span-2">
                  <VerifiedUsersList />
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function WebhookSection({ webhookUrl, hasSecret, copied, onCopy }) {
  return (
    <section className="min-w-0 rounded-2xl border border-white/10 bg-zinc-800/50 p-5 shadow-sm light:border-slate-200 light:bg-white sm:p-6">
      <h2 className="text-lg font-semibold text-theme-text-primary light:text-slate-900">
        Webhook URL
      </h2>
      <p className="mt-2 text-sm leading-6 text-zinc-400 light:text-slate-600">
        Paste this into the LINE Developers Console under Messaging API {"> "}
        Webhook URL. It must be reachable over HTTPS from the internet.
      </p>
      <div className="mt-5 flex min-w-0 items-center gap-2">
        <input
          readOnly
          aria-label="Webhook URL"
          value={webhookUrl}
          onFocus={(e) => e.target.select()}
          className="h-11 min-w-0 flex-1 rounded-xl border border-white/10 bg-zinc-900 px-3.5 text-sm text-theme-text-primary outline-none focus:border-sky-500 light:border-slate-300 light:bg-slate-50 light:text-slate-900"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={onCopy}
          title="Copy webhook URL"
          aria-label="Copy webhook URL"
          className="size-11 shrink-0 rounded-xl"
        >
          {copied ? <Check className="text-green-500" /> : <Copy />}
        </Button>
      </div>
      <p className="mt-3 text-xs leading-5 text-zinc-400 light:text-slate-600">
        {hasSecret
          ? "This URL includes a secret path. Treat it like a password."
          : "A local dev server needs a tunnel (e.g. ngrok) to receive webhooks."}
      </p>
      {!hasSecret && (
        <p className="mt-3 rounded-xl border border-amber-500/25 bg-amber-500/10 p-3 text-xs leading-5 text-amber-300 light:text-amber-700">
          Set LINE_WEBHOOK_SECRET in the server environment to give this webhook
          a private, hard-to-guess path.
        </p>
      )}
    </section>
  );
}

function ConnectedView({ config, onDisconnected }) {
  const [disconnecting, setDisconnecting] = useState(false);

  async function handleDisconnect() {
    if (
      !window.confirm(
        "Disconnect this LINE bot? Messages sent to it will stop getting replies until reconnected."
      )
    )
      return;

    setDisconnecting(true);
    const { success, error } = await Line.disconnect();
    setDisconnecting(false);
    if (!success) {
      showToast(error || "Failed to disconnect.", "error", { clear: true });
      return;
    }
    onDisconnected();
  }

  return (
    <section className="min-w-0 rounded-2xl border border-white/10 bg-zinc-800/50 p-5 shadow-sm light:border-slate-200 light:bg-white sm:p-6">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-white p-2.5">
          <LineLogo className="size-full" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-widest text-zinc-400 light:text-slate-500">
            LINE
          </p>
          <h2 className="mt-1 truncate text-lg font-semibold text-theme-text-primary light:text-slate-900">
            {config?.botDisplayName || "LINE Official Account"}
          </h2>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-300 light:text-emerald-700">
          <span className="size-2 rounded-full bg-emerald-400" />
          Connected
        </span>
      </div>
      <div className="mt-6 divide-y divide-white/10 rounded-xl border border-white/10 text-sm light:divide-slate-200 light:border-slate-200">
        {!!config?.basicId && (
          <StatusRow label="LINE Basic ID" value={config.basicId} />
        )}
        <StatusRow
          label="Linked users"
          value={String(config?.verifiedUserCount ?? 0)}
        />
      </div>
      <div className="mt-6 border-t border-white/10 pt-5 light:border-slate-200">
        <Button
          type="button"
          variant="outline"
          onClick={handleDisconnect}
          disabled={disconnecting}
          className="min-h-10 rounded-xl border-red-400/30 px-4 text-red-300 hover:bg-red-500/10 hover:text-red-200 light:text-red-700"
        >
          {disconnecting ? "Disconnecting..." : "Disconnect"}
        </Button>
      </div>
    </section>
  );
}

function ConnectForm({ onConnected }) {
  const [channelAccessToken, setChannelAccessToken] = useState("");
  const [channelSecret, setChannelSecret] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState(null);

  async function handleConnect(e) {
    e.preventDefault();
    setError(null);
    setConnecting(true);

    const { success, error: connectError } = await Line.connect({
      channel_access_token: channelAccessToken.trim(),
      channel_secret: channelSecret.trim(),
    });

    setConnecting(false);
    if (!success) {
      setError(connectError || "Failed to connect.");
      return;
    }
    setChannelAccessToken("");
    setChannelSecret("");
    onConnected();
  }

  return (
    <form
      onSubmit={handleConnect}
      className="flex min-w-0 flex-col gap-5 rounded-2xl border border-white/10 bg-zinc-800/50 p-5 shadow-sm light:border-slate-200 light:bg-white sm:p-6"
    >
      <div>
        <h2 className="text-lg font-semibold text-theme-text-primary light:text-slate-900">
          Connect the bot
        </h2>
        <p className="mt-2 text-sm leading-6 text-zinc-400 light:text-slate-600">
          Enter the credentials for your LINE Messaging API channel.
        </p>
      </div>
      <div>
        <Label htmlFor="line-access-token" className="mb-2 block">
          Channel access token
        </Label>
        <Input
          id="line-access-token"
          type="password"
          autoComplete="off"
          value={channelAccessToken}
          onChange={(e) => setChannelAccessToken(e.target.value)}
          placeholder="Long-lived channel access token"
          required
          className="h-11 rounded-xl border-white/10 bg-zinc-900 light:border-slate-300 light:bg-slate-50"
        />
        <p className="mt-2 text-xs leading-5 text-zinc-400 light:text-slate-600">
          LINE Developers Console {"> "}your channel {"> "}Messaging API tab.
        </p>
      </div>

      <div>
        <Label htmlFor="line-channel-secret" className="mb-2 block">
          Channel secret
        </Label>
        <Input
          id="line-channel-secret"
          type="password"
          autoComplete="off"
          value={channelSecret}
          onChange={(e) => setChannelSecret(e.target.value)}
          placeholder="Channel secret"
          required
          className="h-11 rounded-xl border-white/10 bg-zinc-900 light:border-slate-300 light:bg-slate-50"
        />
        <p className="mt-2 text-xs leading-5 text-zinc-400 light:text-slate-600">
          Same channel {"> "}Basic settings tab. Used to verify that webhook
          requests really came from LINE.
        </p>
      </div>

      {error && (
        <p className="rounded-xl bg-red-500/10 p-3 text-sm text-red-300 light:text-red-700">
          {error}
        </p>
      )}

      <div className="mt-auto">
        <Button
          type="submit"
          disabled={connecting}
          className="min-h-11 w-full rounded-xl bg-[#06C755] text-white hover:bg-[#05ad49]"
        >
          {connecting ? "Verifying..." : "Connect"}
        </Button>
      </div>
    </form>
  );
}

function VerifiedUsersList() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [revokingId, setRevokingId] = useState(null);

  async function load() {
    const { users: fetched } = await Line.approvedUsers();
    setUsers(fetched || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleRevoke(lineUserId) {
    if (
      !window.confirm(
        "Un-pair this LINE user? They'll need to /link again to chat."
      )
    )
      return;

    setRevokingId(lineUserId);
    const { success, error } = await Line.revokeUser(lineUserId);
    setRevokingId(null);
    if (!success) {
      showToast(error || "Failed to revoke.", "error", { clear: true });
      return;
    }
    load();
  }

  async function handleWorkspaceChange(lineUserId, slug) {
    // Optimistic - the admin picking from that user's own accessible list can't fail
    // validation, so update immediately and only roll back on a genuine server error.
    setUsers((prev) =>
      prev.map((u) =>
        u.lineUserId === lineUserId ? { ...u, activeWorkspace: slug } : u
      )
    );
    const { success, error } = await Line.setUserWorkspace(lineUserId, slug);
    if (!success) {
      showToast(error || "Failed to set workspace.", "error", { clear: true });
      load();
    }
  }

  return (
    <section className="min-w-0 rounded-2xl border border-white/10 bg-zinc-800/50 p-5 shadow-sm light:border-slate-200 light:bg-white sm:p-6">
      <h2 className="text-lg font-semibold text-theme-text-primary light:text-slate-900">
        Linked users
      </h2>
      <p className="mt-2 text-sm leading-6 text-zinc-400 light:text-slate-600">
        People who linked their LINE chat from Connected apps.
      </p>
      {loading ? (
        <div className="flex min-h-24 items-center justify-center">
          <Spinner size="sm" className="text-zinc-400 light:text-slate-400" />
        </div>
      ) : users.length === 0 ? (
        <p className="mt-5 rounded-xl border border-dashed border-white/15 px-4 py-8 text-center text-sm text-zinc-400 light:border-slate-300 light:text-slate-600">
          Nobody has linked their account yet. They can start from their own
          Settings {"> "}Connected apps page.
        </p>
      ) : (
        <div className="mt-5 divide-y divide-white/10 light:divide-slate-200">
          {users.map((u) => (
            <div
              key={u.lineUserId}
              className="flex flex-wrap items-center gap-3 py-3"
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-green-500/15 text-sm font-semibold text-green-300 light:text-green-700">
                {(u.username || "?")[0].toUpperCase()}
              </div>
              <p className="min-w-[120px] flex-1 truncate text-sm font-medium text-theme-text-primary light:text-slate-900">
                {u.username}
              </p>
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                {u.accessibleWorkspaces?.length > 0 ? (
                  <Select
                    value={u.activeWorkspace || ""}
                    onValueChange={(slug) =>
                      handleWorkspaceChange(u.lineUserId, slug)
                    }
                  >
                    <SelectTrigger className="h-9 w-44 max-w-full text-xs">
                      <SelectValue placeholder="Not set yet" />
                    </SelectTrigger>
                    <SelectContent>
                      {u.accessibleWorkspaces.map((ws) => (
                        <SelectItem key={ws.slug} value={ws.slug}>
                          {ws.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-xs text-amber-500">no workspace access</p>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleRevoke(u.lineUserId)}
                  disabled={revokingId === u.lineUserId}
                  className="rounded-lg"
                >
                  {revokingId === u.lineUserId ? "Revoking..." : "Revoke"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function StatusRow({ label, value }) {
  return (
    <div className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <span className="text-zinc-400 light:text-slate-500">{label}</span>
      <span className="min-w-0 break-all text-theme-text-primary light:text-slate-900">
        {value}
      </span>
    </div>
  );
}

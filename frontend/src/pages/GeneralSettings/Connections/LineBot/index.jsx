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
import Line from "@/models/line";
import showToast from "@/utils/toast";

/**
 * Settings > Channels > LINE. Lets an admin paste the LINE bot's channel
 * access token + secret (verified against LINE's API, stored encrypted),
 * and shows the webhook URL to register in the LINE Developers Console.
 */
export default function LineBotSettings() {
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
    <div className="w-screen h-screen overflow-hidden bg-zinc-950 light:bg-slate-50 flex min-[1100px]:mt-0 mt-6">
      <Sidebar />
      <div
        style={{ height: "100%" }}
        className="relative min-w-0 bg-zinc-900 light:bg-white light:border light:border-slate-300 w-full h-full overflow-y-scroll p-4 min-[1100px]:p-0"
      >
        <div className="flex flex-col w-full px-1 py-16 min-[1100px]:px-6 min-[1100px]:py-6 max-w-[700px]">
          <div className="w-full flex flex-col gap-y-2 pb-6 border-b border-white/20 light:border-slate-300">
            <p className="text-lg font-semibold leading-7 text-theme-text-primary light:text-slate-900">
              LINE
            </p>
            <p className="text-xs leading-4 text-zinc-400 light:text-slate-600">
              Lets a LINE Official Account forward messages to a workspace and
              reply with its response. Users link their own account from
              Settings {"> "}Connected apps, then send a one-time /link
              command to the bot, and are then limited to the workspaces that
              account can access.
            </p>
          </div>

          {!loading && config?.configured && !config?.smtpConfigured && (
            <p className="text-xs text-amber-500 mt-4">
              SMTP is not configured, so the verification code can't be
              emailed to anyone - nobody will be able to link their account.
              Set it up under{" "}
              <a href="/settings/smtp" className="underline">
                Settings {"> "}SMTP
              </a>
              .
            </p>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner
                size="lg"
                className="text-zinc-400 light:text-slate-400"
              />
            </div>
          ) : (
            <div className="flex flex-col gap-y-6 mt-6">
              <div>
                <p className="text-sm font-medium text-theme-text-primary light:text-slate-900 mb-2">
                  1. Webhook URL
                </p>
                <div className="flex items-center gap-x-2">
                  <input
                    readOnly
                    value={webhookUrl}
                    onFocus={(e) => e.target.select()}
                    className="flex-1 border-none bg-theme-settings-input-bg text-theme-text-primary light:text-slate-900 text-sm rounded-lg p-2.5 outline-none"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={copyWebhookUrl}
                    title="Copy webhook URL"
                  >
                    {copied ? <Check className="text-green-500" /> : <Copy />}
                  </Button>
                </div>
                <p className="text-xs text-zinc-400 light:text-slate-600 mt-1">
                  Paste this into the LINE Developers Console under Messaging
                  API {"> "}
                  Webhook URL. Must be reachable over HTTPS from the internet
                  - a local dev server needs a tunnel (e.g. ngrok).
                  {config?.webhookSecret && (
                    <>
                      {" "}
                      This URL includes a secret path - treat it like a
                      password.
                    </>
                  )}
                </p>
                {!config?.webhookSecret && (
                  <p className="text-xs text-amber-500 mt-1">
                    Set LINE_WEBHOOK_SECRET in the server environment to give
                    this webhook a private, hard-to-guess path.
                  </p>
                )}
              </div>

              <div>
                <p className="text-sm font-medium text-theme-text-primary light:text-slate-900 mb-2">
                  2. Connect the bot
                </p>
                {config?.configured && config?.active ? (
                  <ConnectedView config={config} onDisconnected={loadConfig} />
                ) : (
                  <ConnectForm onConnected={loadConfig} />
                )}
              </div>

              {config?.configured && config?.active && (
                <div>
                  <p className="text-sm font-medium text-theme-text-primary light:text-slate-900 mb-2">
                    3. Linked users
                  </p>
                  <VerifiedUsersList />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
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
    <div className="flex flex-col gap-y-3 rounded-lg bg-theme-settings-input-bg p-4">
      <StatusRow
        label="Connected as"
        value={config?.botDisplayName || "LINE Official Account"}
        ok
      />
      {!!config?.basicId && (
        <StatusRow label="LINE Basic ID" value={config.basicId} ok />
      )}
      <StatusRow
        label="Linked users"
        value={String(config?.verifiedUserCount ?? 0)}
        ok={(config?.verifiedUserCount ?? 0) > 0}
      />
      <div className="pt-1">
        <Button
          type="button"
          variant="destructive"
          size="sm"
          onClick={handleDisconnect}
          disabled={disconnecting}
        >
          {disconnecting ? "Disconnecting..." : "Disconnect"}
        </Button>
      </div>
    </div>
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
      className="flex flex-col gap-y-4 rounded-lg bg-theme-settings-input-bg p-4"
    >
      <div>
        <Label htmlFor="line-access-token" className="block mb-2">
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
        />
        <p className="text-xs text-zinc-400 light:text-slate-600 mt-1">
          LINE Developers Console {"> "}your channel {"> "}Messaging API tab.
        </p>
      </div>

      <div>
        <Label htmlFor="line-channel-secret" className="block mb-2">
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
        />
        <p className="text-xs text-zinc-400 light:text-slate-600 mt-1">
          Same channel {"> "}Basic settings tab. Used to verify that webhook
          requests really came from LINE.
        </p>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      <div>
        <Button type="submit" size="sm" disabled={connecting}>
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
    if (!window.confirm("Un-pair this LINE user? They'll need to /link again to chat."))
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6 rounded-lg bg-theme-settings-input-bg">
        <Spinner size="sm" className="text-zinc-400 light:text-slate-400" />
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <p className="text-xs text-zinc-400 light:text-slate-600 rounded-lg bg-theme-settings-input-bg p-4">
        Nobody has linked their account yet. They can start from their own
        Settings {"> "}Connected apps page.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-y-2 rounded-lg bg-theme-settings-input-bg p-4">
      {users.map((u) => (
        <div
          key={u.lineUserId}
          className="flex items-center justify-between gap-x-3 py-1"
        >
          <p className="text-sm text-theme-text-primary light:text-slate-900 shrink-0">
            {u.username}
          </p>
          <div className="flex items-center gap-x-2">
            {u.accessibleWorkspaces?.length > 0 ? (
              <Select
                value={u.activeWorkspace || ""}
                onValueChange={(slug) =>
                  handleWorkspaceChange(u.lineUserId, slug)
                }
              >
                <SelectTrigger className="h-8 text-xs w-44">
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
            >
              {revokingId === u.lineUserId ? "Revoking..." : "Revoke"}
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

function StatusRow({ label, value, ok }) {
  return (
    <div className="flex items-center justify-between">
      <p className="text-sm text-theme-text-primary light:text-slate-900">
        {label}
      </p>
      <div className="flex items-center gap-x-2">
        <span
          className={`inline-block w-2 h-2 rounded-full ${
            ok ? "bg-green-500" : "bg-zinc-500"
          }`}
        />
        <p className="text-sm text-zinc-400 light:text-slate-600">{value}</p>
      </div>
    </div>
  );
}

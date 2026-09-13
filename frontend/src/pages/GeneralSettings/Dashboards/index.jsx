import { useCallback, useEffect, useMemo, useState } from "react";
import SettingsLayout from "@/components/layout/SettingsLayout";
import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import System from "@/models/system";
import { useTheme } from "@/hooks/useTheme";
import { API_BASE } from "@/utils/constants";
import { useTranslation } from "react-i18next";
import { ExternalLink, MonitorOff, RotateCw } from "lucide-react";

/**
 * Grafana dashboards embedded in Instance Settings.
 *
 * By default the server reverse-proxies Grafana under /grafana on the app's own
 * origin, so Grafana needs no port or hostname a browser can reach. The iframe
 * enters with a short-lived token from the dashboards endpoint, which the server
 * trades for a cookie scoped to /grafana. When GRAFANA_PUBLIC_URL is set the iframe
 * loads that URL directly instead.
 *
 * Access to *this page* is the permission gate (`system.monitoring`); Grafana itself
 * still decides what a viewer can see.
 *
 * When Grafana is unreachable the browser would otherwise paint its own
 * connection-refused page inside the iframe. Reachability is checked first - by the
 * server when it proxies, by the browser when it does not - and a Nexus-styled empty
 * state is shown instead.
 */
export default function Dashboards() {
  const { t } = useTranslation();
  const { isLight } = useTheme();
  const theme = isLight ? "light" : "dark";
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState({
    enabled: false,
    proxied: false,
    publicUrl: "",
    dashboards: [],
  });

  // Also the retry for a proxied Grafana: a fresh config carries a fresh entry
  // token and the server's latest reachability answer.
  const load = useCallback(async () => {
    const next = await System.dashboards();
    setConfig(next);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const dashboards = config.dashboards || [];
  const defaultUid = dashboards[0]?.uid;

  return (
    <SettingsLayout
      className="h-full min-h-0 flex flex-col"
      paneClassName="overflow-hidden flex flex-col"
    >
      <PageHeader
        title={t("dashboards.title")}
        description={t("dashboards.description")}
      />

      {loading ? (
        <p className="mt-6 text-sm text-theme-text-secondary">
          {t("common.loading", { defaultValue: "Loading…" })}
        </p>
      ) : !config.enabled || dashboards.length === 0 ? (
        <GrafanaStatusPanel
          title={t("dashboards.unavailable")}
          description={t("dashboards.unavailable-hint")}
        />
      ) : dashboards.length === 1 ? (
        <DashboardFrame
          dashboard={dashboards[0]}
          config={config}
          theme={theme}
          onReload={load}
        />
      ) : (
        <Tabs defaultValue={defaultUid} className="mt-4 flex-1 min-h-0">
          <TabsList>
            {dashboards.map((dashboard) => (
              <TabsTrigger key={dashboard.uid} value={dashboard.uid}>
                {dashboard.title}
              </TabsTrigger>
            ))}
          </TabsList>
          {dashboards.map((dashboard) => (
            <TabsContent
              key={dashboard.uid}
              value={dashboard.uid}
              className="flex-1 min-h-0"
            >
              <DashboardFrame
                dashboard={dashboard}
                config={config}
                theme={theme}
                onReload={load}
              />
            </TabsContent>
          ))}
        </Tabs>
      )}
    </SettingsLayout>
  );
}

function DashboardFrame({ dashboard, config, theme, onReload }) {
  const { t } = useTranslation();
  const { embedUrl, openUrl } = useMemo(
    () => dashboardUrls(config, dashboard, theme),
    [config, dashboard, theme]
  );
  const [status, setStatus] = useState("checking"); // checking | ready | error
  const [checkKey, setCheckKey] = useState(0);

  const retry = useCallback(() => {
    setStatus("checking");
    if (config.proxied) onReload();
    else setCheckKey((key) => key + 1);
  }, [config.proxied, onReload]);

  useEffect(() => {
    if (config.proxied) {
      setStatus(config.reachable ? "ready" : "error");
      return;
    }

    let cancelled = false;
    async function check() {
      const ok = await probeGrafana(config.publicUrl);
      if (!cancelled) setStatus(ok ? "ready" : "error");
    }
    check();
    return () => {
      cancelled = true;
    };
  }, [config, checkKey]);

  return (
    <div className="mt-4 flex-1 min-h-0 flex flex-col gap-3">
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          render={<a href={openUrl} target="_blank" rel="noreferrer" />}
        >
          {t("dashboards.open-grafana")}
          <ExternalLink />
        </Button>
      </div>

      {status === "checking" ? (
        <GrafanaStatusPanel
          title={t("dashboards.checking")}
          description={t("dashboards.checking-hint")}
        />
      ) : status === "error" ? (
        <GrafanaStatusPanel
          title={t("dashboards.load-error")}
          description={t("dashboards.load-error-hint")}
          actions={
            <>
              <button
                type="button"
                onClick={retry}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-theme-bg-secondary text-theme-text-primary rounded-lg hover:bg-theme-sidebar-item-hover transition-all duration-300 w-full md:w-auto"
              >
                <RotateCw className="w-4 h-4" />
                {t("dashboards.retry")}
              </button>
              <a
                href={openUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 px-4 py-2 bg-theme-bg-secondary text-theme-text-primary rounded-lg hover:bg-theme-sidebar-item-hover transition-all duration-300 w-full md:w-auto"
              >
                <ExternalLink className="w-4 h-4" />
                {t("dashboards.open-grafana")}
              </a>
            </>
          }
        />
      ) : (
        <iframe
          key={checkKey}
          title={dashboard.title}
          src={embedUrl}
          className="w-full flex-1 min-h-[70vh] rounded-lg border border-theme-sidebar-border bg-theme-bg-primary"
          referrerPolicy="no-referrer"
          allow="fullscreen"
        />
      )}
    </div>
  );
}

/**
 * In-pane empty/error state matching the 401/404 look (icon + title + copy +
 * actions), sized for the settings content area rather than a full-screen page.
 */
function GrafanaStatusPanel({ title, description, actions = null }) {
  return (
    <div className="mt-4 flex-1 min-h-[70vh] flex flex-col items-center justify-center gap-4 rounded-lg border border-theme-sidebar-border bg-theme-bg-primary text-theme-text-primary p-6 md:p-10 w-full">
      <MonitorOff className="w-16 h-16 text-theme-text-secondary" />
      <h2 className="text-xl md:text-2xl font-bold text-center">{title}</h2>
      {description ? (
        <p className="text-theme-text-secondary text-center px-4 max-w-lg">
          {description}
        </p>
      ) : null}
      {actions ? (
        <div className="flex flex-col md:flex-row gap-3 md:gap-4 mt-2 w-full md:w-auto justify-center">
          {actions}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Browser-side reachability check, used only when Grafana is loaded directly. Uses
 * no-cors so a live Grafana without CORS headers still counts as reachable (opaque
 * response). A refused connection / DNS failure rejects and we treat that as down.
 * @param {string} publicUrl
 * @returns {Promise<boolean>}
 */
async function probeGrafana(publicUrl) {
  const base = String(publicUrl || "").replace(/\/$/, "");
  if (!base) return false;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    await fetch(`${base}/api/health`, {
      method: "GET",
      mode: "no-cors",
      cache: "no-store",
      signal: controller.signal,
    });
    // Opaque 0-status still means the TCP/HTTP hop succeeded.
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * The origin the API - and so the /grafana proxy - lives on. Empty when the SPA is
 * served by the same origin, which is every deployment except `yarn dev`.
 */
function serverOrigin() {
  if (!/^https?:\/\//i.test(API_BASE)) return "";
  try {
    return new URL(API_BASE).origin;
  } catch {
    return "";
  }
}

function dashboardUrls(config, dashboard, theme) {
  const slug = dashboard.slug || dashboard.uid;
  const openPath = `/d/${dashboard.uid}/${slug}`;
  const embedPath = dashboard.publicToken
    ? `/public-dashboards/${dashboard.publicToken}?theme=${theme}`
    : `${openPath}?orgId=1&kiosk&theme=${theme}&from=now-6h&to=now&refresh=30s`;

  const base = String(config.publicUrl || "").replace(/\/$/, "");
  if (!config.proxied)
    return { openUrl: `${base}${openPath}`, embedUrl: `${base}${embedPath}` };

  // Both links enter through the handshake, which sets the /grafana cookie and then
  // redirects to the page asked for.
  const enter = (path) =>
    `${serverOrigin()}${base}/_nexus/enter?${new URLSearchParams({
      token: config.entryToken || "",
      next: `${base}${path}`,
    })}`;
  return { openUrl: enter(openPath), embedUrl: enter(embedPath) };
}

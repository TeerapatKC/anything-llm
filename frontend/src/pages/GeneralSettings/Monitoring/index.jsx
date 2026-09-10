import { useEffect, useMemo, useState } from "react";
import SettingsLayout from "@/components/layout/SettingsLayout";
import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import System from "@/models/system";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "react-i18next";
import { ExternalLink } from "lucide-react";

/**
 * Grafana dashboards embedded in Instance Settings.
 *
 * The iframe talks to Grafana on its published port. Access to *this page* is the
 * permission gate (`system.monitoring`); Grafana itself still decides what a
 * public/anonymous viewer can see.
 */
export default function Monitoring() {
  const { t } = useTranslation();
  const { isLight } = useTheme();
  const theme = isLight ? "light" : "dark";
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState({
    enabled: false,
    publicUrl: "",
    dashboards: [],
  });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const next = await System.monitoring();
      if (!cancelled) {
        setConfig(next);
        setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const dashboards = config.dashboards || [];
  const defaultUid = dashboards[0]?.uid;

  return (
    <SettingsLayout
      className="h-full min-h-0 flex flex-col"
      paneClassName="overflow-hidden flex flex-col"
    >
      <PageHeader
        title={t("monitoring.title")}
        description={t("monitoring.description")}
      />

      {loading ? (
        <p className="mt-6 text-sm text-theme-text-secondary">
          {t("common.loading", { defaultValue: "Loading…" })}
        </p>
      ) : !config.enabled || dashboards.length === 0 ? (
        <p className="mt-6 text-sm text-theme-text-secondary">
          {t("monitoring.unavailable")}
          <span className="block mt-1">{t("monitoring.unavailable-hint")}</span>
        </p>
      ) : dashboards.length === 1 ? (
        <DashboardFrame
          dashboard={dashboards[0]}
          publicUrl={config.publicUrl}
          theme={theme}
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
                publicUrl={config.publicUrl}
                theme={theme}
              />
            </TabsContent>
          ))}
        </Tabs>
      )}
    </SettingsLayout>
  );
}

function DashboardFrame({ dashboard, publicUrl, theme }) {
  const { t } = useTranslation();
  const { embedUrl, openUrl } = useMemo(
    () => dashboardUrls(publicUrl, dashboard, theme),
    [publicUrl, dashboard, theme]
  );

  return (
    <div className="mt-4 flex-1 min-h-0 flex flex-col gap-3">
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          render={<a href={openUrl} target="_blank" rel="noreferrer" />}
        >
          {t("monitoring.open-grafana")}
          <ExternalLink />
        </Button>
      </div>
      <iframe
        title={dashboard.title}
        src={embedUrl}
        className="w-full flex-1 min-h-[70vh] rounded-lg border border-theme-sidebar-border bg-theme-bg-primary"
        referrerPolicy="no-referrer"
        allow="fullscreen"
      />
    </div>
  );
}

function dashboardUrls(publicUrl, dashboard, theme) {
  const base = String(publicUrl || "").replace(/\/$/, "");
  const slug = dashboard.slug || dashboard.uid;
  const openUrl = `${base}/d/${dashboard.uid}/${slug}`;
  if (dashboard.publicToken) {
    return {
      openUrl,
      embedUrl: `${base}/public-dashboards/${dashboard.publicToken}?theme=${theme}`,
    };
  }
  return {
    openUrl,
    embedUrl: `${openUrl}?orgId=1&kiosk&theme=${theme}&from=now-6h&to=now&refresh=30s`,
  };
}

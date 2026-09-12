import { useEffect, useState } from "react";
import { Spinner } from "@/components/ui/spinner";
import Sidebar from "@/components/SettingsSidebar";
import Telegram from "@/models/telegram";
import { TelegramLogo } from "@/components/lib/BrandIcon";
import ConnectedView from "./ConnectedView";
import SetupView from "./SetupView";
import { useTranslation } from "react-i18next";

export default function TelegramBotSettings() {
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState(null);

  useEffect(() => {
    async function fetchData() {
      const configRes = await Telegram.getConfig();
      setConfig(configRes?.config || null);
      setLoading(false);
    }
    fetchData();
  }, []);

  const handleConnected = (newConfig) => setConfig(newConfig);
  const handleDisconnected = () => setConfig(null);

  if (loading) {
    return (
      <ConnectionsLayout>
        <div className="flex min-h-[240px] items-center justify-center">
          <Spinner size="lg" className="text-zinc-400 light:text-slate-400" />
        </div>
      </ConnectionsLayout>
    );
  }

  const hasConfig = config?.active && config?.bot_username;
  if (!hasConfig) {
    return (
      <ConnectionsLayout>
        <SetupView onConnected={handleConnected} />
      </ConnectionsLayout>
    );
  }

  return (
    <ConnectionsLayout>
      <ConnectedView
        config={config}
        onDisconnected={handleDisconnected}
        onReconnected={handleConnected}
      />
    </ConnectionsLayout>
  );
}

function ConnectionsLayout({ children }) {
  const { t } = useTranslation();
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-zinc-950 light:bg-slate-50">
      <Sidebar />
      <main className="min-w-0 flex-1 overflow-y-auto bg-zinc-900 light:bg-slate-50">
        <div className="mx-auto w-full max-w-6xl px-4 pb-16 pt-20 sm:px-6 min-[1100px]:px-10 min-[1100px]:pt-10">
          <header className="flex items-start gap-4 border-b border-white/20 pb-6 light:border-slate-300">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-white p-2">
              <TelegramLogo className="size-full" />
            </div>
            <div className="min-w-0 max-w-3xl">
              <p className="text-xs font-medium text-zinc-400 light:text-slate-500">
                {t("settings.channels")}
              </p>
              <h1 className="mt-1 text-lg font-semibold leading-7 text-theme-text-primary light:text-slate-900">
                {t("telegram.title")}
              </h1>
              <p className="mt-2 text-sm leading-6 text-zinc-400 light:text-slate-600">
                {t("telegram.description")}
              </p>
            </div>
          </header>
          {children}
        </div>
      </main>
    </div>
  );
}

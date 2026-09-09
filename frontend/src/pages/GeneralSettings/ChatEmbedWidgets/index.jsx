import { useState } from "react";
import { useTranslation } from "react-i18next";
import { SplitLayout } from "@/components/layout/SettingsLayout";
import { ChevronRight } from "lucide-react";
import EmbedConfigsView from "./EmbedConfigs";
import EmbedChatsView from "./EmbedChats";

export default function ChatEmbedWidgets() {
  const { t } = useTranslation();
  const [selectedView, setSelectedView] = useState("configs");

  return (
    <WidgetLayout>
      <div className="thin-scrollbar mt-10 flex min-w-0 flex-1 flex-col gap-4 overflow-x-hidden overflow-y-auto p-4 min-[900px]:flex-row min-[900px]:gap-x-6">
        <div className="flex w-full shrink-0 flex-col min-[900px]:h-[calc(100vh-90px)] min-[900px]:w-72">
          <div className="flex-none mb-4">
            <div className="text-theme-text-primary flex items-center gap-x-2">
              <p className="text-lg font-medium">
                {t("embeddable.navigation.title")}
              </p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 pb-4">
            <div className="space-y-4">
              <WidgetList
                selectedView={selectedView}
                handleClick={setSelectedView}
              />
            </div>
          </div>
        </div>
        <div className="flex min-w-0 w-full flex-1 flex-col gap-y-[18px] min-[900px]:mt-10">
          <div className="no-scroll min-w-0 flex-1 overflow-y-auto rounded-xl bg-theme-bg-secondary p-2 text-theme-text-primary sm:p-4">
            {selectedView === "configs" ? (
              <EmbedConfigsView />
            ) : (
              <EmbedChatsView />
            )}
          </div>
        </div>
      </div>
    </WidgetLayout>
  );
}

function WidgetLayout({ children }) {
  return (
    <SplitLayout id="workspace-widget-settings-container">
      {children}
    </SplitLayout>
  );
}

function WidgetList({ selectedView, handleClick }) {
  const { t } = useTranslation();
  const views = {
    configs: {
      title: t("embeddable.navigation.widgets"),
    },
    chats: {
      title: t("embeddable.navigation.history"),
    },
  };

  return (
    <div className="w-full rounded-xl bg-theme-bg-secondary text-theme-text-primary">
      {Object.entries(views).map(([view, settings], index) => (
        <div
          key={view}
          className={`py-3 px-4 flex items-center justify-between ${
            index === 0 ? "rounded-t-xl" : ""
          } ${
            index === Object.keys(views).length - 1
              ? "rounded-b-xl"
              : "border-b border-theme-sidebar-border"
          } cursor-pointer transition-all duration-300 hover:bg-theme-bg-primary ${
            selectedView === view ? "bg-white/10 light:bg-theme-bg-sidebar" : ""
          }`}
          onClick={() => handleClick?.(view)}
        >
          <div className="text-sm font-light">{settings.title}</div>
          <ChevronRight size={14} className="text-theme-text-secondary" />
        </div>
      ))}
    </div>
  );
}

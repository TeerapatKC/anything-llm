import { useTranslation } from "react-i18next";
import { useState } from "react";
import { Spinner } from "@/components/ui/spinner";
import { RotateCw, Search } from "lucide-react";

export default function ModelTableLayout({
  children,
  fetchModels = null,
  searchQuery = "",
  setSearchQuery = () => {},
  loading = false,
}) {
  const { t } = useTranslation();
  const [isRefreshing, setIsRefreshing] = useState(false);
  async function refreshModels() {
    setIsRefreshing(true);
    try {
      await fetchModels?.();
    } catch {
    } finally {
      setIsRefreshing(false);
    }
  }

  return (
    <div className="flex flex-col w-full">
      <div className="flex gap-x-2 items-center pb-[8px]">
        <label className="text-theme-text-primary text-base font-semibold">
          Available Models
        </label>
      </div>
      <div className="flex w-full items-center gap-x-[16px]">
        <div className="relative flex-1 grow">
          <Search
            size={16}
            color="var(--theme-text-primary)"
            className="absolute left-[9px] top-[10px] text-theme-settings-input-placeholder peer-focus:invisible"
          />
          <input
            type="search"
            placeholder={t("ui.search-models")}
            value={searchQuery}
            disabled={loading}
            className="min-h-[32px] border-none bg-theme-settings-input-bg text-theme-text-primary placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5 pl-[30px] py-2 search-input disabled:opacity-50 disabled:cursor-not-allowed"
            onChange={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setSearchQuery(e.target.value);
            }}
          />
        </div>
        {!!fetchModels && (
          <button
            type="button"
            onClick={refreshModels}
            disabled={isRefreshing || loading}
            className="border-none text-theme-text-secondary text-sm font-medium hover:bg-white/10 light:hover:bg-black/5 rounded-lg px-2 h-full flex items-center gap-x-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRefreshing ? (
              <Spinner size="sm" className="text-theme-text-secondary" />
            ) : (
              <RotateCw className="w-4 h-4 text-theme-text-secondary" />
            )}
            <span
              className={`text-sm font-medium ${isRefreshing ? "hidden" : "text-theme-text-secondary"}`}
            >
              Refresh Models
            </span>
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

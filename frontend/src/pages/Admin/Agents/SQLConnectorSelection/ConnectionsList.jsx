import React from "react";
import { useTranslation } from "react-i18next";
import { ChevronRight } from "lucide-react";
import { DB_LOGOS } from "./DBConnection";

/**
 * The connection list (left pane). Styled to match `AgentFlowsList` exactly -
 * same row chrome, same "On/Off" + chevron on the right - so Agent Flow and
 * SQL Connector read as one family of screens.
 */
export default function ConnectionsList({
  connections = [],
  selectedId,
  onSelect,
}) {
  const { t } = useTranslation();
  if (connections.length === 0) {
    return (
      <p className="text-theme-text-secondary text-center text-xs">
        {t("sql-connector.empty-list")}
      </p>
    );
  }

  return (
    <div className="bg-theme-bg-secondary text-theme-text-primary rounded-xl w-full">
      {connections.map((connection, index) => (
        <div
          key={connection.database_id}
          className={`py-3 px-4 flex items-center justify-between gap-x-2 ${
            index === 0 ? "rounded-t-xl" : ""
          } ${
            index === connections.length - 1
              ? "rounded-b-xl"
              : "border-b border-theme-sidebar-border"
          } cursor-pointer transition-all duration-300 hover:bg-theme-bg-primary ${
            selectedId === connection.database_id
              ? "bg-white/10 light:bg-theme-bg-sidebar"
              : ""
          }`}
          onClick={() => onSelect(connection.database_id)}
        >
          <div className="flex min-w-0 items-center gap-x-2">
            <img
              src={DB_LOGOS?.[connection.engine] ?? null}
              alt={`${connection.engine} logo`}
              className="h-6 w-6 shrink-0 rounded"
            />
            <div className="truncate text-sm font-light">
              {connection.database_id}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-x-2">
            <div className="text-sm text-theme-text-secondary font-medium">
              {connection.active !== false
                ? t("sql-connector.on")
                : t("sql-connector.off")}
            </div>
            <ChevronRight size={14} className="text-theme-text-secondary" />
          </div>
        </div>
      ))}
    </div>
  );
}

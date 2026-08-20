import React from "react";

export default function WorkspaceSettingsSectionHeader({
  title,
  description,
  actions,
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex min-w-0 flex-col gap-y-1">
        <h2 className="text-base font-semibold text-theme-text-primary">
          {title}
        </h2>
        <p className="text-xs text-theme-text-secondary">{description}</p>
      </div>
      {actions ? (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}

import { useTranslation } from "react-i18next";
import React from "react";

export default function FinishNode() {
  const { t } = useTranslation();
  return (
    <div className="text-sm text-theme-text-secondary">
      {t("help.finish-node")}
    </div>
  );
}

/* eslint-disable react-hooks/refs */
import React, { forwardRef } from "react";
import { useTranslation } from "react-i18next";
import { Label } from "@/components/ui/label";

const FlowInfoNode = forwardRef(({ config, onConfigChange }, refs) => {
  const { t } = useTranslation();
  return (
    <div className="space-y-4">
      <div>
        <Label className="block mb-2">{t("agent-builder.flowInfo.name")}</Label>
        <div className="flex flex-col text-xs text-theme-text-secondary mt-2 mb-3">
          <p className="">{t("agent-builder.flowInfo.name-help")}</p>
          <p>{t("agent-builder.flowInfo.name-examples")}</p>
        </div>
        <input
          id="agent-flow-name-input"
          ref={refs?.nameRef}
          type="text"
          placeholder={t("agent-builder.flowInfo.name-placeholder")}
          value={config?.name || ""}
          onChange={(e) =>
            onConfigChange({
              ...config,
              name: e.target.value,
            })
          }
          className="w-full border-none bg-theme-settings-input-bg text-theme-text-primary placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none p-2.5"
          autoComplete="off"
          spellCheck={false}
        />
      </div>

      <div>
        <Label className="block mb-2">
          {t("agent-builder.flowInfo.description")}
        </Label>
        <div className="flex flex-col text-xs text-theme-text-secondary mt-2 mb-3">
          <p className="">{t("agent-builder.flowInfo.description-help")}</p>
        </div>
        <textarea
          ref={refs?.descriptionRef}
          value={config?.description || ""}
          onChange={(e) =>
            onConfigChange({
              ...config,
              description: e.target.value,
            })
          }
          className="w-full border-none bg-theme-settings-input-bg text-theme-text-primary placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none p-2.5"
          rows={3}
          placeholder={t("agent-builder.flowInfo.description-placeholder")}
        />
      </div>
    </div>
  );
});

FlowInfoNode.displayName = "FlowInfoNode";
export default FlowInfoNode;

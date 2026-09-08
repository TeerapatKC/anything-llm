import React from "react";
import { useTranslation } from "react-i18next";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function WebsiteNode({
  config,
  onConfigChange,
  renderVariableSelect,
}) {
  const { t } = useTranslation();
  return (
    <div className="space-y-4">
      <div>
        <Label className="block mb-2">{t("agent-builder.common.url")}</Label>
        <input
          type="text"
          placeholder={t("agent-builder.website.url-placeholder")}
          value={config.url}
          onChange={(e) => onConfigChange({ url: e.target.value })}
          className="w-full p-2.5 text-sm rounded-lg bg-theme-bg-primary border border-white/5 text-theme-text-primary placeholder:text-white/20 focus:border-primary-button focus:ring-1 focus:ring-primary-button outline-none"
          autoComplete="off"
          spellCheck={false}
        />
      </div>
      <div>
        <Label className="block mb-2">
          {t("agent-builder.website.action")}
        </Label>
        <Select
          value={config.action}
          onValueChange={(value) => onConfigChange({ action: value })}
        >
          <SelectTrigger className="w-full p-2.5 text-sm rounded-lg bg-theme-bg-primary border border-white/5 text-theme-text-primary focus:border-primary-button focus:ring-1 focus:ring-primary-button outline-none">
            <SelectValue
              placeholder={t("agent-builder.common.select-option")}
            />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="read">
              {t("agent-builder.website.read-content")}
            </SelectItem>
            <SelectItem value="click">
              {t("agent-builder.website.click-element")}
            </SelectItem>
            <SelectItem value="type">
              {t("agent-builder.website.type-text")}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="block mb-2">
          {t("agent-builder.website.css-selector")}
        </Label>
        <input
          type="text"
          placeholder={t("agent-builder.website.selector-placeholder")}
          value={config.selector}
          onChange={(e) => onConfigChange({ selector: e.target.value })}
          className="w-full p-2.5 text-sm rounded-lg bg-theme-bg-primary border border-white/5 text-theme-text-primary placeholder:text-white/20 focus:border-primary-button focus:ring-1 focus:ring-primary-button outline-none"
          autoComplete="off"
          spellCheck={false}
        />
      </div>
      <div>
        <Label className="block mb-2">
          {t("agent-builder.common.store-result-in")}
        </Label>
        {renderVariableSelect(
          config.resultVariable,
          (value) => onConfigChange({ resultVariable: value }),
          t("agent-builder.common.select-or-create-variable")
        )}
      </div>
    </div>
  );
}

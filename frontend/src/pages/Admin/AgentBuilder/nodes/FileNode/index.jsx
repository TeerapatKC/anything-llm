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

export default function FileNode({
  config,
  onConfigChange,
  renderVariableSelect,
}) {
  const { t } = useTranslation();
  return (
    <div className="space-y-4">
      <div>
        <Label className="block mb-2">
          {t("agent-builder.file.operation")}
        </Label>
        <Select
          value={config.operation}
          onValueChange={(value) => onConfigChange({ operation: value })}
        >
          <SelectTrigger className="w-full p-2.5 text-sm rounded-lg bg-theme-bg-primary border border-white/5 text-theme-text-primary focus:border-primary-button focus:ring-1 focus:ring-primary-button outline-none">
            <SelectValue
              placeholder={t("agent-builder.common.select-option")}
            />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="read">{t("agent-builder.file.read")}</SelectItem>
            <SelectItem value="write">
              {t("agent-builder.file.write")}
            </SelectItem>
            <SelectItem value="append">
              {t("agent-builder.file.append")}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="block mb-2">{t("agent-builder.file.path")}</Label>
        <input
          type="text"
          placeholder={t("agent-builder.file.path-placeholder")}
          value={config.path}
          onChange={(e) => onConfigChange({ path: e.target.value })}
          className="w-full p-2.5 text-sm rounded-lg bg-theme-bg-primary border border-white/5 text-theme-text-primary placeholder:text-white/20 focus:border-primary-button focus:ring-1 focus:ring-primary-button outline-none"
          autoComplete="off"
          spellCheck={false}
        />
      </div>
      {config.operation !== "read" && (
        <div>
          <Label className="block mb-2">
            {t("agent-builder.file.content")}
          </Label>
          <textarea
            placeholder={t("agent-builder.file.content-placeholder")}
            value={config.content}
            onChange={(e) => onConfigChange({ content: e.target.value })}
            className="w-full p-2.5 text-sm rounded-lg bg-theme-bg-primary border border-white/5 text-theme-text-primary placeholder:text-white/20 focus:border-primary-button focus:ring-1 focus:ring-primary-button outline-none"
            rows={3}
            autoComplete="off"
            spellCheck={false}
          />
        </div>
      )}
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

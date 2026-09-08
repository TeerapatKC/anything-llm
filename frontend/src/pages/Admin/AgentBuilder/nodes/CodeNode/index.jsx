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

export default function CodeNode({
  config,
  onConfigChange,
  renderVariableSelect,
}) {
  const { t } = useTranslation();
  return (
    <div className="space-y-4">
      <div>
        <Label className="block mb-2">{t("agent-builder.code.language")}</Label>
        <Select
          value={config.language}
          onValueChange={(value) => onConfigChange({ language: value })}
        >
          <SelectTrigger className="w-full p-2.5 text-sm rounded-lg bg-theme-bg-primary border border-white/5 text-theme-text-primary focus:border-primary-button focus:ring-1 focus:ring-primary-button outline-none">
            <SelectValue
              placeholder={t("agent-builder.common.select-option")}
            />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="javascript">
              {t("agent-builder.code.javascript")}
            </SelectItem>
            <SelectItem value="python">
              {t("agent-builder.code.python")}
            </SelectItem>
            <SelectItem value="shell">
              {t("agent-builder.code.shell")}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="block mb-2">{t("agent-builder.code.code")}</Label>
        <textarea
          placeholder={t("agent-builder.code.code-placeholder")}
          value={config.code}
          onChange={(e) => onConfigChange({ code: e.target.value })}
          className="w-full p-2.5 text-sm rounded-lg bg-theme-bg-primary border border-white/5 text-theme-text-primary placeholder:text-white/20 focus:border-primary-button focus:ring-1 focus:ring-primary-button outline-none font-mono"
          rows={5}
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

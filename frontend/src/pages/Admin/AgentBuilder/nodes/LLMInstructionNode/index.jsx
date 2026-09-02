import React from "react";
import { useTranslation } from "react-i18next";
import VariableInput from "../../VariableInput";
import { Label } from "@/components/ui/label";

export default function LLMInstructionNode({
  config,
  onConfigChange,
  renderVariableSelect,
}) {
  const { t } = useTranslation();
  return (
    <div className="space-y-4">
      <div>
        <Label className="block mb-2">
          {t("agent-builder.llmInstruction.instruction")}
        </Label>
        <VariableInput
          multiline
          rows={3}
          value={config?.instruction || ""}
          onChange={(e) =>
            onConfigChange({
              ...config,
              instruction: e.target.value,
            })
          }
          placeholder={t(
            "agent-builder.llmInstruction.instruction-placeholder"
          )}
        />
      </div>

      <div>
        <Label className="block mb-2">
          {t("agent-builder.common.result-variable")}
        </Label>
        {renderVariableSelect(
          config.resultVariable,
          (value) => onConfigChange({ ...config, resultVariable: value }),
          t("agent-builder.common.select-or-create-variable"),
          true
        )}
      </div>
    </div>
  );
}

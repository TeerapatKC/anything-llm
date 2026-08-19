import React from "react";
import VariableInput from "../../VariableInput";
import { Label } from "@/components/ui/label";

export default function LLMInstructionNode({
  config,
  onConfigChange,
  renderVariableSelect,
}) {
  return (
    <div className="space-y-4">
      <div>
        <Label className="block mb-2">Instruction</Label>
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
          placeholder="Enter instructions for the LLM..."
        />
      </div>

      <div>
        <Label className="block mb-2">Result Variable</Label>
        {renderVariableSelect(
          config.resultVariable,
          (value) => onConfigChange({ ...config, resultVariable: value }),
          "Select or create variable",
          true
        )}
      </div>
    </div>
  );
}

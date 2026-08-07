import React from "react";
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
  return (
    <div className="space-y-4">
      <div>
        <Label variant="field" className="block mb-2">
          Language
        </Label>
        <Select
          value={config.language}
          onValueChange={(value) => onConfigChange({ language: value })}
        >
          <SelectTrigger className="w-full p-2.5 text-sm rounded-lg bg-theme-bg-primary border border-white/5 text-white focus:border-primary-button focus:ring-1 focus:ring-primary-button outline-none">
            <SelectValue placeholder="Select an option" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="javascript">JavaScript</SelectItem>
            <SelectItem value="python">Python</SelectItem>
            <SelectItem value="shell">Shell</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label variant="field" className="block mb-2">
          Code
        </Label>
        <textarea
          placeholder="Enter code..."
          value={config.code}
          onChange={(e) => onConfigChange({ code: e.target.value })}
          className="w-full p-2.5 text-sm rounded-lg bg-theme-bg-primary border border-white/5 text-white placeholder:text-white/20 focus:border-primary-button focus:ring-1 focus:ring-primary-button outline-none font-mono"
          rows={5}
          autoComplete="off"
          spellCheck={false}
        />
      </div>
      <div>
        <Label variant="field" className="block mb-2">
          Store Result In
        </Label>
        {renderVariableSelect(
          config.resultVariable,
          (value) => onConfigChange({ resultVariable: value }),
          "Select or create variable"
        )}
      </div>
    </div>
  );
}

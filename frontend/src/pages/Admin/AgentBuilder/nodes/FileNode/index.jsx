import React from "react";
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
  return (
    <div className="space-y-4">
      <div>
        <Label variant="field" className="block mb-2">
          Operation
        </Label>
        <Select
          value={config.operation}
          onValueChange={(value) => onConfigChange({ operation: value })}
        >
          <SelectTrigger className="w-full p-2.5 text-sm rounded-lg bg-theme-bg-primary border border-white/5 text-white focus:border-primary-button focus:ring-1 focus:ring-primary-button outline-none">
            <SelectValue placeholder="Select an option" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="read">Read File</SelectItem>
            <SelectItem value="write">Write File</SelectItem>
            <SelectItem value="append">Append to File</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label variant="field" className="block mb-2">
          File Path
        </Label>
        <input
          type="text"
          placeholder="/path/to/file"
          value={config.path}
          onChange={(e) => onConfigChange({ path: e.target.value })}
          className="w-full p-2.5 text-sm rounded-lg bg-theme-bg-primary border border-white/5 text-white placeholder:text-white/20 focus:border-primary-button focus:ring-1 focus:ring-primary-button outline-none"
          autoComplete="off"
          spellCheck={false}
        />
      </div>
      {config.operation !== "read" && (
        <div>
          <Label variant="field" className="block mb-2">
            Content
          </Label>
          <textarea
            placeholder="File content..."
            value={config.content}
            onChange={(e) => onConfigChange({ content: e.target.value })}
            className="w-full p-2.5 text-sm rounded-lg bg-theme-bg-primary border border-white/5 text-white placeholder:text-white/20 focus:border-primary-button focus:ring-1 focus:ring-primary-button outline-none"
            rows={3}
            autoComplete="off"
            spellCheck={false}
          />
        </div>
      )}
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

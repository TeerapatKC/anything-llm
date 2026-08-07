import React from "react";
import { Label } from "@/components/ui/label";

export default function WebsiteNode({
  config,
  onConfigChange,
  renderVariableSelect,
}) {
  return (
    <div className="space-y-4">
      <div>
        <Label variant="field" className="block mb-2">
          URL
        </Label>
        <input
          type="text"
          placeholder="https://example.com"
          value={config.url}
          onChange={(e) => onConfigChange({ url: e.target.value })}
          className="w-full p-2.5 text-sm rounded-lg bg-theme-bg-primary border border-white/5 text-white placeholder:text-white/20 focus:border-primary-button focus:ring-1 focus:ring-primary-button outline-none"
          autoComplete="off"
          spellCheck={false}
        />
      </div>
      <div>
        <Label variant="field" className="block mb-2">
          Action
        </Label>
        <select
          value={config.action}
          onChange={(e) => onConfigChange({ action: e.target.value })}
          className="w-full p-2.5 text-sm rounded-lg bg-theme-bg-primary border border-white/5 text-white focus:border-primary-button focus:ring-1 focus:ring-primary-button outline-none"
        >
          <option value="read" className="bg-theme-bg-primary">
            Read Content
          </option>
          <option value="click" className="bg-theme-bg-primary">
            Click Element
          </option>
          <option value="type" className="bg-theme-bg-primary">
            Type Text
          </option>
        </select>
      </div>
      <div>
        <Label variant="field" className="block mb-2">
          CSS Selector
        </Label>
        <input
          type="text"
          placeholder="#element-id or .class-name"
          value={config.selector}
          onChange={(e) => onConfigChange({ selector: e.target.value })}
          className="w-full p-2.5 text-sm rounded-lg bg-theme-bg-primary border border-white/5 text-white placeholder:text-white/20 focus:border-primary-button focus:ring-1 focus:ring-primary-button outline-none"
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

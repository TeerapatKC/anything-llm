/* eslint-disable react-hooks/refs */
import React, { useRef, useState } from "react";
import { ChevronDown, Plus, X } from "lucide-react";
import VariableInput from "../../VariableInput";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function ApiCallNode({
  config,
  onConfigChange,
  renderVariableSelect,
}) {
  const urlInputRef = useRef(null);
  const [showVarMenu, setShowVarMenu] = useState(false);
  const varButtonRef = useRef(null);

  const handleHeaderChange = (index, field, value) => {
    const newHeaders = [...(config.headers || [])];
    newHeaders[index] = { ...newHeaders[index], [field]: value };
    onConfigChange({ headers: newHeaders });
  };

  const addHeader = () => {
    const newHeaders = [...(config.headers || []), { key: "", value: "" }];
    onConfigChange({ headers: newHeaders });
  };

  const removeHeader = (index) => {
    const newHeaders = [...(config.headers || [])].filter(
      (_, i) => i !== index
    );
    onConfigChange({ headers: newHeaders });
  };

  const insertVariableAtCursor = (variableName) => {
    if (!urlInputRef.current) return;

    const input = urlInputRef.current;
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const currentValue = config.url;

    const newValue =
      currentValue.substring(0, start) +
      "${" +
      variableName +
      "}" +
      currentValue.substring(end);

    onConfigChange({ url: newValue });
    setShowVarMenu(false);

    // Set cursor position after the inserted variable
    setTimeout(() => {
      const newPosition = start + variableName.length + 3; // +3 for ${}
      input.setSelectionRange(newPosition, newPosition);
      input.focus();
    }, 0);
  };

  return (
    <div className="space-y-4">
      <div>
        <Label variant="field" className="block mb-2">
          URL
        </Label>
        <div className="flex gap-2">
          <VariableInput
            ref={urlInputRef}
            className="flex-1"
            placeholder="https://api.example.com/endpoint"
            value={config.url}
            onChange={(e) => onConfigChange({ url: e.target.value })}
          />
          <div className="relative">
            <button
              ref={varButtonRef}
              onClick={() => setShowVarMenu(!showVarMenu)}
              className="h-full px-3 rounded-lg border-none bg-theme-settings-input-bg text-theme-text-primary hover:bg-theme-action-menu-item-hover transition-colors duration-300 flex items-center gap-1"
              title="Insert variable"
            >
              <Plus className="w-4 h-4" />
              <ChevronDown className="w-3 h-3" />
            </button>
            {showVarMenu && (
              <div className="absolute right-0 top-[calc(100%+4px)] w-48 bg-theme-settings-input-bg border-none rounded-lg shadow-lg z-10">
                {renderVariableSelect(
                  "",
                  insertVariableAtCursor,
                  "Select variable to insert",
                  true
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div>
        <Label variant="field" className="block mb-2">
          Method
        </Label>
        <Select
          value={config.method}
          onValueChange={(value) => onConfigChange({ method: value })}
        >
          <SelectTrigger variant="settings">
            <SelectValue placeholder="Select an option" />
          </SelectTrigger>
          <SelectContent>
            {["GET", "POST", "DELETE", "PUT", "PATCH"].map((method) => (
              <SelectItem key={method} value={method}>
                {method}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-theme-text-primary">
            Headers
          </label>
          <button
            onClick={addHeader}
            className="p-1.5 rounded-lg border-none bg-theme-settings-input-bg text-theme-text-primary hover:bg-theme-action-menu-item-hover transition-colors duration-300"
            title="Add header"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="space-y-2">
          {(config.headers || []).map((header, index) => (
            <div key={index} className="flex gap-2">
              <input
                type="text"
                placeholder="Header name"
                value={header.key}
                onChange={(e) =>
                  handleHeaderChange(index, "key", e.target.value)
                }
                className="flex-1 border-none bg-theme-settings-input-bg text-theme-text-primary placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none p-2.5"
                autoComplete="off"
                spellCheck={false}
              />
              <VariableInput
                className="flex-1"
                placeholder="Value"
                value={header.value}
                onChange={(e) =>
                  handleHeaderChange(index, "value", e.target.value)
                }
              />
              <button
                onClick={() => removeHeader(index)}
                className="p-2.5 rounded-lg border-none bg-theme-settings-input-bg text-theme-text-primary hover:text-red-500 hover:border-red-500/20 hover:bg-red-500/10 transition-colors duration-300"
                title="Remove header"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {["POST", "PUT", "PATCH"].includes(config.method) && (
        <div>
          <Label variant="field" className="block mb-2">
            Request Body
          </Label>
          <div className="space-y-2">
            <Select
              value={config.bodyType || "json"}
              onValueChange={(value) => onConfigChange({ bodyType: value })}
            >
              <SelectTrigger className="w-full p-2.5 text-sm rounded-lg bg-theme-bg-primary border border-white/5 text-theme-text-primary focus:border-primary-button focus:ring-1 focus:ring-primary-button outline-none light:bg-theme-settings-input-bg light:border-black/10">
                <SelectValue placeholder="Select an option" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="json">JSON</SelectItem>
                <SelectItem value="text">Raw Text</SelectItem>
                <SelectItem value="form">Form Data</SelectItem>
              </SelectContent>
            </Select>
            {config.bodyType === "json" ? (
              <VariableInput
                multiline
                mono
                rows={4}
                placeholder='{"key": "value"}'
                value={config.body}
                onChange={(e) => onConfigChange({ body: e.target.value })}
              />
            ) : config.bodyType === "form" ? (
              <div className="space-y-2">
                {(config.formData || []).map((item, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Key"
                      value={item.key}
                      onChange={(e) => {
                        const newFormData = [...(config.formData || [])];
                        newFormData[index] = { ...item, key: e.target.value };
                        onConfigChange({ formData: newFormData });
                      }}
                      className="flex-1 p-2.5 text-sm rounded-lg bg-theme-bg-primary border border-white/5 text-theme-text-primary placeholder:text-theme-text-secondary/20 focus:border-primary-button focus:ring-1 focus:ring-primary-button outline-none light:bg-theme-settings-input-bg light:border-black/10"
                      autoComplete="off"
                      spellCheck={false}
                    />
                    <VariableInput
                      className="flex-1"
                      placeholder="Value"
                      value={item.value}
                      onChange={(e) => {
                        const newFormData = [...(config.formData || [])];
                        newFormData[index] = { ...item, value: e.target.value };
                        onConfigChange({ formData: newFormData });
                      }}
                    />
                    <button
                      onClick={() => {
                        const newFormData = [...(config.formData || [])].filter(
                          (_, i) => i !== index
                        );
                        onConfigChange({ formData: newFormData });
                      }}
                      className="p-2.5 rounded-lg bg-theme-bg-primary border border-white/5 text-theme-text-primary hover:text-red-500 hover:border-red-500/20 hover:bg-red-500/10 transition-colors duration-300 light:bg-theme-settings-input-bg light:border-black/10"
                      title="Remove field"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => {
                    const newFormData = [
                      ...(config.formData || []),
                      { key: "", value: "" },
                    ];
                    onConfigChange({ formData: newFormData });
                  }}
                  className="w-full p-2.5 rounded-lg border-none bg-theme-settings-input-bg text-theme-text-primary hover:bg-theme-action-menu-item-hover transition-colors duration-300 text-sm"
                >
                  Add Form Field
                </button>
              </div>
            ) : (
              <VariableInput
                multiline
                rows={4}
                placeholder="Raw request body..."
                value={config.body}
                onChange={(e) => onConfigChange({ body: e.target.value })}
              />
            )}
          </div>
        </div>
      )}

      <div>
        <Label variant="field" className="block mb-2">
          Store Response In
        </Label>
        {renderVariableSelect(
          config.responseVariable,
          (value) => onConfigChange({ responseVariable: value }),
          "Select or create variable"
        )}
      </div>
    </div>
  );
}

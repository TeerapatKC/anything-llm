/* eslint-disable react-hooks/refs */
import React, { useRef } from "react";
import { useTranslation } from "react-i18next";
import { Plus, X } from "lucide-react";
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
  const { t } = useTranslation();
  const urlInputRef = useRef(null);

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
        <Label className="block mb-2">{t("agent-builder.common.url")}</Label>
        <div className="flex gap-2">
          <VariableInput
            ref={urlInputRef}
            className="flex-1"
            placeholder={t("agent-builder.apiCall.url-placeholder")}
            value={config.url}
            onChange={(e) => onConfigChange({ url: e.target.value })}
          />
          {/* `renderVariableSelect` is a `Select`, which already owns its popup -
              a second hand-rolled dropdown around it just added a layer that
              could be clipped. */}
          <div className="w-48 shrink-0">
            {renderVariableSelect(
              "",
              insertVariableAtCursor,
              t("agent-builder.common.insert-variable"),
              true
            )}
          </div>
        </div>
      </div>

      <div>
        <Label className="block mb-2">
          {t("agent-builder.apiCall.method")}
        </Label>
        <Select
          value={config.method}
          onValueChange={(value) => onConfigChange({ method: value })}
        >
          <SelectTrigger>
            <SelectValue
              placeholder={t("agent-builder.common.select-option")}
            />
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
            {t("agent-builder.apiCall.headers")}
          </label>
          <button
            onClick={addHeader}
            className="p-1.5 rounded-lg border-none bg-theme-settings-input-bg text-theme-text-primary hover:bg-theme-action-menu-item-hover transition-colors duration-300"
            title={t("agent-builder.apiCall.add-header")}
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="space-y-2">
          {(config.headers || []).map((header, index) => (
            <div key={index} className="flex gap-2">
              <input
                type="text"
                placeholder={t("agent-builder.apiCall.header-name")}
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
                placeholder={t("agent-builder.apiCall.value")}
                value={header.value}
                onChange={(e) =>
                  handleHeaderChange(index, "value", e.target.value)
                }
              />
              <button
                onClick={() => removeHeader(index)}
                className="p-2.5 rounded-lg border-none bg-theme-settings-input-bg text-theme-text-primary hover:text-red-500 hover:border-red-500/20 hover:bg-red-500/10 transition-colors duration-300"
                title={t("agent-builder.apiCall.remove-header")}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {["POST", "PUT", "PATCH"].includes(config.method) && (
        <div>
          <Label className="block mb-2">
            {t("agent-builder.apiCall.request-body")}
          </Label>
          <div className="space-y-2">
            <Select
              value={config.bodyType || "json"}
              onValueChange={(value) => onConfigChange({ bodyType: value })}
            >
              <SelectTrigger className="w-full p-2.5 text-sm rounded-lg bg-theme-bg-primary border border-white/5 text-theme-text-primary focus:border-primary-button focus:ring-1 focus:ring-primary-button outline-none light:bg-theme-settings-input-bg light:border-black/10">
                <SelectValue
                  placeholder={t("agent-builder.common.select-option")}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="json">
                  {t("agent-builder.apiCall.json")}
                </SelectItem>
                <SelectItem value="text">
                  {t("agent-builder.apiCall.raw-text")}
                </SelectItem>
                <SelectItem value="form">
                  {t("agent-builder.apiCall.form-data")}
                </SelectItem>
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
                      placeholder={t("agent-builder.apiCall.key")}
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
                      placeholder={t("agent-builder.apiCall.value")}
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
                      title={t("agent-builder.apiCall.remove-field")}
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
                  {t("agent-builder.apiCall.add-form-field")}
                </button>
              </div>
            ) : (
              <VariableInput
                multiline
                rows={4}
                placeholder={t("agent-builder.apiCall.raw-body-placeholder")}
                value={config.body}
                onChange={(e) => onConfigChange({ body: e.target.value })}
              />
            )}
          </div>
        </div>
      )}

      <div>
        <Label className="block mb-2">
          {t("agent-builder.apiCall.store-response-in")}
        </Label>
        {renderVariableSelect(
          config.responseVariable,
          (value) => onConfigChange({ responseVariable: value }),
          t("agent-builder.common.select-or-create-variable")
        )}
      </div>
    </div>
  );
}

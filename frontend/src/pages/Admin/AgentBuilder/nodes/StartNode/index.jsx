import React, { Fragment } from "react";
import { useTranslation } from "react-i18next";
import { Plus, X } from "lucide-react";
import { VARIABLE_HIGHLIGHT_CLASS } from "../../VariableInput";

const INPUT_CLASS =
  "border-none bg-theme-settings-input-bg text-theme-text-primary placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none p-2.5";

export default function StartNode({
  config,
  onConfigChange,
  onDeleteVariable,
}) {
  const { t } = useTranslation();
  const variableTypes = [
    {
      value: "required",
      label: t("agent-builder.start.required"),
      hint: t("agent-builder.start.required-hint"),
    },
    {
      value: "optional",
      label: t("agent-builder.start.optional"),
      hint: t("agent-builder.start.optional-hint"),
    },
    {
      value: "static",
      label: t("agent-builder.start.static"),
      hint: t("agent-builder.start.static-hint"),
    },
  ];
  const handleDeleteVariable = (index, variableName) => {
    // First clean up references, then delete the variable
    onDeleteVariable(variableName);
    const newVars = config.variables.filter((_, i) => i !== index);
    onConfigChange({ variables: newVars });
  };

  const updateVariable = (index, updates) => {
    const newVars = [...config.variables];
    newVars[index] = { ...newVars[index], ...updates };
    onConfigChange({ variables: newVars });
  };

  const definedVariables = config.variables.filter((v) => v.name);
  const exampleVariables = definedVariables.slice(0, 3);

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-theme-text-primary">
            Variables
          </h3>
          <button
            type="button"
            onClick={() =>
              onConfigChange({
                variables: [
                  ...config.variables,
                  {
                    name: "",
                    value: "",
                    type: "optional",
                    description: "",
                  },
                ],
              })
            }
            className="rounded-lg border-none bg-theme-settings-input-bg p-1.5 text-theme-text-primary transition-colors duration-300 hover:bg-theme-action-menu-item-hover"
            title={t("agent-builder.start.add-variable")}
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
        <p className="text-xs text-theme-text-secondary">
          Define values here, then reference them in any block below by wrapping
          the name in{" "}
          <span
            className={`${VARIABLE_HIGHLIGHT_CLASS} px-1 py-0.5 text-theme-text-primary`}
          >
            {"${variableName}"}
          </span>
          . References are highlighted as you type.
        </p>
        <p className="text-xs text-theme-text-secondary">
          {t("agent-builder.start.categories-help")}
        </p>
        {exampleVariables.length > 0 && (
          <p className="text-xs text-theme-text-secondary">
            For example:{" "}
            {exampleVariables.map((variable, index) => (
              <Fragment key={variable.name}>
                <span
                  className={`${VARIABLE_HIGHLIGHT_CLASS} px-1 py-0.5 text-theme-text-primary`}
                >
                  {`\${${variable.name}}`}
                </span>
                {index < exampleVariables.length - 1 && ", "}
              </Fragment>
            ))}
          </p>
        )}
      </div>
      {config.variables.map((variable, index) => {
        const type = variable.type || "optional";
        return (
          <div
            key={index}
            className="space-y-2 rounded-lg border border-theme-sidebar-border p-3"
          >
            <div className="flex gap-2">
              <input
                type="text"
                placeholder={t("agent-builder.start.variable-name")}
                value={variable.name}
                onChange={(event) =>
                  updateVariable(index, { name: event.target.value })
                }
                className={`min-w-0 flex-1 ${INPUT_CLASS}`}
                autoComplete="off"
                spellCheck={false}
              />
              <select
                value={type}
                onChange={(event) =>
                  updateVariable(index, { type: event.target.value })
                }
                title={
                  variableTypes.find((option) => option.value === type)?.hint
                }
                className={INPUT_CLASS}
              >
                {variableTypes.map((option) => (
                  <option
                    key={option.value}
                    value={option.value}
                    className="bg-theme-bg-primary"
                  >
                    {option.label}
                  </option>
                ))}
              </select>
              {config.variables.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleDeleteVariable(index, variable.name)}
                  className="rounded-lg border-none bg-theme-settings-input-bg p-2.5 text-theme-text-primary transition-colors duration-300 hover:border-red-500/20 hover:bg-red-500/10 hover:text-red-500"
                  title={t("agent-builder.start.delete-variable")}
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            {type !== "required" && (
              <input
                type="text"
                placeholder={
                  type === "static"
                    ? t("agent-builder.start.value")
                    : t("agent-builder.start.initial-value")
                }
                value={variable.value}
                onChange={(event) =>
                  updateVariable(index, { value: event.target.value })
                }
                className={`w-full ${INPUT_CLASS}`}
                autoComplete="off"
                spellCheck={false}
              />
            )}
            {type !== "static" && (
              <input
                type="text"
                placeholder={t("agent-builder.start.description-placeholder")}
                value={variable.description || ""}
                onChange={(event) =>
                  updateVariable(index, { description: event.target.value })
                }
                className={`w-full ${INPUT_CLASS}`}
                autoComplete="off"
                spellCheck={false}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

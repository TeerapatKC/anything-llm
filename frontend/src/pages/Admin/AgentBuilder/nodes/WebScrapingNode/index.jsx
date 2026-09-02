import Toggle from "@/components/lib/Toggle";
import { useTranslation } from "react-i18next";
import VariableInput from "../../VariableInput";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function WebScrapingNode({
  config,
  onConfigChange,
  renderVariableSelect,
}) {
  const { t } = useTranslation();
  return (
    <div className="space-y-4">
      <div>
        <Label className="block mb-2">
          {t("agent-builder.webScraping.url-to-scrape")}
        </Label>
        <VariableInput
          value={config?.url || ""}
          onChange={(e) =>
            onConfigChange({
              ...config,
              url: e.target.value,
            })
          }
          placeholder={t("agent-builder.website.url-placeholder")}
        />
      </div>

      <div>
        <Label className="block mb-2">
          {t("agent-builder.webScraping.capture-as")}
        </Label>
        <Select
          value={config.captureAs}
          onValueChange={(value) =>
            onConfigChange({ ...config, captureAs: value })
          }
        >
          <SelectTrigger>
            <SelectValue
              placeholder={t("agent-builder.common.select-option")}
            />
          </SelectTrigger>
          <SelectContent>
            {[
              {
                label: t("agent-builder.webScraping.capture-text"),
                value: "text",
              },
              {
                label: t("agent-builder.webScraping.capture-html"),
                value: "html",
              },
              {
                label: t("agent-builder.webScraping.capture-selector"),
                value: "querySelector",
              },
            ].map((captureAs) => (
              <SelectItem key={captureAs.value} value={captureAs.value}>
                {captureAs.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {config.captureAs === "querySelector" && (
        <div>
          <Label className="block mb-2">
            {t("agent-builder.webScraping.query-selector")}
          </Label>
          <p className="text-xs text-theme-text-secondary mb-2">
            {t("agent-builder.webScraping.query-selector-help")}
          </p>
          <VariableInput
            value={config.querySelector}
            onChange={(e) =>
              onConfigChange({ ...config, querySelector: e.target.value })
            }
            placeholder={t(
              "agent-builder.webScraping.query-selector-placeholder"
            )}
          />
        </div>
      )}

      <Toggle
        size="md"
        variant="horizontal"
        label={t("agent-builder.webScraping.summarization")}
        hint={
          <p className="text-sm">
            {t("agent-builder.webScraping.summarization-hint")}
            <br />
            <br />
            {t("agent-builder.webScraping.summarization-note")}
          </p>
        }
        enabled={config.enableSummarization ?? true}
        onChange={(checked) =>
          onConfigChange({ ...config, enableSummarization: checked })
        }
      />
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

import Toggle from "@/components/lib/Toggle";
import VariableInput from "../../VariableInput";
import { Label } from "@/components/ui/label";

export default function WebScrapingNode({
  config,
  onConfigChange,
  renderVariableSelect,
}) {
  return (
    <div className="space-y-4">
      <div>
        <Label variant="field" className="block mb-2">
          URL to Scrape
        </Label>
        <VariableInput
          value={config?.url || ""}
          onChange={(e) =>
            onConfigChange({
              ...config,
              url: e.target.value,
            })
          }
          placeholder="https://example.com"
        />
      </div>

      <div>
        <Label variant="field" className="block mb-2">
          Capture Page Content As
        </Label>
        <select
          value={config.captureAs}
          onChange={(e) =>
            onConfigChange({ ...config, captureAs: e.target.value })
          }
          className="w-full border-none bg-theme-settings-input-bg text-theme-text-primary text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none p-2.5"
        >
          {[
            { label: "Text content only", value: "text" },
            { label: "Raw HTML", value: "html" },
            { label: "CSS Query Selector", value: "querySelector" },
          ].map((captureAs) => (
            <option
              key={captureAs.value}
              value={captureAs.value}
              className="bg-theme-settings-input-bg"
            >
              {captureAs.label}
            </option>
          ))}
        </select>
      </div>

      {config.captureAs === "querySelector" && (
        <div>
          <Label variant="field" className="block mb-2">
            Query Selector
          </Label>
          <p className="text-xs text-theme-text-secondary mb-2">
            Enter a valid CSS selector to scrape the content of the page.
          </p>
          <VariableInput
            value={config.querySelector}
            onChange={(e) =>
              onConfigChange({ ...config, querySelector: e.target.value })
            }
            placeholder=".article-content, #content, .main-content, etc."
          />
        </div>
      )}

      <Toggle
        size="md"
        variant="horizontal"
        label="Content Summarization"
        hint={
          <p className="text-sm">
            When enabled, long webpage content will be automatically summarized
            to reduce token usage.
            <br />
            <br />
            Note: This may affect data quality and remove specific details from
            the original content.
          </p>
        }
        enabled={config.enableSummarization ?? true}
        onChange={(checked) =>
          onConfigChange({ ...config, enableSummarization: checked })
        }
      />
      <div>
        <Label variant="field" className="block mb-2">
          Result Variable
        </Label>
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

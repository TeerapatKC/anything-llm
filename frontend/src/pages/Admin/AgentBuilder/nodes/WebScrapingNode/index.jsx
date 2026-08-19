import Toggle from "@/components/lib/Toggle";
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
  return (
    <div className="space-y-4">
      <div>
        <Label className="block mb-2">URL to Scrape</Label>
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
        <Label className="block mb-2">Capture Page Content As</Label>
        <Select
          value={config.captureAs}
          onValueChange={(value) =>
            onConfigChange({ ...config, captureAs: value })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Select an option" />
          </SelectTrigger>
          <SelectContent>
            {[
              { label: "Text content only", value: "text" },
              { label: "Raw HTML", value: "html" },
              { label: "CSS Query Selector", value: "querySelector" },
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
          <Label className="block mb-2">Query Selector</Label>
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

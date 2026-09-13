import { useEffect, useState } from "react";
import {
  selectAvailableModel,
  useAvailableLlmModels,
} from "@/components/LLMSelection/CuratedModels";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function LLMProviderModelPicker({
  providerFieldName = "fallback_provider",
  modelFieldName = "fallback_model",
  label = "Model",
  description = "",
  defaultModel = "",
}) {
  const available = useAvailableLlmModels();
  const [model, setModel] = useState("");

  useEffect(() => {
    if (available.loading) return;
    setModel(selectAvailableModel(available.models, model, defaultModel));
  }, [available.loading, available.models, defaultModel, model]);

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-theme-text-primary">
        {label}
      </label>
      {description && (
        <p className="text-xs text-theme-text-secondary">{description}</p>
      )}
      <input type="hidden" name={providerFieldName} value="generic-openai" />
      {model && <input type="hidden" name={modelFieldName} value={model} />}
      {available.loading ? (
        <p className="text-sm text-theme-text-secondary">Loading models…</p>
      ) : available.error || available.models.length === 0 ? (
        <div className="text-sm text-theme-text-secondary">
          {available.error || "No models are available."}
          <button
            type="button"
            onClick={available.refresh}
            className="ml-2 text-primary-button hover:underline"
          >
            Try again
          </button>
        </div>
      ) : (
        <Select value={model} onValueChange={setModel}>
          <SelectTrigger className="h-9 w-full rounded-lg bg-theme-settings-input-bg text-theme-text-primary">
            <SelectValue placeholder="Choose a model" />
          </SelectTrigger>
          <SelectContent>
            {available.models.map((item) => (
              <SelectItem key={item.id} value={item.id}>
                {item.name || item.id}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}

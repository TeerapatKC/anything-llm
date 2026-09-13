import { useCallback, useEffect, useState } from "react";
import { Check } from "lucide-react";
import System from "@/models/system";
import QwenLogo from "@/media/llmmodel/qwen.svg";
import OpenAiLogo from "@/media/llmmodel/openai.svg";
import GemmaLogo from "@/media/llmmodel/gemma.svg";

export function selectAvailableModel(models, ...preferred) {
  return (
    preferred.find((id) => models.some((model) => model.id === id)) ||
    models[0]?.id ||
    ""
  );
}

export function useAvailableLlmModels(includeDisabled = false) {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    const result = await System.availableLlmModels(includeDisabled);
    setModels(result.models || []);
    setError(result.error || null);
    setLoading(false);
  }, [includeDisabled]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { models, loading, error, refresh };
}

export function logoForModel(id) {
  const name = id.toLowerCase();
  if (name.includes("qwen")) return QwenLogo;
  if (name.includes("gpt-oss") || name.includes("openai")) return OpenAiLogo;
  if (name.includes("gemma")) return GemmaLogo;
  return OpenAiLogo;
}

export default function CuratedModelPicker({
  name,
  value,
  onChange,
  models,
  loading,
  error,
  onRefresh,
  label = "Model",
  description = null,
}) {
  return (
    <div className="flex w-full flex-col gap-3">
      <div>
        <p className="text-sm font-semibold text-theme-text-primary">{label}</p>
        {description && (
          <p className="mt-1 text-sm text-theme-text-secondary">
            {description}
          </p>
        )}
      </div>
      {name && value && <input type="hidden" name={name} value={value} />}
      {loading ? (
        <p className="rounded-xl border border-theme-modal-border p-4 text-sm text-theme-text-secondary">
          Loading models from the configured service…
        </p>
      ) : error || models.length === 0 ? (
        <div className="rounded-xl border border-theme-modal-border p-4 text-sm text-theme-text-secondary">
          <p>{error || "The configured model service returned no models."}</p>
          <button
            type="button"
            onClick={onRefresh}
            className="mt-3 font-semibold text-primary-button hover:underline"
          >
            Try again
          </button>
        </div>
      ) : (
        <div
          className="grid gap-2"
          style={{
            gridTemplateColumns:
              "repeat(auto-fill, minmax(min(100%, 18rem), 1fr))",
          }}
        >
          {models.map((model) => {
            const selected = value === model.id;
            return (
              <button
                key={model.id}
                type="button"
                aria-pressed={selected}
                onClick={() => onChange(model.id)}
                className={`flex min-h-20 w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-button focus-visible:ring-offset-2 focus-visible:ring-offset-theme-bg-primary ${
                  selected
                    ? "border-primary-button bg-theme-settings-input-bg"
                    : "border-theme-modal-border bg-theme-bg-secondary hover:border-primary-button/60"
                }`}
              >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-white p-1.5">
                  <img
                    src={logoForModel(model.id)}
                    alt=""
                    className="size-full object-contain"
                  />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block break-all text-base font-semibold text-theme-text-primary">
                    {model.name || model.id}
                  </span>
                  {model.name && model.name !== model.id && (
                    <span className="mt-0.5 block break-all font-mono text-xs text-theme-text-secondary">
                      {model.id}
                    </span>
                  )}
                </span>
                <span
                  aria-hidden="true"
                  className={`flex size-5 shrink-0 items-center justify-center rounded-full border ${
                    selected
                      ? "border-primary-button bg-primary-button text-white"
                      : "border-theme-modal-border"
                  }`}
                >
                  {selected && <Check className="size-3" strokeWidth={3} />}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

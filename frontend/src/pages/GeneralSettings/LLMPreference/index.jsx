import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import SettingsLayout from "@/components/layout/SettingsLayout";
import PageHeader from "@/components/layout/PageHeader";
import { SpinnerBlock } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import System from "@/models/system";
import showToast from "@/utils/toast";
import {
  logoForModel,
  useAvailableLlmModels,
} from "@/components/LLMSelection/CuratedModels";

export const LLM_PREFERENCE_CHANGED_EVENT = "llm-preference-changed";

function positiveValue(value, fallback) {
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0
    ? String(number)
    : String(fallback);
}

function readSaved(value) {
  try {
    return JSON.parse(value) || null;
  } catch {
    return null;
  }
}

function signature(models, defaultModel) {
  return JSON.stringify({ models, defaultModel });
}

export default function GeneralLLMPreference() {
  const { t } = useTranslation();
  const [settings, setSettings] = useState(null);
  const [models, setModels] = useState([]);
  const [defaultModel, setDefaultModel] = useState("");
  const [baseline, setBaseline] = useState("");
  const [saving, setSaving] = useState(false);
  const available = useAvailableLlmModels(true);

  useEffect(() => {
    System.keys().then((current) => setSettings(current ?? {}));
  }, []);
  useEffect(() => {
    if (!settings || available.loading) return;
    const saved = readSaved(settings.GenericOpenAiModelSettings);
    const initial = available.models.map((model) => {
      const stored = saved?.models?.[model.id];
      return {
        id: model.id,
        name: model.name || model.id,
        enabled: stored ? stored.enabled : !saved,
        contextWindow: positiveValue(
          stored?.contextWindow ?? settings.GenericOpenAiTokenLimit,
          4096
        ),
        maxTokens: positiveValue(
          stored?.maxTokens ?? settings.GenericOpenAiMaxTokens,
          1024
        ),
      };
    });
    const selected =
      [settings.GenericOpenAiModelPref, saved?.defaultModel].find((id) =>
        initial.some((model) => model.id === id && model.enabled)
      ) ||
      initial.find((model) => model.enabled)?.id ||
      "";
    setModels(initial);
    setDefaultModel(selected);
    setBaseline(
      signature(
        initial,
        settings.GenericOpenAiModelPref || saved?.defaultModel || ""
      )
    );
  }, [settings, available.loading, available.models]);

  const enabledCount = models.filter((model) => model.enabled).length;
  const validLimits = (model) => {
    const context = Number(model.contextWindow);
    const max = Number(model.maxTokens);
    return (
      Number.isSafeInteger(context) &&
      context > 0 &&
      Number.isSafeInteger(max) &&
      max > 0 &&
      max <= context
    );
  };
  const valid =
    models.length > 0 &&
    enabledCount > 0 &&
    models.some((model) => model.id === defaultModel && model.enabled) &&
    models.every(validLimits);
  const hasChanges =
    models.length > 0 &&
    baseline &&
    signature(models, defaultModel) !== baseline;

  function updateModel(id, changes) {
    setModels((current) =>
      current.map((model) =>
        model.id === id ? { ...model, ...changes } : model
      )
    );
  }

  function toggleModel(id) {
    const target = models.find((model) => model.id === id);
    if (!target || (target.enabled && enabledCount === 1)) return;
    const next = models.map((model) =>
      model.id === id ? { ...model, enabled: !model.enabled } : model
    );
    setModels(next);
    if (target.enabled && defaultModel === id)
      setDefaultModel(next.find((model) => model.enabled)?.id || "");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!hasChanges || !valid) return;
    const config = {
      defaultModel,
      models: Object.fromEntries(
        models.map(({ id, enabled, contextWindow, maxTokens }) => [
          id,
          {
            enabled,
            contextWindow: Number(contextWindow),
            maxTokens: Number(maxTokens),
          },
        ])
      ),
    };
    setSaving(true);
    const { error, refused, newValues } = await System.updateSystem({
      GenericOpenAiModelSettings: JSON.stringify(config),
    });
    setSaving(false);
    if (error || refused?.length || !newValues?.GenericOpenAiModelSettings) {
      showToast(
        `Failed to save LLM settings: ${error || "Permission denied or server unavailable."}`,
        "error"
      );
      return;
    }
    setSettings((previous) => ({
      ...previous,
      ...newValues,
      GenericOpenAiModelPref: defaultModel,
    }));
    showToast("LLM preferences saved successfully.", "success");
  }

  return (
    <SettingsLayout>
      {!settings ? (
        <SpinnerBlock className="min-h-[60vh]" />
      ) : (
        <form onSubmit={handleSubmit} className="flex w-full flex-col">
          <PageHeader
            title={t("llm.title")}
            description={t("llm.description")}
          />
          <div className="mt-6 max-w-4xl">
            <h2 className="text-base font-semibold text-theme-text-primary">
              {t("llm.available-models")}
            </h2>
            <p className="mt-1 text-sm text-theme-text-secondary">
              {t("llm.available-models-description")}
            </p>
            {available.loading ? (
              <SpinnerBlock className="min-h-48" />
            ) : available.error || !models.length ? (
              <div className="mt-5 rounded-xl border border-theme-modal-border p-4 text-sm text-theme-text-secondary">
                <p>
                  {available.error ||
                    "The configured model service returned no models."}
                </p>
                <button
                  type="button"
                  onClick={available.refresh}
                  className="mt-3 font-semibold text-primary-button hover:underline"
                >
                  Try again
                </button>
              </div>
            ) : (
              <div className="mt-5 grid gap-4">
                {models.map((model) => {
                  const isDefault = model.id === defaultModel && model.enabled;
                  return (
                    <div
                      key={model.id}
                      className={`rounded-xl border bg-theme-bg-secondary p-4 sm:p-5 ${isDefault ? "border-primary-button" : "border-theme-modal-border"}`}
                    >
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-white p-1.5">
                          <img
                            src={logoForModel(model.id)}
                            alt=""
                            className="size-full object-contain"
                          />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="break-all font-semibold text-theme-text-primary">
                            {model.name}
                          </p>
                          {model.name !== model.id && (
                            <p className="break-all font-mono text-xs text-theme-text-secondary">
                              {model.id}
                            </p>
                          )}
                        </div>
                        {isDefault && (
                          <span className="rounded-full border border-primary-button px-2.5 py-1 text-xs font-semibold text-primary-button">
                            {t("llm.default")}
                          </span>
                        )}
                        <div className="flex items-center gap-2 text-sm text-theme-text-primary">
                          <Switch
                            id={`enabled-${model.id}`}
                            checked={model.enabled}
                            disabled={model.enabled && enabledCount === 1}
                            onCheckedChange={() => toggleModel(model.id)}
                            aria-label={`${t("llm.enabled")}: ${model.name}`}
                          />
                          <label
                            htmlFor={`enabled-${model.id}`}
                            className="cursor-pointer"
                          >
                            {t("llm.enabled")}
                          </label>
                        </div>
                      </div>
                      {model.enabled && !isDefault && (
                        <button
                          type="button"
                          onClick={() => setDefaultModel(model.id)}
                          className="mt-4 text-sm font-semibold text-primary-button hover:underline"
                        >
                          {t("llm.make-default")}
                        </button>
                      )}
                      <div className="mt-5 grid gap-4 border-t border-theme-modal-border pt-4 sm:grid-cols-2">
                        <div>
                          <label
                            htmlFor={`context-${model.id}`}
                            className="mb-2 block text-sm font-medium text-theme-text-primary"
                          >
                            {t("provider-options.model-context-window")}
                          </label>
                          <Input
                            id={`context-${model.id}`}
                            type="number"
                            min="1"
                            step="1"
                            value={model.contextWindow}
                            onChange={(event) =>
                              updateModel(model.id, {
                                contextWindow: event.target.value,
                              })
                            }
                            className="h-11 border-theme-modal-border bg-theme-settings-input-bg px-3 text-theme-text-primary"
                          />
                          <p className="mt-2 text-xs text-theme-text-secondary">
                            {t("llm.context-window-description")}
                          </p>
                        </div>
                        <div>
                          <label
                            htmlFor={`max-${model.id}`}
                            className="mb-2 block text-sm font-medium text-theme-text-primary"
                          >
                            {t("provider-options.max-tokens")}
                          </label>
                          <Input
                            id={`max-${model.id}`}
                            type="number"
                            min="1"
                            step="1"
                            value={model.maxTokens}
                            onChange={(event) =>
                              updateModel(model.id, {
                                maxTokens: event.target.value,
                              })
                            }
                            className="h-11 border-theme-modal-border bg-theme-settings-input-bg px-3 text-theme-text-primary"
                          />
                          <p className="mt-2 text-xs text-theme-text-secondary">
                            {t("llm.max-tokens-description")}
                          </p>
                        </div>
                      </div>
                      {!validLimits(model) && (
                        <p className="mt-3 text-xs text-red-400">
                          {t("llm.invalid-model-limits")}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            <p className="mt-4 text-xs text-theme-text-secondary">
              {t("llm.keep-one-enabled")}
            </p>
            {hasChanges && (
              <div className="mt-6 flex justify-end">
                <Button size="lg" type="submit" disabled={saving || !valid}>
                  {saving ? t("llm.saving") : t("llm.save-changes")}
                </Button>
              </div>
            )}
          </div>
        </form>
      )}
    </SettingsLayout>
  );
}

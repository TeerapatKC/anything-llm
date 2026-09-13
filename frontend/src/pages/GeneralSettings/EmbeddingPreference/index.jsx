import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Brain } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import SettingsLayout from "@/components/layout/SettingsLayout";
import { SpinnerBlock } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import ChangeWarningModal from "@/components/ChangeWarning";
import GenericOpenAiLogo from "@/media/llmprovider/generic-openai.png";
import System from "@/models/system";
import showToast from "@/utils/toast";

const EDITABLE_KEYS = [
  "EmbeddingModelPref",
  "EmbeddingModelMaxChunkLength",
  "GenericOpenAiEmbeddingMaxConcurrentChunks",
  "GenericOpenAiEmbeddingApiDelayMs",
  "GenericOpenAiEmbeddingPassagePrefix",
  "GenericOpenAiEmbeddingQueryPrefix",
];

function editableValues(settings) {
  return {
    EmbeddingModelPref: settings?.EmbeddingModelPref || "",
    EmbeddingModelMaxChunkLength: String(
      settings?.EmbeddingModelMaxChunkLength || ""
    ),
    GenericOpenAiEmbeddingMaxConcurrentChunks: String(
      settings?.GenericOpenAiEmbeddingMaxConcurrentChunks || 500
    ),
    GenericOpenAiEmbeddingApiDelayMs: String(
      settings?.GenericOpenAiEmbeddingApiDelayMs || ""
    ),
    GenericOpenAiEmbeddingPassagePrefix:
      settings?.GenericOpenAiEmbeddingPassagePrefix || "",
    GenericOpenAiEmbeddingQueryPrefix:
      settings?.GenericOpenAiEmbeddingQueryPrefix || "",
  };
}

export default function GeneralEmbeddingPreference() {
  const { t } = useTranslation();
  const [settings, setSettings] = useState(null);
  const [values, setValues] = useState(null);
  const [models, setModels] = useState([]);
  const [modelError, setModelError] = useState("");
  const [loading, setLoading] = useState(true);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    let active = true;
    System.keys().then((result) => {
      if (!active) return;
      setSettings(result);
      setValues(editableValues(result));
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  const provider = settings?.EmbeddingEngine || "native";
  const isGeneric = provider === "generic-openai";
  const providerSupported = provider === "native" || isGeneric;

  useEffect(() => {
    if (!isGeneric) return;
    let active = true;
    setModelsLoading(true);
    System.customModels("generic-openai-embedder").then(({ models, error }) => {
      if (!active) return;
      setModels((models || []).filter((model) => model?.id));
      setModelError(error || "");
      setModelsLoading(false);
    });
    return () => {
      active = false;
    };
  }, [isGeneric]);

  const original = editableValues(settings);
  const changes = isGeneric
    ? Object.fromEntries(
        EDITABLE_KEYS.filter((key) => values?.[key] !== original[key]).map(
          (key) => [key, values[key]]
        )
      )
    : {};
  const hasChanges = Object.keys(changes).length > 0;
  const modelChanged = "EmbeddingModelPref" in changes;
  const modelIsListed = models.some(
    (model) => model.id === values?.EmbeddingModelPref
  );
  const canSave =
    hasChanges &&
    !saving &&
    (!modelChanged || modelIsListed) &&
    (!values?.EmbeddingModelMaxChunkLength ||
      Number(values.EmbeddingModelMaxChunkLength) > 1) &&
    (!values?.GenericOpenAiEmbeddingApiDelayMs ||
      Number(values.GenericOpenAiEmbeddingApiDelayMs) >= 500) &&
    Number(values?.GenericOpenAiEmbeddingMaxConcurrentChunks) > 0;

  const setField = (key, value) =>
    setValues((current) => ({ ...current, [key]: value }));

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    const result = await System.updateSystem(changes);
    setSaving(false);
    setConfirmReset(false);
    if (result.error || result.refused?.length) {
      showToast(result.error || t("embedding.save-error"), "error");
      return;
    }
    setSettings((current) => ({ ...current, ...changes }));
    showToast(t("embedding.saved"), "success");
  };

  const submit = (event) => {
    event.preventDefault();
    if (!canSave) return;
    if (
      modelChanged &&
      (settings?.HasExistingEmbeddings || settings?.HasCachedEmbeddings)
    ) {
      setConfirmReset(true);
      return;
    }
    save();
  };

  return (
    <SettingsLayout>
      {loading ? (
        <SpinnerBlock className="min-h-[60vh]" />
      ) : (
        <form
          onSubmit={submit}
          className="flex w-full flex-col px-1 py-6 md:px-6"
        >
          <PageHeader
            title={t("embedding.title")}
            description={t("embedding.description")}
          />

          <div className="mt-6 max-w-4xl">
            <h2 className="text-base font-semibold text-theme-text-primary">
              {t("embedding.provider.title")}
            </h2>
            <div className="mt-4 rounded-xl border border-theme-modal-border bg-theme-bg-secondary p-4 sm:p-5">
              <div className="flex items-center gap-3">
                <span
                  className={`flex size-11 shrink-0 items-center justify-center rounded-lg ${isGeneric ? "bg-white p-1.5" : "border border-theme-modal-border bg-theme-settings-input-bg text-primary-button"}`}
                >
                  {isGeneric ? (
                    <img
                      src={GenericOpenAiLogo}
                      alt=""
                      className="size-full object-contain"
                    />
                  ) : (
                    <Brain size={26} strokeWidth={1.8} aria-hidden="true" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-theme-text-primary">
                    {isGeneric
                      ? t("embedding.generic-name")
                      : providerSupported
                        ? t("embedding.native-name")
                        : provider}
                  </p>
                  <p className="text-sm text-theme-text-secondary">
                    {isGeneric
                      ? values.EmbeddingModelPref || t("embedding.no-model")
                      : providerSupported
                        ? "multilingual-e5-small"
                        : t("embedding.unsupported-provider")}
                  </p>
                </div>
                <span className="rounded-full border border-primary-button px-2.5 py-1 text-xs font-semibold text-primary-button">
                  {t(
                    providerSupported ? "embedding.active" : "embedding.invalid"
                  )}
                </span>
              </div>
              <p className="mt-4 border-t border-theme-modal-border pt-4 text-sm text-theme-text-secondary">
                {t("embedding.managed")}
              </p>
            </div>
          </div>

          {isGeneric && (
            <div className="mt-8 max-w-4xl">
              <h2 className="text-base font-semibold text-theme-text-primary">
                {t("embedding.settings")}
              </h2>
              <p className="mt-1 text-sm text-theme-text-secondary">
                {t("embedding.settings-description")}
              </p>
              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label className="mb-2 block">{t("embedding.model")}</Label>
                  <Select
                    value={modelIsListed ? values.EmbeddingModelPref : null}
                    onValueChange={(value) =>
                      setField("EmbeddingModelPref", value)
                    }
                    disabled={modelsLoading || models.length === 0}
                  >
                    <SelectTrigger className="h-11 w-full bg-theme-settings-input-bg text-theme-text-primary">
                      <SelectValue
                        placeholder={
                          modelsLoading
                            ? t("embedding.loading-models")
                            : t("embedding.select-model")
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {models.map((model) => (
                        <SelectItem key={model.id} value={model.id}>
                          {model.name || model.id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {(modelError || (!modelsLoading && models.length === 0)) && (
                    <p className="mt-2 text-sm text-theme-text-secondary">
                      {modelError || t("embedding.models-unavailable")}
                    </p>
                  )}
                  {!modelsLoading &&
                    values.EmbeddingModelPref &&
                    !modelIsListed && (
                      <p className="mt-2 text-sm text-theme-text-secondary">
                        {t("embedding.model-not-listed", {
                          model: values.EmbeddingModelPref,
                        })}
                      </p>
                    )}
                </div>
                <div>
                  <Label
                    htmlFor="embedding-chunk-length"
                    className="mb-2 block"
                  >
                    {t("embedding.max-chunk-length")}
                  </Label>
                  <Input
                    id="embedding-chunk-length"
                    type="number"
                    min="2"
                    value={values.EmbeddingModelMaxChunkLength}
                    onChange={(event) =>
                      setField(
                        "EmbeddingModelMaxChunkLength",
                        event.target.value
                      )
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="embedding-concurrent" className="mb-2 block">
                    {t("embedding.max-concurrent-chunks")}
                  </Label>
                  <Input
                    id="embedding-concurrent"
                    type="number"
                    min="1"
                    value={values.GenericOpenAiEmbeddingMaxConcurrentChunks}
                    onChange={(event) =>
                      setField(
                        "GenericOpenAiEmbeddingMaxConcurrentChunks",
                        event.target.value
                      )
                    }
                  />
                </div>
                <div>
                  <Label
                    htmlFor="embedding-passage-prefix"
                    className="mb-2 block"
                  >
                    {t("embedding.passage-prefix")}
                  </Label>
                  <Input
                    id="embedding-passage-prefix"
                    value={values.GenericOpenAiEmbeddingPassagePrefix}
                    onChange={(event) =>
                      setField(
                        "GenericOpenAiEmbeddingPassagePrefix",
                        event.target.value
                      )
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="embedding-api-delay" className="mb-2 block">
                    {t("embedding.api-delay")}
                  </Label>
                  <Input
                    id="embedding-api-delay"
                    type="number"
                    min="500"
                    value={values.GenericOpenAiEmbeddingApiDelayMs}
                    onChange={(event) =>
                      setField(
                        "GenericOpenAiEmbeddingApiDelayMs",
                        event.target.value
                      )
                    }
                  />
                </div>
                <div>
                  <Label
                    htmlFor="embedding-query-prefix"
                    className="mb-2 block"
                  >
                    {t("embedding.query-prefix")}
                  </Label>
                  <Input
                    id="embedding-query-prefix"
                    value={values.GenericOpenAiEmbeddingQueryPrefix}
                    onChange={(event) =>
                      setField(
                        "GenericOpenAiEmbeddingQueryPrefix",
                        event.target.value
                      )
                    }
                  />
                </div>
              </div>
              {hasChanges && (
                <div className="mt-6 flex justify-end">
                  <Button type="submit" size="lg" disabled={!canSave}>
                    {saving ? t("common.saving") : t("common.save")}
                  </Button>
                </div>
              )}
            </div>
          )}
        </form>
      )}
      <Dialog open={confirmReset} onOpenChange={setConfirmReset}>
        <DialogContent>
          <ChangeWarningModal
            warningText={t("embedding.model-change-warning")}
            onClose={() => setConfirmReset(false)}
            onConfirm={save}
          />
        </DialogContent>
      </Dialog>
    </SettingsLayout>
  );
}

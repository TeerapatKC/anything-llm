import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { AVAILABLE_LLM_PROVIDERS } from "@/pages/GeneralSettings/LLMPreference";
import System from "@/models/system";
import { useModal } from "@/hooks/useModal";
import showToast from "@/utils/toast";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

// Providers that can't be routing targets
const EXCLUDED_PROVIDERS = ["anythingllm-router"];

export default function LLMProviderModelPicker({
  providerFieldName = "fallback_provider",
  modelFieldName = "fallback_model",
  label = "Provider & Model",
  description = "",
  defaultProvider = "",
  defaultModel = "",
}) {
  const { t } = useTranslation();
  const [selectedProvider, setSelectedProvider] = useState(defaultProvider);
  const [selectedModel, setSelectedModel] = useState(defaultModel);
  const [models, setModels] = useState([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [settings, setSettings] = useState(null);
  const { isOpen, openModal, closeModal } = useModal();

  useEffect(() => {
    if (defaultProvider && !selectedProvider)
      setSelectedProvider(defaultProvider);
  }, [defaultProvider]);

  useEffect(() => {
    if (defaultModel && !selectedModel) setSelectedModel(defaultModel);
  }, [defaultModel]);

  const availableProviders = AVAILABLE_LLM_PROVIDERS.filter(
    (llm) => !EXCLUDED_PROVIDERS.includes(llm.value)
  );

  useEffect(() => {
    async function fetchSettings() {
      const _settings = await System.keys();
      setSettings(_settings ?? {});
    }
    fetchSettings();
  }, []);

  function isConfigured(providerValue) {
    if (!settings) return true;
    const llm = availableProviders.find((l) => l.value === providerValue);
    const keys = llm?.connectionConfig || llm?.requiredConfig;
    if (!keys?.length) return true;
    return keys.every((key) => !!settings[key]);
  }

  useEffect(() => {
    if (!selectedProvider || !settings) {
      setModels([]);
      return;
    }
    if (!isConfigured(selectedProvider)) return;

    async function fetchModels() {
      setLoadingModels(true);
      const { models: fetchedModels = [] } =
        await System.customModels(selectedProvider);
      setModels(fetchedModels);
      setLoadingModels(false);
    }
    fetchModels();
  }, [selectedProvider, settings]);

  const downloadedModels = models.filter((model) => model?.downloaded);

  // Radix hands the value straight through, where the native select passed an
  // event.
  function handleProviderChange(value) {
    setSelectedProvider(value);
    setSelectedModel("");
    setModels([]);
    if (value && !isConfigured(value)) openModal();
  }

  function handleSetupCancel() {
    closeModal();
    if (!isConfigured(selectedProvider)) {
      setSelectedProvider(defaultProvider || "");
      setSelectedModel(defaultModel || "");
    }
  }

  async function handleSetupSave(e) {
    e.preventDefault();
    e.stopPropagation();
    const data = {};
    const form = new FormData(e.target);
    for (const [key, value] of form.entries()) data[key] = value;
    const { error } = await System.updateSystem(data);
    if (error) {
      showToast(
        t("model-router.provider-picker.toast-save-failed", { error }),
        "error"
      );
      return;
    }
    const _settings = await System.keys();
    setSettings(_settings ?? {});
    closeModal();
  }

  const selectedLlm = availableProviders.find(
    (l) => l.value === selectedProvider
  );
  const needsSetup =
    selectedProvider && selectedLlm && !isConfigured(selectedProvider);

  return (
    <div className="flex flex-col gap-y-1.5">
      <label className="text-sm font-medium leading-5 text-white light:text-slate-950">
        {label}
      </label>
      {description && (
        <p className="text-xs leading-4 text-zinc-400 light:text-slate-600">
          {description}
        </p>
      )}
      <div className="flex gap-x-3">
        <div className="flex-1">
          <Select
            name={providerFieldName}
            value={selectedProvider}
            onValueChange={handleProviderChange}
            required
          >
            <SelectTrigger className="bg-zinc-800 light:bg-white light:border light:border-slate-300 text-white light:text-slate-700 text-sm rounded-[8px] outline-none w-full h-8 px-3.5">
              <SelectValue
                placeholder={t("model-router.provider-picker.select-provider")}
              />
            </SelectTrigger>
            <SelectContent>
              {availableProviders.map((llm) => (
                <SelectItem key={llm.value} value={llm.value}>
                  {llm.name}
                  {!isConfigured(llm.value)
                    ? ` ${t("model-router.provider-picker.setup-required")}`
                    : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1">
          {needsSetup ? (
            <button
              type="button"
              onClick={openModal}
              className="border-none bg-zinc-800 light:bg-white light:border light:border-slate-300 text-blue-400 light:text-blue-500 text-sm rounded-[8px] block w-full h-8 px-3.5 text-left hover:text-blue-300 light:hover:text-blue-600 transition-colors"
            >
              {t("model-router.provider-picker.configure-to-continue", {
                name: selectedLlm.name,
              })}
            </button>
          ) : loadingModels ? (
            <div className="bg-zinc-800 light:bg-white light:border light:border-slate-300 text-zinc-400 light:text-slate-500 text-sm rounded-[8px] h-8 px-3.5 flex items-center">
              {t("model-router.provider-picker.loading-models")}
            </div>
          ) : models.length > 0 ? (
            <Select
              name={modelFieldName}
              value={selectedModel}
              onValueChange={setSelectedModel}
              required
            >
              <SelectTrigger className="bg-zinc-800 light:bg-white light:border light:border-slate-300 text-white light:text-slate-700 text-sm rounded-[8px] outline-none w-full h-8 px-3.5">
                <SelectValue
                  placeholder={t("model-router.provider-picker.select-model")}
                />
              </SelectTrigger>
              <SelectContent>
                null
                {downloadedModels.length > 0 && (
                  <SelectGroup>
                    <SelectLabel>Downloaded models</SelectLabel>
                    {downloadedModels.map((model) => (
                      <SelectItem key={model.id} value={model.id}>
                        {model.name || model.id}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                )}
                <SelectGroup>
                  <SelectLabel>Discovered models</SelectLabel>
                  {models.map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      {model.id}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          ) : (
            <input
              type="text"
              name={modelFieldName}
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              placeholder={
                selectedProvider
                  ? t("model-router.provider-picker.enter-model")
                  : t("model-router.provider-picker.select-provider-first")
              }
              disabled={!selectedProvider}
              className="bg-zinc-800 light:bg-white light:border light:border-slate-300 text-white light:text-slate-700 placeholder:text-zinc-400 light:placeholder:text-slate-400 text-sm rounded-[8px] outline-none block w-full h-8 px-3.5 disabled:opacity-50"
              required
            />
          )}
        </div>
      </div>

      <ProviderSetupModal
        isOpen={isOpen}
        provider={selectedLlm}
        settings={settings}
        onSave={handleSetupSave}
        onClose={handleSetupCancel}
      />
    </div>
  );
}

function ProviderSetupModal({ isOpen, provider, settings, onSave, onClose }) {
  const { t } = useTranslation();
  if (!provider) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl bg-zinc-900 light:bg-white border-zinc-700 light:border-slate-300">
        <DialogHeader className="p-0">
          <div className="flex items-center gap-x-3">
            {provider.logo && (
              <img
                src={provider.logo}
                alt={`${provider.name} logo`}
                className="w-8 h-8 rounded-md"
              />
            )}
            <DialogTitle className="text-sm font-semibold">
              {t("model-router.provider-picker.configure-provider", {
                name: provider.name,
              })}
            </DialogTitle>
          </div>
        </DialogHeader>
        <form id="provider-setup-form" onSubmit={onSave}>
          <p className="text-xs leading-4 text-zinc-400 light:text-slate-600 mb-4">
            {t("model-router.provider-picker.setup-credentials", {
              name: provider.name,
            })}
          </p>
          <div className="space-y-4">{provider.options(settings ?? {})}</div>
          <DialogFooter className="p-0 mt-5">
            <DialogClose asChild>
              <Button variant="outline" type="button">
                {t("model-router.provider-picker.cancel")}
              </Button>
            </DialogClose>
            <Button variant="default" type="submit" form="provider-setup-form">
              {t("model-router.provider-picker.save-settings")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

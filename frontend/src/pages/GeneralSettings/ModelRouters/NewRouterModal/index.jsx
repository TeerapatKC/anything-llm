import { useState, useEffect } from "react";
import { Spinner } from "@/components/ui/spinner";
import { useTranslation } from "react-i18next";
import ModelRouter from "@/models/modelRouter";
import System from "@/models/system";
import LLMProviderModelPicker from "../LLMProviderModelPicker";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export default function NewRouterModal({
  isOpen,
  closeModal,
  onSuccess,
  router = null,
}) {
  const { t } = useTranslation();
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [systemSettings, setSystemSettings] = useState(null);
  const isEdit = !!router;

  useEffect(() => {
    if (isOpen && !isEdit) {
      System.keys().then((settings) => setSystemSettings(settings));
    }
  }, [isOpen, isEdit]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.target);
    const data = {
      name: formData.get("name"),
      description: formData.get("description"),
      fallback_provider: formData.get("fallback_provider"),
      fallback_model: formData.get("fallback_model"),
      cooldown_seconds: Number(formData.get("cooldown_seconds") ?? 30),
    };

    if (!data.name) {
      setError(t("model-router.new-router.name-required"));
      setLoading(false);
      return;
    }

    if (!data.fallback_provider || !data.fallback_model) {
      setError(t("model-router.new-router.fallback-required"));
      setLoading(false);
      return;
    }

    const { router: saved, error: apiError } = isEdit
      ? await ModelRouter.update(router.id, data)
      : await ModelRouter.create(data);
    setLoading(false);

    if (saved) {
      onSuccess();
      closeModal();
    } else {
      setError(
        apiError ||
          (isEdit ? t("model-router.edit-router.toast-update-failed") : null)
      );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && closeModal()}>
      <DialogContent className="max-w-2xl bg-zinc-900 light:bg-white border-zinc-700 light:border-slate-300">
        <form onSubmit={handleSubmit} className="flex flex-col gap-y-5">
          <DialogHeader className="p-0">
            <DialogTitle className="text-sm font-semibold">
              {isEdit
                ? t("model-router.edit-router.title", { name: router.name })
                : t("model-router.new-router.title")}
            </DialogTitle>
            {isEdit && router?.description && (
              <p className="text-xs leading-4 text-zinc-400 light:text-slate-600 truncate">
                {router.description}
              </p>
            )}
          </DialogHeader>

          <div className="flex flex-col gap-y-1.5">
            <label className="text-sm font-medium leading-5 text-theme-text-primary light:text-slate-950">
              {t("model-router.new-router.name")}
            </label>
            <input
              type="text"
              name="name"
              defaultValue={router?.name || ""}
              placeholder={t("model-router.new-router.name-placeholder")}
              className="bg-zinc-800 light:bg-white light:border light:border-slate-300 text-theme-text-primary light:text-slate-700 placeholder:text-zinc-400 light:placeholder:text-slate-400 text-sm rounded-[8px] outline-none block w-full h-8 px-3.5"
              required
            />
          </div>

          <div className="flex flex-col gap-y-1.5">
            <label className="text-sm font-medium leading-5 text-theme-text-primary light:text-slate-950">
              {t("model-router.new-router.description")}
            </label>
            <input
              type="text"
              name="description"
              defaultValue={router?.description || ""}
              placeholder={t("model-router.new-router.description-placeholder")}
              className="bg-zinc-800 light:bg-white light:border light:border-slate-300 text-theme-text-primary light:text-slate-700 placeholder:text-zinc-400 light:placeholder:text-slate-400 text-sm rounded-[8px] outline-none block w-full h-8 px-3.5"
            />
          </div>

          <LLMProviderModelPicker
            providerFieldName="fallback_provider"
            modelFieldName="fallback_model"
            label={t("model-router.new-router.fallback-label")}
            description={t("model-router.new-router.fallback-description")}
            defaultProvider={
              router?.fallback_provider ?? systemSettings?.LLMProvider
            }
            defaultModel={router?.fallback_model ?? systemSettings?.LLMModel}
          />

          <div className="flex flex-col gap-y-1.5">
            <label className="text-sm font-medium leading-5 text-theme-text-primary light:text-slate-950">
              {t("model-router.new-router.cooldown-label")}
            </label>
            <input
              type="number"
              name="cooldown_seconds"
              defaultValue={router?.cooldown_seconds ?? 300}
              min={0}
              className="bg-zinc-800 light:bg-white light:border light:border-slate-300 text-theme-text-primary light:text-slate-700 placeholder:text-zinc-400 light:placeholder:text-slate-400 text-sm rounded-[8px] outline-none block w-full h-8 px-3.5"
            />
            <p className="text-xs leading-4 text-zinc-400 light:text-slate-600">
              {t("model-router.new-router.cooldown-help")}
            </p>
          </div>

          {error && (
            <p className="text-xs leading-4 text-red-400 light:text-red-600">
              Error: {error}
            </p>
          )}

          <DialogFooter className="p-0">
            <DialogClose asChild>
              <Button variant="outline" type="button">
                {t("model-router.new-router.cancel")}
              </Button>
            </DialogClose>
            <Button variant="default" type="submit" disabled={loading}>
              {loading ? (
                <span className="flex items-center gap-x-1.5">
                  <Spinner size="sm" />
                  {t("common.saving")}
                </span>
              ) : isEdit ? (
                t("model-router.edit-router.save")
              ) : (
                t("model-router.new-router.create")
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

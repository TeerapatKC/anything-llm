import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import ModelRouter from "@/models/modelRouter";
import paths from "@/utils/paths";
import CuratedModelPicker, {
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

export default function WorkspaceLLMSelection({
  settings,
  workspace,
  setHasChanges,
  markMismatchAsChanged = true,
}) {
  const { t } = useTranslation();
  const available = useAvailableLlmModels();
  const [routers, setRouters] = useState([]);
  const [model, setModel] = useState("");
  const [source, setSource] = useState(
    workspace?.chatProvider === "nexusai-router" ? "router" : "model"
  );
  const [routerId, setRouterId] = useState(
    workspace?.router_id ? String(workspace.router_id) : ""
  );
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    ModelRouter.getOptions().then(setRouters);
  }, []);

  useEffect(() => {
    if (available.loading) return;
    setModel(
      selectAvailableModel(
        available.models,
        touched ? model : workspace?.chatModel,
        settings?.GenericOpenAiModelPref
      )
    );
  }, [
    available.loading,
    available.models,
    workspace?.chatModel,
    settings?.GenericOpenAiModelPref,
    touched,
    model,
  ]);

  useEffect(() => {
    if (!markMismatchAsChanged || !workspace) return;
    if (
      source === "router" &&
      routerId &&
      (workspace.chatProvider !== "nexusai-router" ||
        String(workspace.router_id ?? "") !== routerId)
    ) {
      setHasChanges(true);
    } else if (
      source === "model" &&
      model &&
      (workspace.chatProvider !== "generic-openai" ||
        workspace.chatModel !== model)
    ) {
      setHasChanges(true);
    }
  }, [
    workspace?.chatProvider,
    workspace?.chatModel,
    workspace?.router_id,
    source,
    routerId,
    model,
    setHasChanges,
    markMismatchAsChanged,
  ]);

  const selectedRouter = routers.find(
    (router) => String(router.id) === routerId
  );

  return (
    <div className="flex w-full flex-col gap-5">
      <div>
        <p className="text-sm font-semibold text-theme-text-primary">
          {t("model-router.workspace.source-label", "Chat model source")}
        </p>
        <p className="mt-1 text-sm text-theme-text-secondary">
          {t(
            "model-router.workspace.source-description",
            "Use one model for every message, or let a model router choose using its rules."
          )}
        </p>
      </div>
      <div
        className="flex flex-wrap gap-2"
        role="group"
        aria-label={t(
          "model-router.workspace.source-label",
          "Chat model source"
        )}
      >
        {[
          ["model", t("model-router.workspace.direct-model", "Single model")],
          ["router", t("model-router.workspace.router", "Model router")],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={source === value}
            disabled={value === "router" && routers.length === 0 && !routerId}
            onClick={() => {
              setSource(value);
              if (value === "router" && !routerId && routers[0])
                setRouterId(String(routers[0].id));
              setHasChanges(true);
            }}
            className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
              source === value
                ? "border-primary-button bg-theme-settings-input-bg text-theme-text-primary"
                : "border-theme-modal-border text-theme-text-secondary hover:text-theme-text-primary"
            } disabled:cursor-not-allowed disabled:opacity-50`}
          >
            {label}
          </button>
        ))}
      </div>
      {routers.length === 0 && source !== "router" && (
        <p className="text-xs text-theme-text-secondary">
          {t(
            "model-router.workspace.no-routers",
            "No model routers have been created yet."
          )}{" "}
          <a
            className="text-primary-button hover:underline"
            href={paths.settings.modelRouters()}
          >
            {t("model-router.workspace.manage-routers", "Manage routers")}
          </a>
        </p>
      )}
      {source === "router" ? (
        <div className="flex max-w-xl flex-col gap-2">
          {selectedRouter && (
            <>
              <input type="hidden" name="chatProvider" value="nexusai-router" />
              <input type="hidden" name="router_id" value={routerId} />
            </>
          )}
          <label className="text-sm font-semibold text-theme-text-primary">
            {t("model-router.workspace.router", "Model router")}
          </label>
          {routers.length ? (
            <Select
              value={routerId}
              onValueChange={(value) => {
                setRouterId(value);
                setHasChanges(true);
              }}
            >
              <SelectTrigger className="h-10 w-full bg-theme-settings-input-bg text-theme-text-primary">
                <SelectValue
                  placeholder={t(
                    "model-router.workspace.choose-router",
                    "Choose a router"
                  )}
                >
                  {selectedRouter?.name}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {routers.map((router) => (
                  <SelectItem key={router.id} value={String(router.id)}>
                    {router.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="text-sm text-theme-text-secondary">
              {t(
                "model-router.workspace.no-routers",
                "No model routers have been created yet."
              )}{" "}
              <a
                className="text-primary-button hover:underline"
                href={paths.settings.modelRouters()}
              >
                {t("model-router.workspace.manage-routers", "Manage routers")}
              </a>
            </p>
          )}
          {selectedRouter && (
            <p className="text-xs text-theme-text-secondary">
              {t("model-router.workspace.fallback", "Primary model")}:{" "}
              {selectedRouter.fallback_model}
            </p>
          )}
        </div>
      ) : (
        <>
          {model && (
            <input type="hidden" name="chatProvider" value="generic-openai" />
          )}
          <CuratedModelPicker
            name="chatModel"
            value={model}
            onChange={(value) => {
              setModel(value);
              setTouched(true);
              setHasChanges(true);
            }}
            models={available.models}
            loading={available.loading}
            error={available.error}
            onRefresh={available.refresh}
            label={t("chat.model.title")}
            description={t("chat.model.description")}
          />
        </>
      )}
    </div>
  );
}

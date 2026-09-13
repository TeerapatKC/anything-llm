import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import CuratedModelPicker, {
  selectAvailableModel,
  useAvailableLlmModels,
} from "@/components/LLMSelection/CuratedModels";

export default function AgentLLMSelection({
  settings,
  workspace,
  setHasChanges,
  markMismatchAsChanged = true,
}) {
  const { t } = useTranslation();
  const available = useAvailableLlmModels();
  const [touched, setTouched] = useState(false);
  const [model, setModel] = useState("");

  useEffect(() => {
    if (available.loading) return;
    setModel(
      selectAvailableModel(
        available.models,
        touched ? model : workspace?.agentModel,
        workspace?.chatModel,
        settings?.GenericOpenAiModelPref
      )
    );
  }, [
    available.loading,
    available.models,
    workspace?.agentModel,
    workspace?.chatModel,
    settings?.GenericOpenAiModelPref,
    touched,
    model,
  ]);

  useEffect(() => {
    if (
      markMismatchAsChanged &&
      workspace &&
      model &&
      (workspace.agentProvider !== "generic-openai" ||
        workspace.agentModel !== model)
    ) {
      setHasChanges(true);
    }
  }, [
    workspace?.agentProvider,
    workspace?.agentModel,
    model,
    setHasChanges,
    markMismatchAsChanged,
  ]);

  function selectModel(value) {
    setModel(value);
    setTouched(true);
    setHasChanges(true);
  }

  return (
    <div className="flex w-full flex-col gap-3">
      {model && (
        <input type="hidden" name="agentProvider" value="generic-openai" />
      )}
      <CuratedModelPicker
        name="agentModel"
        value={model}
        onChange={selectModel}
        models={available.models}
        loading={available.loading}
        error={available.error}
        onRefresh={available.refresh}
        label={t("agent.mode.title")}
        description={t("agent.mode.description")}
      />
    </div>
  );
}

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import CuratedModelPicker, {
  selectAvailableModel,
  useAvailableLlmModels,
} from "@/components/LLMSelection/CuratedModels";

export default function WorkspaceLLMSelection({
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
    if (
      markMismatchAsChanged &&
      workspace &&
      model &&
      (workspace.chatProvider !== "generic-openai" ||
        workspace.chatModel !== model)
    ) {
      setHasChanges(true);
    }
  }, [
    workspace?.chatProvider,
    workspace?.chatModel,
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
        <input type="hidden" name="chatProvider" value="generic-openai" />
      )}
      <CuratedModelPicker
        name="chatModel"
        value={model}
        onChange={selectModel}
        models={available.models}
        loading={available.loading}
        error={available.error}
        onRefresh={available.refresh}
        label={t("chat.model.title")}
        description={t("chat.model.description")}
      />
    </div>
  );
}

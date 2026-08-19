import useGetProviderModels, {
  DISABLED_PROVIDERS,
} from "@/hooks/useGetProvidersModels";
import paths from "@/utils/paths";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * These models do NOT support function calling
 * or do not support system prompts
 * and therefore are not supported for agents.
 * @param {string} provider - The AI provider.
 * @param {string} model - The model name.
 * @returns {boolean} Whether the model is supported for agents.
 */
function supportedModel(provider, model = "") {
  if (provider === "openai") {
    return (
      [
        "gpt-3.5-turbo-0301",
        "gpt-4-turbo-2024-04-09",
        "gpt-4-turbo",
        "o1-preview",
        "o1-preview-2024-09-12",
        "o1-mini",
        "o1-mini-2024-09-12",
        "o3-mini",
        "o3-mini-2025-01-31",
      ].includes(model) === false
    );
  }

  return true;
}

export default function AgentModelSelection({
  provider,
  workspace,
  setHasChanges,
}) {
  const { slug } = useParams();
  const { defaultModels, customModels, loading, downloadedModels } =
    useGetProviderModels(provider);

  const { t } = useTranslation();
  if (DISABLED_PROVIDERS.includes(provider)) {
    return (
      <div className="w-full h-10 justify-center items-center flex">
        <p className="text-sm font-base text-theme-text-primary text-opacity-60 text-center">
          Multi-model support is not supported for this provider yet.
          <br />
          Agent's will use{" "}
          <Link
            to={paths.workspace.settings.chatSettings(slug)}
            className="underline"
          >
            the model set for the workspace
          </Link>{" "}
          or{" "}
          <Link to={paths.settings.llmPreference()} className="underline">
            the model set for the system.
          </Link>
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div>
        <div className="flex flex-col">
          <label htmlFor="name" className="block input-label">
            {t("agent.mode.chat.title")}
          </label>
          <p className="text-theme-text-primary text-opacity-60 text-xs font-medium py-1.5">
            {t("agent.mode.chat.description")}
          </p>
        </div>
        <Select name="agentModel" required={true} disabled={true}>
          <SelectTrigger>
            <SelectValue placeholder={t("agent.mode.wait")} />
          </SelectTrigger>
          <SelectContent />
        </Select>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col">
        <label htmlFor="name" className="block input-label">
          {t("agent.mode.title")}
        </label>
        <p className="text-theme-text-primary text-opacity-60 text-xs font-medium py-1.5">
          {t("agent.mode.description")}
        </p>
      </div>

      <Select
        name="agentModel"
        required={true}
        defaultValue={workspace?.agentModel ?? undefined}
        onValueChange={() => {
          setHasChanges(true);
        }}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select a model" />
        </SelectTrigger>
        <SelectContent>
          {defaultModels.length > 0 && (
            <SelectGroup>
              <SelectLabel>General models</SelectLabel>
              {defaultModels.map((model) => {
                if (!supportedModel(provider, model)) return null;
                return (
                  <SelectItem key={model} value={model}>
                    {model}
                  </SelectItem>
                );
              })}
            </SelectGroup>
          )}
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
          {Array.isArray(customModels) && customModels.length > 0 && (
            <SelectGroup>
              <SelectLabel>Custom models</SelectLabel>
              {customModels.map((model) => {
                if (!supportedModel(provider, model.id)) return null;

                return (
                  <SelectItem key={model.id} value={model.id}>
                    {model.id}
                  </SelectItem>
                );
              })}
            </SelectGroup>
          )}
          {/* For providers like TogetherAi where we partition model by creator entity. */}
          {!Array.isArray(customModels) &&
            Object.keys(customModels).length > 0 && (
              <>
                {Object.entries(customModels).map(([organization, models]) => (
                  <SelectGroup key={organization}>
                    <SelectLabel>{organization}</SelectLabel>
                    {models.map((model) => {
                      if (!supportedModel(provider, model.id)) return null;
                      return (
                        <SelectItem key={model.id} value={model.id}>
                          {model.name || model.id}
                        </SelectItem>
                      );
                    })}
                  </SelectGroup>
                ))}
              </>
            )}
        </SelectContent>
      </Select>
    </div>
  );
}

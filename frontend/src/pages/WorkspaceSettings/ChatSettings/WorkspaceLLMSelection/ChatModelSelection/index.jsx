import useGetProviderModels, {
  DISABLED_PROVIDERS,
} from "@/hooks/useGetProvidersModels";
import { useTranslation } from "react-i18next";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function ChatModelSelection({
  provider,
  workspace,
  setHasChanges,
}) {
  const { defaultModels, customModels, loading, downloadedModels } =
    useGetProviderModels(provider);
  const { t } = useTranslation();
  if (DISABLED_PROVIDERS.includes(provider)) return null;

  if (loading) {
    return (
      <div className="flex flex-col gap-y-[8px]">
        <div className="flex flex-col gap-y-[8px]">
          <label htmlFor="name" className="block input-label">
            {t("chat.model.title")}
          </label>
          <p className="text-white text-opacity-60 text-xs font-medium">
            {t("chat.model.description")}
          </p>
        </div>
        <Select name="chatModel" required={true} disabled={true}>
          <SelectTrigger variant="settings">
            <SelectValue placeholder="-- waiting for models --" />
          </SelectTrigger>
          <SelectContent />
        </Select>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-y-[8px]">
      <div className="flex flex-col gap-y-[8px]">
        <label htmlFor="name" className="block input-label">
          {t("chat.model.title")}
        </label>
        <p className="text-white text-opacity-60 text-xs font-medium">
          {t("chat.model.description")}
        </p>
      </div>

      <Select
        name="chatModel"
        required={true}
        defaultValue={workspace?.chatModel ?? undefined}
        onValueChange={() => {
          setHasChanges(true);
        }}
      >
        <SelectTrigger variant="settings">
          <SelectValue placeholder="Select a model" />
        </SelectTrigger>
        <SelectContent>
          {defaultModels.length > 0 && (
            <SelectGroup>
              <SelectLabel>General models</SelectLabel>
              {defaultModels.map((model) => {
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
              <SelectLabel>Discovered models</SelectLabel>
              {customModels.map((model) => {
                return (
                  <SelectItem key={model.id} value={model.id}>
                    {model.name || model.id}
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
                    {models.map((model) => (
                      <SelectItem key={model.id} value={model.id}>
                        {model.name || model.id}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </>
            )}
        </SelectContent>
      </Select>
    </div>
  );
}

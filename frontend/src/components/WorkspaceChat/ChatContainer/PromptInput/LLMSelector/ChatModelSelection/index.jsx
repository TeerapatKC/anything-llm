import useGetProviderModels, {
  DISABLED_PROVIDERS,
} from "@/hooks/useGetProvidersModels";
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
  setHasChanges,
  selectedLLMModel,
  setSelectedLLMModel,
}) {
  const { defaultModels, customModels, loading, downloadedModels } =
    useGetProviderModels(provider);
  if (DISABLED_PROVIDERS.includes(provider)) return null;

  if (loading) {
    return (
      <Select required={true} disabled={true}>
        <SelectTrigger className="bg-zinc-900 light:bg-white text-white light:text-slate-900 text-sm rounded-lg h-8 w-full px-2.5 outline-none border border-zinc-900 light:border-slate-400 cursor-not-allowed">
          <SelectValue placeholder="-- waiting for models --" />
        </SelectTrigger>
        <SelectContent />
      </Select>
    );
  }

  return (
    <Select
      required={true}
      value={selectedLLMModel}
      onValueChange={(value) => {
        setHasChanges(true);
        setSelectedLLMModel(value);
      }}
    >
      <SelectTrigger
        id="workspace-llm-model-select"
        className="bg-zinc-900 light:bg-white text-white light:text-slate-900 text-sm rounded-lg h-8 w-full px-2.5 outline-none border border-zinc-900 light:border-slate-400 cursor-pointer"
      >
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
  );
}

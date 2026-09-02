import { useTranslation } from "react-i18next";
import System from "@/models/system";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function OpenRouterOptions({ settings }) {
  return (
    <div className="flex flex-col gap-y-4 mt-1.5">
      <div className="flex gap-9">
        <div className="flex flex-col w-60">
          <Label className="block mb-3">OpenRouter API Key</Label>
          <Input
            type="password"
            name="OpenRouterApiKey"
            placeholder="OpenRouter API Key"
            defaultValue={settings?.OpenRouterApiKey ? "*".repeat(20) : ""}
            required={true}
            autoComplete="new-password"
            spellCheck={false}
          />
        </div>
        {!settings?.credentialsOnly && (
          <OpenRouterModelSelection settings={settings} />
        )}
      </div>
      <AdvancedControls settings={settings} />
    </div>
  );
}

function AdvancedControls({ settings }) {
  const { t } = useTranslation();
  const [showAdvancedControls, setShowAdvancedControls] = useState(false);

  return (
    <div className="flex flex-col gap-y-4">
      <div className="flex justify-start">
        <Button
          type="button"
          variant="link"
          size="sm"
          onClick={() => setShowAdvancedControls(!showAdvancedControls)}
        >
          {showAdvancedControls ? "Hide" : "Show"} advanced settings
          {showAdvancedControls ? (
            <ChevronUp size={14} className="ml-1" />
          ) : (
            <ChevronDown size={14} className="ml-1" />
          )}
        </Button>
      </div>
      <div hidden={!showAdvancedControls}>
        <div className="flex flex-col w-60">
          <Label className="block mb-3">
            {t("provider-options.stream-timeout")}
          </Label>
          <Input
            type="number"
            name="OpenRouterTimeout"
            placeholder={t("provider-options.stream-timeout-placeholder")}
            defaultValue={settings?.OpenRouterTimeout ?? 3_000}
            autoComplete="off"
            onScroll={(e) => e.target.blur()}
            min={500}
            step={1}
          />
        </div>
      </div>
    </div>
  );
}

function OpenRouterModelSelection({ settings }) {
  const { t } = useTranslation();
  const [groupedModels, setGroupedModels] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedModel, setSelectedModel] = useState(
    settings?.OpenRouterModelPref || ""
  );

  useEffect(() => {
    setSelectedModel(settings?.OpenRouterModelPref || "");
  }, [settings?.OpenRouterModelPref]);

  useEffect(() => {
    async function findCustomModels() {
      setLoading(true);
      const { models } = await System.customModels("openrouter");
      if (models?.length > 0) {
        const modelsByOrganization = models.reduce((acc, model) => {
          acc[model.organization] = acc[model.organization] || [];
          acc[model.organization].push(model);
          return acc;
        }, {});

        setGroupedModels(modelsByOrganization);
      }

      setLoading(false);
    }
    findCustomModels();
  }, []);

  if (loading || Object.keys(groupedModels).length === 0) {
    return (
      <div className="flex flex-col w-60">
        <Label className="block mb-3">
          {t("provider-options.chat-model-selection")}
        </Label>
        <Select name="OpenRouterModelPref" disabled={true}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder={t("provider-options.loading-models")} />
          </SelectTrigger>
          <SelectContent />
        </Select>
      </div>
    );
  }

  const defaultFirstModel =
    groupedModels[Object.keys(groupedModels).sort()[0]]?.[0]?.id || "";
  const currentModel =
    selectedModel || settings?.OpenRouterModelPref || defaultFirstModel;

  return (
    <div className="flex flex-col w-60">
      <Label className="block mb-3">
        {t("provider-options.chat-model-selection")}
      </Label>
      <Select
        name="OpenRouterModelPref"
        required={true}
        value={currentModel}
        onValueChange={setSelectedModel}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder={t("provider-options.select-option")} />
        </SelectTrigger>
        <SelectContent>
          {Object.keys(groupedModels)
            .sort()
            .map((organization) => (
              <SelectGroup key={organization}>
                <SelectLabel>{organization}</SelectLabel>
                {groupedModels[organization].map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    {model.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
        </SelectContent>
      </Select>
    </div>
  );
}

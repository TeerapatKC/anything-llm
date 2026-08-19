import System from "@/models/system";
import { useState, useEffect } from "react";
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

export default function ApiPieLLMOptions({ settings }) {
  return (
    <div className="flex flex-col gap-y-4 mt-1.5">
      <div className="flex gap-[36px]">
        <div className="flex flex-col w-60">
          <Label className="block mb-3">APIpie API Key</Label>
          <Input
            type="password"
            name="ApipieLLMApiKey"
            placeholder="APIpie API Key"
            defaultValue={settings?.ApipieLLMApiKey ? "*".repeat(20) : ""}
            required={true}
            autoComplete="new-password"
            spellCheck={false}
          />
        </div>
        {!settings?.credentialsOnly && (
          <APIPieModelSelection settings={settings} />
        )}
      </div>
    </div>
  );
}

function APIPieModelSelection({ settings }) {
  const [groupedModels, setGroupedModels] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function findCustomModels() {
      setLoading(true);
      const { models } = await System.customModels("apipie");
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
        <Label className="block mb-3">Chat Model Selection</Label>
        <Select name="ApipieLLMModelPref" disabled={true}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="-- loading available models --" />
          </SelectTrigger>
          <SelectContent />
        </Select>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-60">
      <Label className="block mb-3">Chat Model Selection</Label>
      <Select
        name="ApipieLLMModelPref"
        required={true}
        defaultValue={
          settings?.ApipieLLMModelPref ??
          groupedModels[Object.keys(groupedModels).sort()[0]]?.[0]?.id
        }
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select an option" />
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

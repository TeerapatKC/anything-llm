import { useEffect, useState } from "react";
import System from "@/models/system";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function FoundryOptions({ settings }) {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(!!settings?.FoundryBasePath);
  const [basePath, setBasePath] = useState(settings?.FoundryBasePath);
  const [model, setModel] = useState(settings?.FoundryModelPref || "");

  useEffect(() => {
    setModel(settings?.FoundryModelPref || "");
  }, [settings?.FoundryModelPref]);

  useEffect(() => {
    async function fetchModels() {
      try {
        setLoading(true);
        if (!basePath) throw new Error("Base path is required");
        const { models, error } = await System.customModels(
          "foundry",
          null,
          basePath
        );
        if (error) throw new Error(error);
        setModels(models);
      } catch (error) {
        console.error("Error fetching Foundry models:", error);
        setModels([]);
      } finally {
        setLoading(false);
      }
    }
    fetchModels();
  }, [basePath]);

  return (
    <div className="flex flex-col gap-y-7">
      <div className="flex gap-[36px] mt-1.5 flex-wrap">
        <div className="flex flex-col w-60">
          <Label variant="settings" className="block mb-3">
            Base URL
          </Label>
          <Input
            variant="settings"
            type="url"
            name="FoundryBasePath"
            placeholder="eg: http://127.0.0.1:8080"
            defaultValue={settings?.FoundryBasePath}
            required={true}
            autoComplete="off"
            spellCheck={false}
            onChange={(e) => setBasePath(e.target.value)}
          />
        </div>
        <div className="flex flex-col w-60">
          <Label variant="settings" className="block mb-3">
            Chat Model
          </Label>
          {loading ? (
            <Select name="FoundryModelPref" required={true} disabled={true}>
              <SelectTrigger variant="settings">
                <SelectValue placeholder="Select an option" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem>---- Loading ----</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <Select
              name="FoundryModelPref"
              // "" keeps this controlled for its whole lifetime and reads as
              // "nothing picked", surfacing through the trigger placeholder the
              // way the old `<option value="">` row did.
              value={model}
              onValueChange={setModel}
              required={true}
            >
              <SelectTrigger variant="settings">
                <SelectValue placeholder="-- Select a model --" />
              </SelectTrigger>
              <SelectContent>
                {models.length > 0 ? (
                  models.map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      {model.id}
                    </SelectItem>
                  ))
                ) : (
                  // SelectItem rejects an empty value; disabled so it can never
                  // be submitted.
                  <SelectItem disabled value="__no_models">
                    No models found
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          )}
        </div>
        <div className="flex flex-col w-60">
          <Label variant="settings" className="block mb-3">
            Model context window
          </Label>
          <Input
            variant="settings"
            type="number"
            name="FoundryModelTokenLimit"
            placeholder="4096"
            defaultValue={settings?.FoundryModelTokenLimit}
            autoComplete="off"
            min={0}
          />
        </div>
      </div>
    </div>
  );
}

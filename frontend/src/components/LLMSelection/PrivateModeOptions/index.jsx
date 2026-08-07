import { useEffect, useState } from "react";
import { Info } from "@phosphor-icons/react";
import { Tooltip } from "react-tooltip";
import System from "@/models/system";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function PrivateModeOptions({ settings }) {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(!!settings?.PrivateModeBasePath);
  const [basePath, setBasePath] = useState(settings?.PrivateModeBasePath);
  const [model, setModel] = useState(settings?.PrivateModeModelPref || "");

  useEffect(() => {
    setModel(settings?.PrivateModeModelPref || "");
  }, [settings?.PrivateModeModelPref]);

  useEffect(() => {
    async function fetchModels() {
      try {
        setLoading(true);
        if (!basePath) throw new Error("Base path is required");
        const { models, error } = await System.customModels(
          "privatemode",
          null,
          basePath
        );
        if (error) throw new Error(error);
        setModels(models);
      } catch (error) {
        console.error("Error fetching Private Mode models:", error);
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
          <div className="flex items-center gap-1 mb-2">
            <Label variant="settings">Privatemode Proxy URL</Label>
            <Info
              size={18}
              className="text-theme-text-secondary cursor-pointer"
              data-tooltip-id="private-mode-base-url"
            />
            <Tooltip
              id="private-mode-base-url"
              place="top"
              delayShow={300}
              clickable={true}
              className="tooltip !text-xs !opacity-100"
              style={{
                maxWidth: "250px",
                whiteSpace: "normal",
                wordWrap: "break-word",
              }}
            >
              Enter the URL where Privatemode Proxy is running.
              <br />
              <br />
              <Link
                to="https://docs.privatemode.ai/quickstart#2-run-the-proxy"
                target="_blank"
                className="text-blue-500 hover:underline"
              >
                Learn more &rarr;
              </Link>
            </Tooltip>
          </div>
          <Input
            variant="settings"
            type="url"
            name="PrivateModeBasePath"
            placeholder="eg: http://127.0.0.1:8080"
            defaultValue={settings?.PrivateModeBasePath}
            required={true}
            autoComplete="off"
            spellCheck={false}
            onChange={(e) => setBasePath(e.target.value)}
          />
        </div>
        <div className="flex flex-col w-60">
          <Label variant="settings" className="block mb-2">
            Chat Model
          </Label>
          {loading ? (
            <Select name="PrivateModeModelPref" required={true} disabled={true}>
              <SelectTrigger variant="settings">
                <SelectValue placeholder="---- Loading ----" />
              </SelectTrigger>
              <SelectContent />
            </Select>
          ) : (
            <Select
              name="PrivateModeModelPref"
              // "" keeps this controlled for its whole lifetime and reads as
              // "nothing picked", surfacing through the trigger placeholder the
              // way the old `<option value="">` row did. Passing undefined
              // instead would flip Radix between uncontrolled and controlled.
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
                      {model.name}
                    </SelectItem>
                  ))
                ) : (
                  // SelectItem rejects an empty value outright; this row is
                  // disabled so its value can never be submitted.
                  <SelectItem disabled value="__no_models">
                    No models found
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>
    </div>
  );
}

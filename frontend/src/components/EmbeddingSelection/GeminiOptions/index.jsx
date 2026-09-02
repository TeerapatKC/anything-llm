import { useTranslation } from "react-i18next";
import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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

const DEFAULT_MODELS = [
  {
    id: "gemini-embedding-001",
    name: "Gemini Embedding 001",
  },
  {
    id: "gemini-embedding-2",
    name: "Gemini Embedding 2",
  },
];

export default function GeminiOptions({ settings }) {
  const { t } = useTranslation();
  return (
    <div className="w-full flex flex-col gap-y-6">
      <div className="w-full flex flex-col gap-y-4">
        <div className="w-full flex items-center gap-[36px] mt-1.5">
          <div className="flex flex-col w-60">
            <Label className="block mb-3">
              {t("provider-options.api-key")}
            </Label>
            <Input
              type="password"
              name="GeminiEmbeddingApiKey"
              placeholder="Gemini API Key"
              defaultValue={
                settings?.GeminiEmbeddingApiKey ? "*".repeat(20) : ""
              }
              required={true}
              autoComplete="new-password"
              spellCheck={false}
            />
          </div>
          <div className="flex flex-col w-60">
            <Label className="block mb-3">
              {t("provider-options.model-preference")}
            </Label>
            <Select
              name="EmbeddingModelPref"
              required={true}
              defaultValue={
                settings?.EmbeddingModelPref ?? DEFAULT_MODELS?.[0]?.id
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue
                  placeholder={t("provider-options.select-option")}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>
                    {t("provider-options.available-embedding-models")}
                  </SelectLabel>
                  {DEFAULT_MODELS.map((model) => {
                    return (
                      <SelectItem key={model.id} value={model.id}>
                        {model.name}
                      </SelectItem>
                    );
                  })}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      <div className="flex flex-col w-60">
        <Tooltip>
          <TooltipTrigger
            render={<div className="flex gap-x-1 items-center mb-3" />}
          >
            <Label className="block">
              {t("provider-options.output-dimensions")}
            </Label>
            <Info
              size={16}
              className="text-theme-text-secondary cursor-pointer"
            />
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[250px] text-xs">
            {t("help.gemini-options")}
            <br />
            <br /> Leave blank to use the default dimensions for the selected
            model.
          </TooltipContent>
        </Tooltip>
        <Input
          type="number"
          name="EmbeddingOutputDimensions"
          placeholder={t("provider-options.assume-default-dimensions")}
          min={1}
          onScroll={(e) => e.target.blur()}
          defaultValue={settings?.EmbeddingOutputDimensions}
          required={false}
          autoComplete="off"
        />
      </div>
    </div>
  );
}

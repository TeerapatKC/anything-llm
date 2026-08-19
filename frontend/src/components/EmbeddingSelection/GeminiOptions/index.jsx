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
];

export default function GeminiOptions({ settings }) {
  return (
    <div className="w-full flex flex-col gap-y-6">
      <div className="w-full flex flex-col gap-y-4">
        <div className="w-full flex items-center gap-[36px] mt-1.5">
          <div className="flex flex-col w-60">
            <Label className="block mb-3">API Key</Label>
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
            <Label className="block mb-3">Model Preference</Label>
            <Select
              name="EmbeddingModelPref"
              required={true}
              defaultValue={
                settings?.EmbeddingModelPref ?? DEFAULT_MODELS?.[0]?.id
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select an option" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Available embedding models</SelectLabel>
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
            <Label className="block">Output dimensions</Label>
            <Info
              size={16}
              className="text-theme-text-secondary cursor-pointer"
            />
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[250px] text-xs">
            The number of dimensions the resulting output embeddings should have
            if it supports multiple dimensions output.
            <br />
            <br /> Leave blank to use the default dimensions for the selected
            model.
          </TooltipContent>
        </Tooltip>
        <Input
          type="number"
          name="EmbeddingOutputDimensions"
          placeholder="Assume default dimensions"
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

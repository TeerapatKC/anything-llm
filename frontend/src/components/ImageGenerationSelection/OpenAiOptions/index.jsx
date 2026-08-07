import { useState } from "react";
import ImageModelSelection from "../ImageModelSelection";
import ImageDimensionSelection from "../ImageDimensionSelection";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function OpenAiImageOptions({ settings }) {
  const [inputValue, setInputValue] = useState(
    settings?.ImageGenerationOpenAiKey
  );
  const [apiKey, setApiKey] = useState(settings?.ImageGenerationOpenAiKey);

  return (
    <div className="w-full flex flex-col gap-y-4">
      <div className="w-full flex items-start gap-[36px] mt-1.5">
        <div className="flex flex-col w-60">
          <Label variant="settings" className="block mb-3">
            API Key
          </Label>
          <Input
            variant="settings"
            type="password"
            name="ImageGenerationOpenAiKey"
            placeholder="OpenAI API Key"
            defaultValue={
              settings?.ImageGenerationOpenAiKey ? "*".repeat(20) : ""
            }
            required={true}
            autoComplete="off"
            spellCheck={false}
            onChange={(e) => setInputValue(e.target.value)}
            onBlur={() => setApiKey(inputValue)}
          />
        </div>
        <ImageModelSelection
          provider="openai-imggen"
          apiKey={apiKey}
          settings={settings}
        />
        <ImageDimensionSelection provider="openai-imggen" settings={settings} />
      </div>
    </div>
  );
}

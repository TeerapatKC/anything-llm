import { useState } from "react";
import ImageModelSelection from "../ImageModelSelection";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function OpenRouterImageOptions({ settings }) {
  const [inputValue, setInputValue] = useState(
    settings?.ImageGenerationOpenRouterApiKey
  );
  const [apiKey, setApiKey] = useState(
    settings?.ImageGenerationOpenRouterApiKey
  );

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
            name="ImageGenerationOpenRouterApiKey"
            placeholder="OpenRouter API Key"
            defaultValue={
              settings?.ImageGenerationOpenRouterApiKey ? "*".repeat(20) : ""
            }
            required={true}
            autoComplete="new-password"
            spellCheck={false}
            onChange={(e) => setInputValue(e.target.value)}
            onBlur={() => setApiKey(inputValue)}
          />
        </div>
        <ImageModelSelection
          provider="openrouter-imggen"
          apiKey={apiKey}
          settings={settings}
        />
      </div>
    </div>
  );
}

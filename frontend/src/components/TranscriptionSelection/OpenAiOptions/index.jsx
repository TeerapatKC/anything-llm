import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function OpenAiWhisperOptions({ settings }) {
  const [inputValue, setInputValue] = useState(settings?.OpenAiKey);
  const [_openAIKey, setOpenAIKey] = useState(settings?.OpenAiKey);

  return (
    <div className="flex gap-x-7 gap-[36px] mt-1.5">
      <div className="flex flex-col w-60">
        <Label variant="settings" className="block mb-3">
          API Key
        </Label>
        <Input
          variant="settings"
          type="password"
          name="OpenAiKey"
          placeholder="OpenAI API Key"
          defaultValue={settings?.OpenAiKey ? "*".repeat(20) : ""}
          required={true}
          autoComplete="new-password"
          spellCheck={false}
          onChange={(e) => setInputValue(e.target.value)}
          onBlur={() => setOpenAIKey(inputValue)}
        />
      </div>
      <div className="flex flex-col w-60">
        <Label variant="settings" className="block mb-3">
          Whisper Model
        </Label>
        <Select disabled={true}>
          <SelectTrigger className="border-none flex-shrink-0 bg-theme-settings-input-bg border-gray-500 text-white text-sm rounded-lg w-full p-2.5">
            <SelectValue placeholder="Whisper Large" />
          </SelectTrigger>
          <SelectContent />
        </Select>
      </div>
    </div>
  );
}

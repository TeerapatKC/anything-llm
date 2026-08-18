import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
function toProperCase(string) {
  return string.replace(/\w\S*/g, function (txt) {
    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
  });
}

export default function OpenAiTextToSpeechOptions({ settings }) {
  const apiKey = settings?.TTSOpenAIKey;

  return (
    <div className="flex gap-x-4">
      <div className="flex flex-col w-60">
        <Label variant="settings" className="block mb-3">
          API Key
        </Label>
        <Input
          variant="settings"
          type="password"
          name="TTSOpenAIKey"
          placeholder="OpenAI API Key"
          defaultValue={apiKey ? "*".repeat(20) : ""}
          required={true}
          autoComplete="new-password"
          spellCheck={false}
        />
      </div>
      <div className="flex flex-col w-60">
        <Label variant="settings" className="block mb-3">
          Voice Model
        </Label>
        <Select
          name="TTSOpenAIVoiceModel"
          defaultValue={settings?.TTSOpenAIVoiceModel ?? "alloy"}
        >
          <SelectTrigger variant="settings">
            <SelectValue placeholder="Select an option" />
          </SelectTrigger>
          <SelectContent>
            {["alloy", "echo", "fable", "onyx", "nova", "shimmer"].map(
              (voice) => {
                return (
                  <SelectItem key={voice} value={voice}>
                    {toProperCase(voice)}
                  </SelectItem>
                );
              }
            )}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

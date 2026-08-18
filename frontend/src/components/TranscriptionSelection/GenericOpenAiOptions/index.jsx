import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
export default function GenericOpenAiWhisperOptions({ settings }) {
  return (
    <div className="flex gap-x-7 gap-[36px] mt-1.5 flex-wrap">
      <div className="flex flex-col w-60">
        <Label variant="settings" className="block mb-3">
          Base URL
        </Label>
        <Input
          variant="settings"
          type="url"
          name="WhisperGenericOpenAiBaseUrl"
          placeholder="http://localhost:8000/v1"
          defaultValue={settings?.WhisperGenericOpenAiBaseUrl}
          required={true}
          autoComplete="off"
          spellCheck={false}
        />
        <p className="text-xs leading-[18px] font-base text-white text-opacity-60 mt-2">
          The base URL of the OpenAI-compatible service used to transcribe
          audio.
        </p>
      </div>
      <div className="flex flex-col w-60">
        <Label variant="settings" className="block mb-3">
          API Key
        </Label>
        <Input
          variant="settings"
          type="password"
          name="WhisperGenericOpenAiApiKey"
          placeholder="API Key"
          defaultValue={
            settings?.WhisperGenericOpenAiApiKey ? "*".repeat(20) : ""
          }
          autoComplete="new-password"
          spellCheck={false}
        />
        <p className="text-xs leading-[18px] font-base text-white text-opacity-60 mt-2">
          Optional - Only required if your service enforces authentication.
        </p>
      </div>
      <div className="flex flex-col w-60">
        <Label variant="settings" className="block mb-3">
          Transcription Model
        </Label>
        <Input
          variant="settings"
          type="text"
          name="WhisperGenericOpenAiModel"
          placeholder="whisper-small"
          defaultValue={settings?.WhisperGenericOpenAiModel}
          required={true}
          autoComplete="off"
          spellCheck={false}
        />
        <p className="text-xs leading-[18px] font-base text-white text-opacity-60 mt-2">
          The model identifier to be used for transcription.
        </p>
      </div>
    </div>
  );
}

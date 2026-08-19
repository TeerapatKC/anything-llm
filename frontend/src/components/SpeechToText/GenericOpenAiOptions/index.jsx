import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
export default function GenericOpenAiSpeechToTextOptions({ settings }) {
  return (
    <div className="w-full flex flex-col gap-y-7">
      <div className="flex gap-x-4">
        <div className="flex flex-col w-60">
          <Label className="block mb-2">Base URL</Label>
          <Input
            type="url"
            name="STTOpenAICompatibleEndpoint"
            placeholder="http://localhost:8000/v1"
            defaultValue={settings?.STTOpenAICompatibleEndpoint}
            required={true}
            autoComplete="off"
            spellCheck={false}
          />
          <p className="text-xs leading-[18px] font-base text-theme-text-primary text-opacity-60 mt-2">
            This should be the base URL of the OpenAI compatible STT service you
            will transcribe audio with.
          </p>
        </div>
        <div className="flex flex-col w-60">
          <Label className="block mb-2">API Key</Label>
          <Input
            type="password"
            name="STTOpenAICompatibleKey"
            placeholder="API Key"
            defaultValue={
              settings?.STTOpenAICompatibleKey ? "*".repeat(20) : ""
            }
            autoComplete="new-password"
            spellCheck={false}
          />
          <p className="text-xs leading-[18px] font-base text-theme-text-primary text-opacity-60 mt-2">
            Some STT services require an API key to transcribe audio - this is
            optional if your service does not require one.
          </p>
        </div>
        <div className="flex flex-col w-60">
          <Label className="block mb-2">Transcription Model</Label>
          <Input
            type="text"
            name="STTOpenAICompatibleModel"
            placeholder="Your STT model identifier"
            defaultValue={settings?.STTOpenAICompatibleModel}
            required={true}
            autoComplete="off"
            spellCheck={false}
          />
          <p className="text-xs leading-[18px] font-base text-theme-text-primary text-opacity-60 mt-2">
            The <code>model</code> parameter passed to the transcription
            endpoint (e.g. <code>whisper-1</code>).
          </p>
        </div>
      </div>
    </div>
  );
}

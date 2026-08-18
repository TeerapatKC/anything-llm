import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
export default function ChromaDBOptions({ settings }) {
  return (
    <div className="w-full flex flex-col gap-y-7">
      <div className="w-full flex items-center gap-[36px] mt-1.5">
        <div className="flex flex-col w-60">
          <Label variant="settings" className="block mb-3">
            Chroma Endpoint
          </Label>
          <Input
            variant="settings"
            type="url"
            name="ChromaEndpoint"
            placeholder="http://localhost:8000"
            defaultValue={settings?.ChromaEndpoint}
            required={true}
            autoComplete="off"
            spellCheck={false}
          />
        </div>

        <div className="flex flex-col w-60">
          <Label variant="settings" className="block mb-3">
            API Header
          </Label>
          <Input
            variant="settings"
            name="ChromaApiHeader"
            autoComplete="off"
            type="text"
            defaultValue={settings?.ChromaApiHeader}
            placeholder="X-Api-Key"
          />
        </div>

        <div className="flex flex-col w-60">
          <Label variant="settings" className="block mb-3">
            API Key
          </Label>
          <Input
            variant="settings"
            name="ChromaApiKey"
            autoComplete="new-password"
            type="password"
            defaultValue={settings?.ChromaApiKey ? "*".repeat(20) : ""}
            placeholder="sk-myApiKeyToAccessMyChromaInstance"
          />
        </div>
      </div>
    </div>
  );
}

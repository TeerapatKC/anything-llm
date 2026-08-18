import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
export default function QDrantDBOptions({ settings }) {
  return (
    <div className="w-full flex flex-col gap-y-7">
      <div className="w-full flex items-center gap-[36px] mt-1.5">
        <div className="flex flex-col w-60">
          <Label variant="settings" className="block mb-3">
            QDrant API Endpoint
          </Label>
          <Input
            variant="settings"
            type="url"
            name="QdrantEndpoint"
            placeholder="http://localhost:6633"
            defaultValue={settings?.QdrantEndpoint}
            required={true}
            autoComplete="off"
            spellCheck={false}
          />
        </div>

        <div className="flex flex-col w-60">
          <Label variant="settings" className="block mb-3">
            API Key
          </Label>
          <Input
            variant="settings"
            type="password"
            name="QdrantApiKey"
            placeholder="wOeqxsYP4....1244sba"
            defaultValue={settings?.QdrantApiKey ? "*".repeat(20) : ""}
            autoComplete="new-password"
            spellCheck={false}
          />
        </div>
      </div>
    </div>
  );
}

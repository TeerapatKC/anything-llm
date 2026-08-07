import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
export default function ZillizCloudOptions({ settings }) {
  return (
    <div className="w-full flex flex-col gap-y-4">
      <div className="w-full flex items-center gap-[36px] mt-1.5">
        <div className="flex flex-col w-60">
          <Label variant="settings" className="block mb-3">
            Cluster Endpoint
          </Label>
          <Input
            variant="settings"
            type="text"
            name="ZillizEndpoint"
            placeholder="https://sample.api.gcp-us-west1.zillizcloud.com"
            defaultValue={settings?.ZillizEndpoint}
            required={true}
            autoComplete="off"
            spellCheck={false}
          />
        </div>

        <div className="flex flex-col w-60">
          <Label variant="settings" className="block mb-3">
            API Token
          </Label>
          <Input
            variant="settings"
            type="password"
            name="ZillizApiToken"
            placeholder="Zilliz cluster API Token"
            defaultValue={settings?.ZillizApiToken ? "*".repeat(20) : ""}
            autoComplete="off"
            spellCheck={false}
          />
        </div>
      </div>
    </div>
  );
}

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
export default function ChromaCloudOptions({ settings }) {
  return (
    <div className="w-full flex flex-col gap-y-7">
      <div className="w-full flex items-center gap-[36px] mt-1.5">
        <div className="flex flex-col w-60">
          <Label className="block mb-3">API Key</Label>
          <Input
            type="password"
            name="ChromaCloudApiKey"
            placeholder="ck-your-api-key-here"
            defaultValue={settings?.ChromaCloudApiKey ? "*".repeat(20) : ""}
            required={true}
            autoComplete="new-password"
            spellCheck={false}
          />
        </div>

        <div className="flex flex-col w-60">
          <Label className="block mb-3">Tenant ID</Label>
          <Input
            name="ChromaCloudTenant"
            autoComplete="off"
            type="text"
            defaultValue={settings?.ChromaCloudTenant}
            placeholder="your-tenant-id-here"
            required={true}
          />
        </div>

        <div className="flex flex-col w-60">
          <Label className="block mb-3">Database Name</Label>
          <Input
            name="ChromaCloudDatabase"
            autoComplete="off"
            type="text"
            defaultValue={settings?.ChromaCloudDatabase}
            placeholder="your-database-name"
            required={true}
          />
        </div>
      </div>
    </div>
  );
}

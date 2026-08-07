import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
export default function MilvusDBOptions({ settings }) {
  return (
    <div className="w-full flex flex-col gap-y-7">
      <div className="w-full flex items-center gap-[36px] mt-1.5">
        <div className="flex flex-col w-60">
          <Label variant="settings" className="block mb-3">
            Milvus DB Address
          </Label>
          <Input
            variant="settings"
            type="text"
            name="MilvusAddress"
            placeholder="http://localhost:19530"
            defaultValue={settings?.MilvusAddress}
            required={true}
            autoComplete="off"
            spellCheck={false}
          />
        </div>

        <div className="flex flex-col w-60">
          <Label variant="settings" className="block mb-3">
            Milvus Username
          </Label>
          <Input
            variant="settings"
            type="text"
            name="MilvusUsername"
            placeholder="username"
            defaultValue={settings?.MilvusUsername}
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        <div className="flex flex-col w-60">
          <Label variant="settings" className="block mb-3">
            Milvus Password
          </Label>
          <Input
            variant="settings"
            type="password"
            name="MilvusPassword"
            placeholder="password"
            defaultValue={settings?.MilvusPassword ? "*".repeat(20) : ""}
            autoComplete="off"
            spellCheck={false}
          />
        </div>
      </div>
    </div>
  );
}

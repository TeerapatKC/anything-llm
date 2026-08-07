import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
export default function AstraDBOptions({ settings }) {
  return (
    <div className="w-full flex flex-col gap-y-7">
      <div className="w-full flex items-center gap-[36px] mt-1.5">
        <div className="flex flex-col w-60">
          <Label variant="settings" className="block mb-3">
            Astra DB Endpoint
          </Label>
          <Input
            variant="settings"
            type="url"
            name="AstraDBEndpoint"
            placeholder="Astra DB API endpoint"
            defaultValue={settings?.AstraDBEndpoint}
            required={true}
            autoComplete="off"
            spellCheck={false}
          />
        </div>

        <div className="flex flex-col w-60">
          <Label variant="settings" className="block mb-3">
            Astra DB Application Token
          </Label>
          <Input
            variant="settings"
            type="password"
            name="AstraDBApplicationToken"
            placeholder="AstraCS:..."
            defaultValue={
              settings?.AstraDBApplicationToken ? "*".repeat(20) : ""
            }
            required={true}
            autoComplete="off"
            spellCheck={false}
          />
        </div>
      </div>
    </div>
  );
}

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
export default function PineconeDBOptions({ settings }) {
  return (
    <div className="w-full flex flex-col gap-y-7">
      <div className="w-full flex items-center gap-[36px] mt-1.5">
        <div className="flex flex-col w-60">
          <Label className="block mb-3">Pinecone DB API Key</Label>
          <Input
            type="password"
            name="PineConeKey"
            placeholder="Pinecone API Key"
            defaultValue={settings?.PineConeKey ? "*".repeat(20) : ""}
            required={true}
            autoComplete="new-password"
            spellCheck={false}
          />
        </div>
        <div className="flex flex-col w-60">
          <Label className="block mb-3">Pinecone Index Name</Label>
          <Input
            type="text"
            name="PineConeIndex"
            placeholder="my-index"
            defaultValue={settings?.PineConeIndex}
            required={true}
            autoComplete="off"
            spellCheck={false}
          />
        </div>
      </div>
    </div>
  );
}

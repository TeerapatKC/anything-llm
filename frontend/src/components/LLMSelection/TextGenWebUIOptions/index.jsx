import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
export default function TextGenWebUIOptions({ settings }) {
  return (
    <div className="flex gap-[36px] mt-1.5 flex-wrap">
      <div className="flex flex-col w-60">
        <Label className="block mb-3">Base URL</Label>
        <Input
          type="url"
          name="TextGenWebUIBasePath"
          placeholder="http://127.0.0.1:5000/v1"
          defaultValue={settings?.TextGenWebUIBasePath}
          required={true}
          autoComplete="off"
          spellCheck={false}
        />
      </div>
      <div className="flex flex-col w-60">
        <Label className="block mb-3">Model context window</Label>
        <Input
          type="number"
          name="TextGenWebUITokenLimit"
          placeholder="Content window limit (eg: 4096)"
          min={1}
          onScroll={(e) => e.target.blur()}
          defaultValue={settings?.TextGenWebUITokenLimit}
          required={true}
          autoComplete="off"
        />
      </div>
      <div className="flex flex-col w-60">
        <Label className="block mb-3">API Key (Optional)</Label>
        <Input
          type="password"
          name="TextGenWebUIAPIKey"
          placeholder="TextGen Web UI API Key"
          defaultValue={settings?.TextGenWebUIAPIKey ? "*".repeat(20) : ""}
          autoComplete="new-password"
          spellCheck={false}
        />
      </div>
    </div>
  );
}

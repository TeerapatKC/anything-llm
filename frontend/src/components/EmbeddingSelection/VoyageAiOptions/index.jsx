import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
export default function VoyageAiOptions({ settings }) {
  return (
    <div className="w-full flex flex-col gap-y-4">
      <div className="w-full flex items-center gap-[36px] mt-1.5">
        <div className="flex flex-col w-60">
          <Label className="block mb-3">API Key</Label>
          <Input
            type="password"
            name="VoyageAiApiKey"
            placeholder="Voyage AI API Key"
            defaultValue={settings?.VoyageAiApiKey ? "*".repeat(20) : ""}
            required={true}
            autoComplete="new-password"
            spellCheck={false}
          />
        </div>
        <div className="flex flex-col w-60">
          <Label className="block mb-3">Model Preference</Label>
          <Select
            name="EmbeddingModelPref"
            required={true}
            defaultValue={settings?.EmbeddingModelPref}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select an option" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Available embedding models</SelectLabel>
                {[
                  "voyage-large-2-instruct",
                  "voyage-finance-2",
                  "voyage-multilingual-2",
                  "voyage-law-2",
                  "voyage-code-2",
                  "voyage-large-2",
                  "voyage-2",
                  "voyage-3",
                  "voyage-3-lite",
                  "voyage-3-large",
                  "voyage-code-3",
                ].map((model) => {
                  return (
                    <SelectItem key={model} value={model}>
                      {model}
                    </SelectItem>
                  );
                })}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

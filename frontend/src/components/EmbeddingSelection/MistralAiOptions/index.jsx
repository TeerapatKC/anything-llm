import { useTranslation } from "react-i18next";
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
export default function MistralAiOptions({ settings }) {
  const { t } = useTranslation();
  return (
    <div className="w-full flex flex-col gap-y-4">
      <div className="w-full flex items-center gap-[36px] mt-1.5">
        <div className="flex flex-col w-60">
          <Label className="block mb-3">{t("provider-options.api-key")}</Label>
          <Input
            type="password"
            name="MistralApiKey"
            placeholder="Mistral AI API Key"
            defaultValue={settings?.MistralApiKey ? "*".repeat(20) : ""}
            required={true}
            autoComplete="new-password"
            spellCheck={false}
          />
        </div>
        <div className="flex flex-col w-60">
          <Label className="block mb-3">
            {t("provider-options.model-preference")}
          </Label>
          <Select
            name="EmbeddingModelPref"
            required={true}
            defaultValue={settings?.EmbeddingModelPref}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t("provider-options.select-option")} />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>
                  {t("provider-options.available-embedding-models")}
                </SelectLabel>
                {["mistral-embed"].map((model) => {
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

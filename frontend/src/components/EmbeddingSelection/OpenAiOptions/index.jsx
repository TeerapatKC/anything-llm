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

const EMBEDDING_MODELS = [
  "text-embedding-ada-002",
  "text-embedding-3-small",
  "text-embedding-3-large",
];

export default function OpenAiOptions({ settings }) {
  const { t } = useTranslation();
  return (
    <div className="w-full flex flex-col gap-y-4">
      <div className="w-full flex items-center gap-[36px] mt-1.5">
        <div className="flex flex-col w-60">
          <Label className="block mb-3">{t("provider-options.api-key")}</Label>
          <Input
            type="password"
            name="OpenAiKey"
            placeholder="OpenAI API Key"
            defaultValue={settings?.OpenAiKey ? "*".repeat(20) : ""}
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
            defaultValue={settings?.EmbeddingModelPref ?? undefined}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t("provider-options.select-model")} />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>
                  {t("provider-options.available-embedding-models")}
                </SelectLabel>
                {EMBEDDING_MODELS.map((model) => (
                  <SelectItem key={model} value={model}>
                    {model}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

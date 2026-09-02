import { useTranslation } from "react-i18next";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
export default function WeaviateDBOptions({ settings }) {
  const { t } = useTranslation();
  return (
    <div className="w-full flex flex-col gap-y-7">
      <div className="w-full flex items-center gap-[36px] mt-1.5">
        <div className="flex flex-col w-60">
          <Label className="block mb-3">Weaviate Endpoint</Label>
          <Input
            type="url"
            name="WeaviateEndpoint"
            placeholder="http://localhost:8080"
            defaultValue={settings?.WeaviateEndpoint}
            required={true}
            autoComplete="off"
            spellCheck={false}
          />
        </div>

        <div className="flex flex-col w-60">
          <Label className="block mb-3">{t("provider-options.api-key")}</Label>
          <Input
            type="password"
            name="WeaviateApiKey"
            placeholder="sk-123Abcweaviate"
            defaultValue={settings?.WeaviateApiKey ? "*".repeat(20) : ""}
            autoComplete="new-password"
            spellCheck={false}
          />
        </div>
      </div>
    </div>
  );
}

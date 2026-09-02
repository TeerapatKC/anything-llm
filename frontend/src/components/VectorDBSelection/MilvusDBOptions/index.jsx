import { Label } from "@/components/ui/label";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
export default function MilvusDBOptions({ settings }) {
  const { t } = useTranslation();
  return (
    <div className="w-full flex flex-col gap-y-7">
      <div className="w-full flex items-center gap-[36px] mt-1.5">
        <div className="flex flex-col w-60">
          <Label className="block mb-3">
            {t("vector-providers.milvus.address")}
          </Label>
          <Input
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
          <Label className="block mb-3">
            {t("vector-providers.milvus.username")}
          </Label>
          <Input
            type="text"
            name="MilvusUsername"
            placeholder="username"
            defaultValue={settings?.MilvusUsername}
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        <div className="flex flex-col w-60">
          <Label className="block mb-3">
            {t("vector-providers.milvus.password")}
          </Label>
          <Input
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

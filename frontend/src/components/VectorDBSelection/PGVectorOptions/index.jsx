import { Info } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export default function PGVectorOptions({ settings }) {
  const { t } = useTranslation();
  return (
    <div className="w-full flex flex-col gap-y-7">
      <div className="w-full flex items-center gap-[36px] mt-1.5">
        <div className="flex flex-col w-96">
          <div className="flex items-center gap-x-1 mb-3">
            <Label className="block">
              {t("vector-providers.pgvector.connection-string")}
            </Label>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Info
                    size={16}
                    className="text-theme-text-secondary cursor-pointer"
                  />
                }
              ></TooltipTrigger>
              <TooltipContent side="right" className="max-w-[250px] text-xs">
                <p className="text-md whitespace-pre-line wrap-break-word">
                  {t("vector-providers.pgvector.connection-string-tooltip")}{" "}
                  <br />
                  <code>postgresql://username:password@host:port/database</code>
                  <br />
                  <br />
                  {t("vector-providers.pgvector.permissions-intro")}
                  <ul className="list-disc list-inside">
                    <li>{t("vector-providers.pgvector.permission-read")}</li>
                    <li>
                      {t("vector-providers.pgvector.permission-read-schema")}
                    </li>
                    <li>{t("vector-providers.pgvector.permission-create")}</li>
                  </ul>
                  <br />
                  <b>{t("vector-providers.pgvector.extension-warning")}</b>
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          <Input
            type="text"
            name="PGVectorConnectionString"
            placeholder="postgresql://username:password@host:port/database"
            defaultValue={
              settings?.PGVectorConnectionString ? "*".repeat(20) : ""
            }
            required={true}
            autoComplete="off"
            spellCheck={false}
          />
        </div>

        <div className="flex flex-col w-60">
          <div className="flex items-center gap-x-1 mb-3">
            <Label className="block">
              {t("vector-providers.pgvector.table-name")}
            </Label>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Info
                    size={16}
                    className="text-theme-text-secondary cursor-pointer"
                  />
                }
              ></TooltipTrigger>
              <TooltipContent side="right" className="max-w-[250px] text-xs">
                <p className="text-md whitespace-pre-line wrap-break-word">
                  {t("vector-providers.pgvector.table-name-tooltip")}
                  <br />
                  <br />
                  {t("vector-providers.pgvector.table-name-default")}{" "}
                  <code>anythingllm_vectors</code>.
                  <br />
                  <br />
                  <b>{t("vector-providers.pgvector.table-name-warning")}</b>
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          <Input
            type="text"
            name="PGVectorTableName"
            autoComplete="off"
            defaultValue={settings?.PGVectorTableName}
            placeholder="vector_table"
          />
        </div>
      </div>
    </div>
  );
}

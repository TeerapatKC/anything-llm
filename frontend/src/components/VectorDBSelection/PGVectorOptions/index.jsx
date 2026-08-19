import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export default function PGVectorOptions({ settings }) {
  return (
    <div className="w-full flex flex-col gap-y-7">
      <div className="w-full flex items-center gap-[36px] mt-1.5">
        <div className="flex flex-col w-96">
          <div className="flex items-center gap-x-1 mb-3">
            <Label className="block">Postgres Connection String</Label>
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
                  This is the connection string for the Postgres database in the
                  format of <br />
                  <code>postgresql://username:password@host:port/database</code>
                  <br />
                  <br />
                  The user for the database must have the following permissions:
                  <ul className="list-disc list-inside">
                    <li>Read access to the database</li>
                    <li>Read access to the database schema</li>
                    <li>Create access to the database</li>
                  </ul>
                  <br />
                  <b>
                    You must have the pgvector extension installed on the
                    database.
                  </b>
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
            <Label className="block">Vector Table Name</Label>
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
                  This is the name of the table in the Postgres database that
                  will store the vectors.
                  <br />
                  <br />
                  By default, the table name is <code>anythingllm_vectors</code>
                  .
                  <br />
                  <br />
                  <b>
                    This table must not already exist on the database - it will
                    be created automatically.
                  </b>
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

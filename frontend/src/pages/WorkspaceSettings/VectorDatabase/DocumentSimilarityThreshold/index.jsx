import { useTranslation } from "react-i18next";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function DocumentSimilarityThreshold({
  workspace,
  setHasChanges,
}) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col">
      <div className="flex flex-col gap-y-[8px]">
        <label htmlFor="name" className="block input-label">
          {t("vector-workspace.doc.title")}
        </label>
        <p className="text-theme-text-primary text-opacity-60 text-xs font-medium">
          {t("vector-workspace.doc.description")}
        </p>
      </div>
      {/* Radix only deals in string values, where a native select coerced the
          numbers itself — `value={0.25}` submitted "0.25". */}
      <Select
        name="similarityThreshold"
        defaultValue={String(workspace?.similarityThreshold ?? 0.25)}
        onValueChange={() => setHasChanges(true)}
        required={true}
      >
        <SelectTrigger className="mt-2">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="0">{t("vector-workspace.doc.zero")}</SelectItem>
          <SelectItem value="0.25">{t("vector-workspace.doc.low")}</SelectItem>
          <SelectItem value="0.5">
            {t("vector-workspace.doc.medium")}
          </SelectItem>
          <SelectItem value="0.75">{t("vector-workspace.doc.high")}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

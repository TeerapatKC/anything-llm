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
  const options = [
    { value: "0", label: t("vector-workspace.doc.zero") },
    { value: "0.25", label: t("vector-workspace.doc.low") },
    { value: "0.5", label: t("vector-workspace.doc.medium") },
    { value: "0.75", label: t("vector-workspace.doc.high") },
  ];
  return (
    <div className="flex flex-col">
      <div className="flex flex-col gap-y-[8px]">
        <label htmlFor="name" className="block input-label">
          {t("vector-workspace.doc.title")}
        </label>
        <p className="text-theme-text-primary/60 text-xs font-medium">
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
          <SelectValue>
            {(value) =>
              options.find((option) => option.value === value)?.label ?? value
            }
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

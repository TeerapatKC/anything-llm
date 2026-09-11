import { useState } from "react";
import { ChevronDown, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const DEFAULT_FORMATS = [
  { key: "csv", label: "CSV" },
  { key: "json", label: "JSON" },
];

/**
 * Date-range + format picker shared by every log export action (Event Logs,
 * Workspace Chat Logs, Scheduled Job Logs) so all three look and behave the
 * same. Leaving both dates blank exports the full log (no date filter).
 * @param {(format: string, startDate: string|null, endDate: string|null) => void} onExport
 * @param {{key: string, label: string}[]} [formats] - defaults to CSV/JSON
 */
export default function ExportLogsControl({
  onExport,
  disabled = false,
  labels,
  formats = DEFAULT_FORMATS,
}) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-theme-text-secondary text-sm">{labels.from}</span>
      <Input
        type="date"
        value={startDate}
        max={endDate || undefined}
        onChange={(e) => setStartDate(e.target.value)}
        aria-label={labels.from}
        className="w-auto"
      />
      <span className="text-theme-text-secondary text-sm">{labels.to}</span>
      <Input
        type="date"
        value={endDate}
        min={startDate || undefined}
        onChange={(e) => setEndDate(e.target.value)}
        aria-label={labels.to}
        className="w-auto"
      />
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              size="lg"
              variant="outline"
              disabled={disabled}
            />
          }
        >
          <Download />
          {labels.export}
          <ChevronDown className="transition-transform group-aria-expanded/button:rotate-180" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-32">
          {formats.map(({ key, label }) => (
            <DropdownMenuItem
              key={key}
              onClick={() => onExport(key, startDate || null, endDate || null)}
            >
              {label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

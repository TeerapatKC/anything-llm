import { ChevronDown, ChevronUp } from "lucide-react";
import { useEffect, useState } from "react";
import { safeJsonParse } from "@/utils/request";
import { TableCell, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";

export default function LogRow({ log }) {
  const [expanded, setExpanded] = useState(false);
  const [metadata, setMetadata] = useState(null);
  const [hasMetadata, setHasMetadata] = useState(false);

  useEffect(() => {
    function parseAndSetMetadata() {
      const data = safeJsonParse(log.metadata, {});
      setHasMetadata(Object.keys(data)?.length > 0);
      setMetadata(data);
    }
    parseAndSetMetadata();
  }, [log.metadata]);

  const handleRowClick = () => {
    if (hasMetadata) {
      setExpanded(!expanded);
    }
  };

  return (
    <>
      <TableRow
        onClick={handleRowClick}
        className={hasMetadata ? "cursor-pointer" : ""}
      >
        <EventBadge event={log.event} />
        <TableCell className="font-medium text-theme-text-primary">
          {log.user?.username || "--"}
        </TableCell>
        <TableCell className="text-theme-text-secondary">
          {log.occurredAt}
        </TableCell>
        <TableCell className="text-right">
          {hasMetadata && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="gap-1 text-xs text-theme-text-secondary hover:text-theme-text-primary"
              onClick={(e) => {
                e.stopPropagation();
                setExpanded(!expanded);
              }}
            >
              {expanded ? (
                <>
                  <ChevronUp className="h-4 w-4" />
                  <span>hide</span>
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4" />
                  <span>show</span>
                </>
              )}
            </Button>
          )}
        </TableCell>
      </TableRow>
      <EventMetadata metadata={metadata} expanded={expanded} />
    </>
  );
}

const EventMetadata = ({ metadata, expanded = false }) => {
  if (!metadata || !expanded) return null;
  return (
    <TableRow className="bg-theme-bg-secondary/40 hover:bg-theme-bg-secondary/40">
      <TableCell colSpan={4} className="p-4">
        <div className="flex flex-col gap-y-2 rounded-lg border border-theme-sidebar-border bg-theme-bg-secondary p-3 shadow-xs">
          <p className="text-xs font-semibold text-theme-text-secondary uppercase tracking-wider">
            Event Metadata
          </p>
          <pre className="overflow-x-auto font-mono text-xs text-theme-text-primary leading-relaxed whitespace-pre-wrap break-all">
            {JSON.stringify(metadata, null, 2)}
          </pre>
        </div>
      </TableCell>
    </TableRow>
  );
};

const EventBadge = ({ event }) => {
  let colorTheme = "bg-sky-500/15 text-sky-700 dark:text-sky-300";
  if (event.includes("update")) {
    colorTheme = "bg-amber-500/15 text-amber-700 dark:text-amber-300";
  } else if (event.includes("failed_") || event.includes("deleted")) {
    colorTheme = "bg-red-500/15 text-red-700 dark:text-red-300";
  } else if (event === "login_event") {
    colorTheme = "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300";
  }

  return (
    <TableCell className="font-medium">
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${colorTheme}`}
      >
        {event}
      </span>
    </TableCell>
  );
};

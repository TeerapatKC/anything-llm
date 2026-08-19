import { ChevronDown, ChevronUp } from "lucide-react";
import { useEffect, useState } from "react";
import { safeJsonParse } from "@/utils/request";
import { TableCell, TableRow } from "@/components/ui/table";

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
    if (log.metadata !== "{}") {
      setExpanded(!expanded);
    }
  };

  return (
    <>
      <TableRow
        onClick={handleRowClick}
        className={`${hasMetadata ? "cursor-pointer hover:bg-white/5" : ""}`}
      >
        <EventBadge event={log.event} />
        <TableCell className="border-transparent transform transition-transform duration-200">
          {log.user.username}
        </TableCell>
        <TableCell className="border-transparent transform transition-transform duration-200">
          {log.occurredAt}
        </TableCell>
        {hasMetadata && (
          <div className="mt-1">
            {expanded ? (
              <TableCell
                className={`px-2 gap-x-1 flex items-center justify-center transform transition-transform duration-200`}
              >
                <ChevronUp size={20} />
                <p className="text-xs text-white/50 w-[20px]">hide</p>
              </TableCell>
            ) : (
              <TableCell
                className={`px-2 gap-x-1 flex items-center justify-center transform transition-transform duration-200`}
              >
                <ChevronDown size={20} />
                <p className="text-xs text-white/50 w-[20px]">show</p>
              </TableCell>
            )}
          </div>
        )}
      </TableRow>
      <EventMetadata metadata={metadata} expanded={expanded} />
    </>
  );
}

const EventMetadata = ({ metadata, expanded = false }) => {
  if (!metadata || !expanded) return null;
  return (
    <TableRow className="bg-theme-bg-primary">
      <TableCell colSpan="2" className="font-medium rounded-l-2xl">
        Event Metadata
      </TableCell>
      <TableCell colSpan="4" className="rounded-r-2xl">
        <div className="w-full rounded-lg bg-theme-bg-secondary/10 p-2 text-theme-text-primary shadow-xs border-theme-sidebar-border border">
          <pre className="overflow-scroll">
            {JSON.stringify(metadata, null, 2)}
          </pre>
        </div>
      </TableCell>
    </TableRow>
  );
};

const EventBadge = ({ event }) => {
  let colorTheme = {
    bg: "bg-sky-600/20",
    text: "text-sky-400 light:text-sky-800",
  };
  if (event.includes("update"))
    colorTheme = {
      bg: "bg-yellow-600/20",
      text: "text-yellow-400 light:text-yellow-800",
    };
  if (event.includes("failed_") || event.includes("deleted"))
    colorTheme = {
      bg: "bg-red-600/20",
      text: "text-red-400 light:text-red-800",
    };
  if (event === "login_event")
    colorTheme = {
      bg: "bg-green-600/20",
      text: "text-green-400 light:text-green-800",
    };

  return (
    <TableCell className="font-medium flex items-center">
      <span
        className={`rounded-full ${colorTheme.bg} px-2 py-0.5 text-xs font-medium ${colorTheme.text} shadow-xs`}
      >
        {event}
      </span>
    </TableCell>
  );
};

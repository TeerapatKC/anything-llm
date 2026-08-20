import React, { memo, useMemo } from "react";
import {
  formatDateTimeAsMoment,
  getFileExtension,
  middleTruncate,
} from "@/utils/directories";
import { FileText } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";

function FileRow({ item, selected, folderName, toggleSelection }) {
  const tooltipContent = useMemo(
    () =>
      JSON.stringify({
        title: item.title,
        date: formatDateTimeAsMoment(item?.published),
        extension: getFileExtension(item.url),
      }),
    [item.title, item.published, item.url]
  );

  return (
    // A fixed `grid-cols-12` split (name=10, badge=2) let the "Cached" pill's own
    // natural width exceed its 2-column track at narrower panel widths - it's
    // right-aligned inside that track, so the overflow pushed left into the name
    // column and sat on top of the (also truncated) filename. Flex instead: the
    // name area takes whatever is actually left after the badge reserves its own
    // content width, so the two can never overlap regardless of panel width.
    <TableRow
      onClick={() => toggleSelection(item, folderName)}
      className={`flex items-center gap-x-2 py-2 pl-8 pr-8 hover:bg-theme-file-picker-hover cursor-pointer file-row ${
        selected ? "selected light:text-white" : ""
      }`}
    >
      <Tooltip>
        <TooltipTrigger
          render={
            <div className="min-w-0 flex-1 flex gap-x-2 items-center relative" />
          }
        >
          <Checkbox
            checked={selected}
            className="shrink-0 h-3.5 w-3.5 border-white/60 data-[state=checked]:border-white"
            tabIndex={-1}
          />
          <FileText className="shrink-0 h-3.5 w-3.5 mr-[3px]" />
          <p className="min-w-0 flex-1 whitespace-nowrap overflow-hidden text-ellipsis">
            {middleTruncate(item.title, 55)}
          </p>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[250px] text-xs">
          {tooltipContent}
        </TooltipContent>
      </Tooltip>
      <div className="shrink-0 flex items-center">
        {item?.cached && (
          <div className="bg-theme-settings-input-active rounded-3xl">
            <p className="text-xs px-2 py-0.5">Cached</p>
          </div>
        )}
      </div>
    </TableRow>
  );
}

export default memo(FileRow, (prev, next) => {
  return prev.item.id === next.item.id && prev.selected === next.selected;
});

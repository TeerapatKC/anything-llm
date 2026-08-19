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
    <TableRow
      onClick={() => toggleSelection(item, folderName)}
      className={`grid grid-cols-12 py-2 pl-8 pr-8 hover:bg-theme-file-picker-hover cursor-pointer file-row ${
        selected ? "selected light:text-white" : ""
      }`}
    >
      <Tooltip>
        <TooltipTrigger
          render={
            <div className="col-span-10 w-fit flex gap-x-2 items-center relative" />
          }
        >
          <Checkbox
            checked={selected}
            className="shrink-0 h-3.5 w-3.5 border-white/60 data-[state=checked]:border-white"
            tabIndex={-1}
          />
          <FileText className="shrink-0 h-3.5 w-3.5 mr-[3px]" />
          <p className="whitespace-nowrap overflow-hidden text-ellipsis max-w-[400px]">
            {middleTruncate(item.title, 55)}
          </p>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[250px] text-xs">
          {tooltipContent}
        </TooltipContent>
      </Tooltip>
      <div className="col-span-2 flex justify-end items-center">
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

import React, { memo, useMemo } from "react";
import {
  formatDateTimeAsMoment,
  getFileExtension,
  middleTruncate,
} from "@/utils/directories";
import { File } from "@phosphor-icons/react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { TableRow } from "@/components/ui/table";

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
      variant="none"
      onClick={() => toggleSelection(item, folderName)}
      className={`text-theme-text-primary text-xs grid grid-cols-12 py-2 pl-8 pr-8 hover:bg-theme-file-picker-hover cursor-pointer file-row ${
        selected ? "selected light:text-white" : ""
      }`}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="col-span-10 w-fit flex gap-x-[4px] items-center relative">
            <div
              className={`shrink-0 w-3 h-3 rounded border-[1px] border-solid border-white ${
                selected ? "text-white" : "text-theme-text-primary light:invert"
              } flex justify-center items-center cursor-pointer`}
              role="checkbox"
              aria-checked={selected}
              tabIndex={0}
            >
              {selected && <div className="w-2 h-2 bg-white rounded-[2px]" />}
            </div>
            <File
              className="shrink-0 text-base font-bold w-4 h-4 mr-[3px]"
              weight="fill"
            />
            <p className="whitespace-nowrap overflow-hidden text-ellipsis max-w-[400px]">
              {middleTruncate(item.title, 55)}
            </p>
          </div>
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

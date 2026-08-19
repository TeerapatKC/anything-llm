import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
export function DefaultBadge({ title: _title }) {
  return (
    <>
      <Tooltip>
        <TooltipTrigger render={<span className="w-fit" />}>
          <div className="flex items-center gap-x-1 w-fit rounded-full bg-[#F4FFD0]/10 light:bg-blue-100 px-2.5 py-0.5 text-sm font-medium text-sky-400 light:text-theme-text-secondary shadow-xs cursor-pointer">
            <div className="text-[#F4FFD0] light:text-blue-600 text-[12px] leading-[15px]">
              Default
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[250px] text-xs">
          This skill is enabled by default and cannot be turned off.
        </TooltipContent>
      </Tooltip>
    </>
  );
}

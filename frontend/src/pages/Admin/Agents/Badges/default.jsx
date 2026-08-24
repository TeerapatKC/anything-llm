import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
export function DefaultBadge({ title: _title }) {
  return (
    <Tooltip>
      <TooltipTrigger render={<span className="w-fit" />}>
        <Badge
          variant="secondary"
          className="cursor-pointer bg-[#F4FFD0]/10 text-[#F4FFD0] light:bg-blue-100 light:text-blue-600"
        >
          Default
        </Badge>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-[250px] text-xs">
        This skill is enabled by default and cannot be turned off.
      </TooltipContent>
    </Tooltip>
  );
}

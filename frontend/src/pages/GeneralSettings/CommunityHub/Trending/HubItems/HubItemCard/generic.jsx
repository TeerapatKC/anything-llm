import paths from "@/utils/paths";
import { Eye, Lock } from "lucide-react";
import { Link } from "react-router-dom";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function GenericHubCard({ item }) {
  return (
    <div
      key={item.id}
      className="bg-zinc-800 light:bg-slate-100 rounded-lg p-3 hover:bg-zinc-700 light:hover:bg-slate-200 transition-all duration-200"
    >
      <p className="text-theme-text-primary text-sm font-medium">{item.name}</p>
      <p className="text-theme-text-secondary text-xs mt-1">
        {item.description}
      </p>
      <div className="flex justify-end mt-2">
        <Link
          className="text-primary-button hover:text-primary-button/80 text-xs"
          to={paths.communityHub.importItem(item.importId)}
        >
          Import →
        </Link>
      </div>
    </div>
  );
}

export function VisibilityIcon({ visibility = "public" }) {
  const Icon = visibility === "private" ? Lock : Eye;

  return (
    <>
      <Tooltip>
        <TooltipTrigger render={<div />}>
          <Icon className="w-4 h-4 text-theme-text-secondary" />
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className="max-w-[250px] text-xs"
        >{`This item is ${visibility === "private" ? "private" : "public"}`}</TooltipContent>
      </Tooltip>
    </>
  );
}

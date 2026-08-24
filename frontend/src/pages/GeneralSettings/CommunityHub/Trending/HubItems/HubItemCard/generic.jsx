import paths from "@/utils/paths";
import { Eye, Lock } from "lucide-react";
import { Link } from "react-router-dom";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * Shared shell for every hub item card so the surface, spacing and footer stay
 * identical across the item types. Elevation is the `Card` ring — these sit in
 * the page grid, so they never get a drop shadow.
 * @param {{item: object, children?: React.ReactNode}} props
 */
export function HubItemCardShell({ item, children }) {
  return (
    <Link
      to={paths.communityHub.importItem(item.importId)}
      className="group/hub-card flex h-full rounded-xl"
    >
      <Card
        size="sm"
        className="flex-1 gap-0 transition-colors hover:bg-muted/50"
      >
        <CardHeader>
          <CardTitle>{item.name}</CardTitle>
          <CardAction>
            <VisibilityIcon visibility={item.visibility} />
          </CardAction>
          <CardDescription className="text-xs">
            {item.description}
          </CardDescription>
        </CardHeader>
        {children ? (
          <CardContent className="mt-3 flex flex-1 flex-col gap-2">
            {children}
          </CardContent>
        ) : (
          <div className="flex-1" />
        )}
        <CardContent className="mt-3 flex justify-end">
          <span className="text-sm font-medium text-primary-button transition-colors group-hover/hub-card:text-primary-button/80">
            Import →
          </span>
        </CardContent>
      </Card>
    </Link>
  );
}

/** Monospaced value block used for commands, prompts and step lists. */
export function HubItemDetail({ label, children }) {
  return (
    <>
      <p className="text-xs font-semibold text-muted-foreground">{label}</p>
      <div className="rounded-md bg-muted px-2 py-1 font-mono text-xs text-muted-foreground ring-1 ring-foreground/10">
        {children}
      </div>
    </>
  );
}

export default function GenericHubCard({ item }) {
  return <HubItemCardShell item={item} />;
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

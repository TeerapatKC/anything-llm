import { Children } from "react";
import { useTranslation } from "react-i18next";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * The row-actions menu shadcn's data tables use: one `⋯` button per row that
 * opens the row's actions, instead of a run of inline buttons that widens the
 * table and competes with the row's own content.
 *
 * Children are `DropdownMenuItem`s. They may be wrapped in the call site's own
 * permission checks — a row whose checks all fail renders nothing at all rather
 * than an empty menu.
 *
 * @param {{children: import("react").ReactNode, label?: string}} props
 */
export default function TableRowActions({ children, label }) {
  const { t } = useTranslation();
  const menuLabel = label ?? t("ui.open-actions");
  if (Children.toArray(children).length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon-sm" aria-label={menuLabel} />
        }
      >
        <MoreHorizontal />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

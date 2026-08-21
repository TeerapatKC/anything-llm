import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { SlidersHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useIsMobile } from "@/hooks/use-mobile";
import { MOBILE_TOPBAR_ACTIONS_ID } from "@/components/Sidebar/MobileTopbar";
import TextSizeRow from "./TextSize";
import MemoriesRow from "./Memories";
import CopyLinkToChatRow from "./CopyLinkToChat";
import ExportRow from "./Export";

export default function ChatSettingsMenu({
  history = [],
  workspace = null,
  threadSlug = null,
}) {
  const isMobile = useIsMobile();
  const [mobileSlot, setMobileSlot] = useState(null);

  useEffect(() => {
    if (!isMobile) {
      setMobileSlot(null);
      return;
    }
    setMobileSlot(document.getElementById(MOBILE_TOPBAR_ACTIONS_ID));
  }, [isMobile]);

  const menu = (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            className="group border-none cursor-pointer flex items-center justify-center w-[35px] h-[35px] rounded-full transition-all hover:bg-zinc-700 light:hover:bg-slate-200 data-[state=open]:bg-zinc-700 light:data-[state=open]:bg-slate-200"
          />
        }
      >
        <SlidersHorizontal
          size={18}
          className="text-zinc-300 light:text-slate-600 group-hover:text-white light:group-hover:text-slate-800 group-data-[state=open]:text-white light:group-data-[state=open]:text-slate-800"
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[226px]">
        <TextSizeRow />
        <MemoriesRow />
        <ExportRow
          history={history}
          workspace={workspace}
          threadSlug={threadSlug}
        />
        <CopyLinkToChatRow />
      </DropdownMenuContent>
    </DropdownMenu>
  );

  if (mobileSlot) return createPortal(menu, mobileSlot);
  return menu;
}

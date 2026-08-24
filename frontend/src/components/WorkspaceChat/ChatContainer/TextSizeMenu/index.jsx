import { useState, useMemo } from "react";
import { SlidersHorizontal } from "lucide-react";
import useUser from "@/hooks/useUser";
import { useTranslation } from "react-i18next";
import { isMobile } from "react-device-detect";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function getTextSizes(t) {
  return [
    { key: "small", label: t("chat_window.small"), textClass: "text-xs" },
    { key: "normal", label: t("chat_window.normal"), textClass: "text-sm" },
    { key: "large", label: t("chat_window.large"), textClass: "text-base" },
  ];
}

export default function TextSizeMenu() {
  const { t } = useTranslation();
  const TEXT_SIZES = useMemo(() => getTextSizes(t), [t]);
  const { user } = useUser();
  const [selectedSize, setSelectedSize] = useState(
    window.localStorage.getItem("anythingllm_text_size") || "normal"
  );

  function handleTextSizeChange(size) {
    setSelectedSize(size);
    window.localStorage.setItem("anythingllm_text_size", size);
    window.dispatchEvent(new CustomEvent("textSizeChange", { detail: size }));
  }

  // The user icon is only rendered for a signed-in user.
  const hasUserIcon = !!user;

  if (isMobile) return null;
  return (
    <div
      className={`absolute top-3 md:top-5 z-30 ${hasUserIcon ? "right-[55px] md:right-[67px]" : "right-4 md:right-6"}`}
    >
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              className="size-[35px] rounded-full"
              aria-label={t("chat_window.text_size_label")}
            />
          }
        >
          <SlidersHorizontal />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[200px]">
          <DropdownMenuLabel>
            {t("chat_window.text_size_label")}
          </DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={selectedSize}
            onValueChange={handleTextSizeChange}
          >
            {TEXT_SIZES.map(({ key, label, textClass }) => (
              <DropdownMenuRadioItem key={key} value={key}>
                <span className={textClass}>{label}</span>
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

import { useState, useRef } from "react";
import { Type } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTranslation } from "react-i18next";

export default function TextSizeButton() {
  const tooltipRef = useRef(null);
  const { t } = useTranslation();

  const toggleTooltip = () => {
    if (!tooltipRef.current) return;
    tooltipRef.current.isOpen
      ? tooltipRef.current.close()
      : tooltipRef.current.open();
  };

  return (
    <>
      <Tooltip>
        <TooltipTrigger
          render={
            <div
              id="text-size-btn"
              aria-label={t("chat_window.text_size")}
              onClick={toggleTooltip}
              className="border-none flex justify-center items-center opacity-60 hover:opacity-100 light:opacity-100 light:hover:opacity-60 cursor-pointer"
            />
          }
        >
          <Type
            color="var(--theme-sidebar-footer-icon-fill)"
            className="w-[20px] h-[20px] pointer-events-none text-theme-text-primary fill-current"
          />
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[250px] text-xs">
          <TextSizeMenu tooltipRef={tooltipRef} />
        </TooltipContent>
      </Tooltip>
    </>
  );
}

function TextSizeMenu({ tooltipRef }) {
  const { t } = useTranslation();
  const [selectedSize, setSelectedSize] = useState(
    window.localStorage.getItem("anythingllm_text_size") || "normal"
  );

  const handleTextSizeChange = (size) => {
    setSelectedSize(size);
    window.localStorage.setItem("anythingllm_text_size", size);
    window.dispatchEvent(new CustomEvent("textSizeChange", { detail: size }));
    tooltipRef.current?.close();
  };

  return (
    <div className="flex flex-col justify-start items-stretch gap-1 p-2">
      <button
        onClick={(e) => {
          e.preventDefault();
          handleTextSizeChange("small");
        }}
        className={`border-none w-full hover:cursor-pointer px-2 py-2 rounded-md flex items-center group ${
          selectedSize === "small"
            ? "bg-theme-action-menu-item-hover"
            : "hover:bg-theme-action-menu-item-hover"
        }`}
      >
        <div className="text-theme-text-primary text-xs">
          {t("chat_window.small")}
        </div>
      </button>

      <button
        onClick={(e) => {
          e.preventDefault();
          handleTextSizeChange("normal");
        }}
        className={`border-none w-full hover:cursor-pointer px-2 py-2 rounded-md flex items-center group ${
          selectedSize === "normal"
            ? "bg-theme-action-menu-item-hover"
            : "hover:bg-theme-action-menu-item-hover"
        }`}
      >
        <div className="text-theme-text-primary text-sm">
          {t("chat_window.normal")}
        </div>
      </button>

      <button
        onClick={(e) => {
          e.preventDefault();
          handleTextSizeChange("large");
        }}
        className={`border-none w-full hover:cursor-pointer px-2 py-2 rounded-md flex items-center group ${
          selectedSize === "large"
            ? "bg-theme-action-menu-item-hover"
            : "hover:bg-theme-action-menu-item-hover"
        }`}
      >
        <div className="text-theme-text-primary text-[16px]">
          {t("chat_window.large")}
        </div>
      </button>
    </div>
  );
}

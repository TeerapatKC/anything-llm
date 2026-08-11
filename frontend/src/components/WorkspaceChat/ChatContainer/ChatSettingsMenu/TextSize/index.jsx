import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";

function getTextSizes(t) {
  return [
    { key: "small", label: t("chat_window.small") },
    { key: "normal", label: t("chat_window.normal") },
    { key: "large", label: t("chat_window.large") },
  ];
}

export default function TextSizeRow() {
  const { t } = useTranslation();
  const [selectedSize, setSelectedSize] = useState(
    window.localStorage.getItem("anythingllm_text_size") || "normal"
  );

  function handleTextSizeChange(size) {
    setSelectedSize(size);
    window.localStorage.setItem("anythingllm_text_size", size);
    window.dispatchEvent(new CustomEvent("textSizeChange", { detail: size }));
  }

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        {t("chat_window.text_size_label")}
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent>
        <DropdownMenuRadioGroup
          value={selectedSize}
          onValueChange={handleTextSizeChange}
        >
          {getTextSizes(t).map(({ key, label }) => (
            <DropdownMenuRadioItem key={key} value={key}>
              {label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}

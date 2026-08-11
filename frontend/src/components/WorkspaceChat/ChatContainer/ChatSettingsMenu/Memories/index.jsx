import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import useUser from "@/hooks/useUser";
import System from "@/models/system";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { useMemoriesSidebar, useSourcesSidebar } from "../../ChatSidebar";

export default function MemoriesRow() {
  const { t } = useTranslation();
  const { user } = useUser();
  const { toggleSidebar } = useMemoriesSidebar();
  const { closeSidebar } = useSourcesSidebar();
  const [memoryEnabled, setMemoryEnabled] = useState(null);

  const isAdmin = !user || user?.role === "admin";

  useEffect(() => {
    System.keys().then((settings) => {
      setMemoryEnabled(!!settings?.MemoryEnabled);
    });
  }, []);

  function handleClick() {
    closeSidebar();
    toggleSidebar();
  }

  if (memoryEnabled === null) return null;
  if (!isAdmin && !memoryEnabled) return null;

  return (
    <DropdownMenuItem onSelect={handleClick}>
      {t("chat_window.memories.title")}
    </DropdownMenuItem>
  );
}

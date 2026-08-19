import { useEffect, useRef, useState } from "react";
import SettingsLayout from "@/components/layout/SettingsLayout";
import PageHeader from "@/components/layout/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import useQuery from "@/hooks/useQuery";
import ChatRow from "./ChatRow";
import showToast from "@/utils/toast";
import System from "@/models/system";
import { ChevronDown, Download, Trash2 } from "lucide-react";
import { saveAs } from "file-saver";
import { useTranslation } from "react-i18next";
import { CanViewChatHistory } from "@/components/CanViewChatHistory";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import ConfirmDialog from "@/components/ConfirmDialog";

const exportOptions = {
  csv: {
    name: "CSV",
    mimeType: "text/csv",
    fileExtension: "csv",
    filenameFunc: () => {
      return `anythingllm-chats-${new Date().toLocaleDateString()}`;
    },
  },
  json: {
    name: "JSON",
    mimeType: "application/json",
    fileExtension: "json",
    filenameFunc: () => {
      return `anythingllm-chats-${new Date().toLocaleDateString()}`;
    },
  },
  jsonl: {
    name: "JSONL",
    mimeType: "application/jsonl",
    fileExtension: "jsonl",
    filenameFunc: () => {
      return `anythingllm-chats-${new Date().toLocaleDateString()}-lines`;
    },
  },
  jsonAlpaca: {
    name: "JSON (Alpaca)",
    mimeType: "application/json",
    fileExtension: "json",
    filenameFunc: () => {
      return `anythingllm-chats-${new Date().toLocaleDateString()}-alpaca`;
    },
  },
};

export default function WorkspaceChats() {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef();
  const openMenuButton = useRef();
  const query = useQuery();
  const [loading, setLoading] = useState(true);
  const [chats, setChats] = useState([]);
  const [offset, setOffset] = useState(Number(query.get("offset") || 0));
  const [canNext, setCanNext] = useState(false);
  const { t } = useTranslation();
  const [confirm, setConfirm] = useState(null);

  const handleDumpChats = async (exportType) => {
    const chats = await System.exportChats(exportType, "workspace");
    if (!!chats) {
      const { name, mimeType, fileExtension, filenameFunc } =
        exportOptions[exportType];
      const blob = new Blob([chats], { type: mimeType });
      saveAs(blob, `${filenameFunc()}.${fileExtension}`);
      showToast(`Chats exported successfully as ${name}.`, "success");
    } else {
      showToast("Failed to export chats.", "error");
    }
  };

  const handleClearAllChats = async () => {
    setConfirm({
      title: "Clear all chats?",
      description: "This action is irreversible.",
      confirmText: "Clear all",
      variant: "destructive",
      onConfirm: async () => {
        await System.deleteChat(-1);
        setChats([]);
        showToast("Cleared all chats.", "success");
      },
    });
  };

  const toggleMenu = () => {
    setShowMenu(!showMenu);
  };

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target) &&
        !openMenuButton.current.contains(event.target)
      ) {
        setShowMenu(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    async function fetchChats() {
      const { chats: _chats = [], hasPages = false } =
        await System.chats(offset);
      setChats(_chats);
      setCanNext(hasPages);
      setLoading(false);
    }
    fetchChats();
  }, [offset]);

  return (
    <>
      <CanViewChatHistory>
        <SettingsLayout>
          <PageHeader
            title={t("recorded.title")}
            description={t("recorded.description")}
          />
          <div className="w-full justify-end flex gap-x-2 mt-4">
            <div className="relative">
              <button
                ref={openMenuButton}
                onClick={toggleMenu}
                className="flex items-center gap-x-2 px-4 py-1 rounded-lg bg-primary-button light:text-[#ffffff] hover:brightness-90 hover:text-white text-xs font-semibold shadow-[0_4px_14px_rgba(0,0,0,0.25)] h-[34px] w-fit transition-[filter]"
              >
                <Download size={18} />
                {t("recorded.export")}
                <ChevronDown size={18} />
              </button>
              <div
                ref={menuRef}
                className={`${
                  showMenu ? "slide-down" : "slide-up hidden"
                } z-20 w-fit rounded-lg absolute top-full right-0 bg-secondary light:bg-theme-bg-secondary mt-2 shadow-md`}
              >
                <div className="py-2">
                  {Object.entries(exportOptions).map(([key, data]) => (
                    <button
                      key={key}
                      onClick={() => {
                        handleDumpChats(key);
                        setShowMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 text-theme-text-primary text-sm hover:bg-[#3D4147] light:hover:bg-theme-sidebar-item-hover"
                    >
                      {data.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {chats.length > 0 && (
              <button
                onClick={handleClearAllChats}
                className="flex items-center gap-x-2 px-4 py-1 border light:border-theme-sidebar-border border-white/40 text-white/80 light:text-black/80 rounded-lg bg-transparent hover:light:text-red-500 hover:text-red-300 hover:bg-white hover:light:bg-red-50 hover:bg-opacity-10 text-xs font-semibold shadow-[0_4px_14px_rgba(0,0,0,0.25)] h-[34px] w-fit"
              >
                <Trash2 size={18} />
                Clear Chats
              </button>
            )}
          </div>
          <div className="overflow-x-auto">
            <ChatsContainer
              loading={loading}
              chats={chats}
              setChats={setChats}
              offset={offset}
              setOffset={setOffset}
              canNext={canNext}
              t={t}
            />
          </div>
        </SettingsLayout>
      </CanViewChatHistory>
      <ConfirmDialog config={confirm} onClose={() => setConfirm(null)} />
    </>
  );
}

function ChatsContainer({
  loading,
  chats,
  setChats,
  offset,
  setOffset,
  canNext,
  t,
}) {
  const handlePrevious = () => {
    setOffset(Math.max(offset - 1, 0));
  };
  const handleNext = () => {
    setOffset(offset + 1);
  };

  const handleDeleteChat = async (chatId) => {
    await System.deleteChat(chatId);
    setChats((prevChats) => prevChats.filter((chat) => chat.id !== chatId));
  };

  if (loading) {
    return (
      <Skeleton
        height="80vh"
        width="100%"
        highlightColor="var(--theme-bg-primary)"
        baseColor="var(--theme-bg-secondary)"
        count={1}
        className="w-full p-4 rounded-b-2xl rounded-tr-2xl rounded-tl-sm"
        containerClassName="flex w-full"
      />
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead scope="col" className="px-6 py-3 rounded-tl-lg">
              {t("recorded.table.id")}
            </TableHead>
            <TableHead scope="col" className="px-6 py-3">
              {t("recorded.table.by")}
            </TableHead>
            <TableHead scope="col" className="px-6 py-3">
              {t("recorded.table.workspace")}
            </TableHead>
            <TableHead scope="col" className="px-6 py-3">
              {t("recorded.table.prompt")}
            </TableHead>
            <TableHead scope="col" className="px-6 py-3">
              {t("recorded.table.response")}
            </TableHead>
            <TableHead scope="col" className="px-6 py-3">
              {t("recorded.table.at")}
            </TableHead>
            <TableHead scope="col" className="px-6 py-3 rounded-tr-lg">
              {" "}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {!!chats &&
            chats.map((chat) => (
              <ChatRow key={chat.id} chat={chat} onDelete={handleDeleteChat} />
            ))}
        </TableBody>
      </Table>
      <div className="flex w-full justify-between items-center mt-6">
        <button
          onClick={handlePrevious}
          className="px-4 py-2 rounded-lg border border-theme-text-secondary text-theme-text-secondary text-sm items-center flex gap-x-2 hover:bg-theme-text-secondary hover:text-theme-bg-secondary disabled:invisible"
          disabled={offset === 0}
        >
          {" "}
          Previous Page
        </button>
        <button
          onClick={handleNext}
          className="px-4 py-2 rounded-lg border border-slate-200 text-slate-200 light:text-theme-text-secondary light:border-theme-sidebar-border text-sm items-center flex gap-x-2 hover:bg-slate-200 hover:text-slate-800 disabled:invisible"
          disabled={!canNext}
        >
          Next Page
        </button>
      </div>
    </>
  );
}

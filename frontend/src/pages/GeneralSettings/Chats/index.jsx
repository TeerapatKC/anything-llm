import { useEffect, useState } from "react";
import SettingsLayout from "@/components/layout/SettingsLayout";
import PageHeader from "@/components/layout/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import useQuery from "@/hooks/useQuery";
import ChatRow from "./ChatRow";
import showToast from "@/utils/toast";
import System from "@/models/system";
import { ChevronDown, Download, ListFilter, Trash2 } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const FEEDBACK_FILTERS = ["all", "up", "down", "none"];

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
  const query = useQuery();
  const [loading, setLoading] = useState(true);
  const [chats, setChats] = useState([]);
  const [offset, setOffset] = useState(Number(query.get("offset") || 0));
  const [feedback, setFeedback] = useState("all");
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

  useEffect(() => {
    async function fetchChats() {
      const { chats: _chats = [], hasPages = false } = await System.chats(
        offset,
        feedback === "all" ? null : feedback
      );
      setChats(_chats);
      setCanNext(hasPages);
      setLoading(false);
    }
    fetchChats();
  }, [offset, feedback]);

  return (
    <>
      <CanViewChatHistory>
        <SettingsLayout>
          <PageHeader
            title={t("recorded.title")}
            description={t("recorded.description")}
          />
          <div className="mt-3 mb-4 flex w-full flex-wrap justify-end gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger
                render={<Button type="button" size="lg" variant="outline" />}
              >
                <ListFilter />
                {t(`recorded.feedback.filter_${feedback}`)}
                <ChevronDown className="transition-transform group-aria-expanded/button:rotate-180" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-40">
                {FEEDBACK_FILTERS.map((value) => (
                  <DropdownMenuItem
                    key={value}
                    onClick={() => {
                      // A filtered result set is shorter, so the page the reader
                      // was on may not exist any more.
                      setOffset(0);
                      setFeedback(value);
                    }}
                  >
                    {t(`recorded.feedback.filter_${value}`)}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button type="button" size="lg" />}>
                <Download />
                {t("recorded.export")}
                <ChevronDown className="transition-transform group-aria-expanded/button:rotate-180" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-40">
                {Object.entries(exportOptions).map(([key, data]) => (
                  <DropdownMenuItem
                    key={key}
                    onClick={() => handleDumpChats(key)}
                  >
                    {data.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            {chats.length > 0 && (
              <Button
                type="button"
                size="lg"
                variant="destructive"
                onClick={handleClearAllChats}
              >
                <Trash2 />
                Clear Chats
              </Button>
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
            <TableHead scope="col">{t("recorded.table.id")}</TableHead>
            <TableHead scope="col">{t("recorded.table.by")}</TableHead>
            <TableHead scope="col">{t("recorded.table.workspace")}</TableHead>
            <TableHead scope="col">{t("recorded.table.prompt")}</TableHead>
            <TableHead scope="col">{t("recorded.table.response")}</TableHead>
            <TableHead scope="col">{t("recorded.table.feedback")}</TableHead>
            <TableHead scope="col">{t("recorded.table.at")}</TableHead>
            <TableHead scope="col"> </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {!!chats &&
            chats.map((chat) => (
              <ChatRow key={chat.id} chat={chat} onDelete={handleDeleteChat} />
            ))}
        </TableBody>
      </Table>
      <div className="mt-6 flex w-full items-center justify-between">
        <Button
          type="button"
          size="lg"
          variant="outline"
          onClick={handlePrevious}
          className="disabled:invisible"
          disabled={offset === 0}
        >
          Previous Page
        </Button>
        <Button
          type="button"
          size="lg"
          variant="outline"
          onClick={handleNext}
          className="disabled:invisible"
          disabled={!canNext}
        >
          Next Page
        </Button>
      </div>
    </>
  );
}

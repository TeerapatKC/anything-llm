import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { MemoriesProvider, useMemoriesContext } from "./MemoriesContext";
import MemoryTabs from "./MemoryTabs";
import MemoryCard from "./MemoryCard";
import MemoryModal from "./MemoryModal";

export { useMemoriesSidebar } from "../ChatSidebar";

export default function MemoriesSidebar({ workspace }) {
  return (
    <MemoriesProvider workspace={workspace}>
      <MemoriesSidebarContent />
    </MemoriesProvider>
  );
}

function MemoriesSidebarContent() {
  const { sidebarOpen, enabled, closeSidebar } = useMemoriesContext();

  // The instance policy is the only gate. It used to be one of two, with each
  // user able to opt out of being remembered from switches at the top of this
  // panel; those are gone, so the panel exists exactly when an admin says the
  // feature does.
  if (!enabled) return null;
  return (
    <>
      <Dialog open={sidebarOpen} onOpenChange={(open) => !open && closeSidebar()}>
        <DialogContent
          showCloseButton={false}
          onInteractOutside={closeSidebar}
          className="max-h-[80vh] w-[min(92vw,560px)] rounded-[16px] flex flex-col gap-5 overflow-hidden"
        >
          <SidebarHeader />
          <MemoryList />
        </DialogContent>
      </Dialog>
      <MemoryModalWrapper />
    </>
  );
}

function MemoryList() {
  const { activeMemories } = useMemoriesContext();

  if (activeMemories.length === 0) {
    return (
      <div className="min-h-0 overflow-y-auto no-scroll">
        <MemoryTabs />
        <EmptyState />
      </div>
    );
  }

  return (
    <div className="min-h-0 overflow-y-auto no-scroll">
      <MemoryTabs />
      <div className="mt-4 flex flex-col gap-1.5 pb-4">
        {activeMemories.map((memory) => (
          <MemoryCard key={memory.id} memory={memory} />
        ))}
      </div>
    </div>
  );
}

function MemoryModalWrapper() {
  const { modalState, editingMemory, closeModal, handleCreate, handleUpdate } =
    useMemoriesContext();

  return (
    <MemoryModal
      isOpen={modalState.open}
      mode={modalState.mode}
      initialContent={editingMemory?.content || ""}
      onClose={closeModal}
      onSubmit={(content) => {
        if (modalState.mode === "edit" && editingMemory) {
          handleUpdate(editingMemory.id, content);
        } else {
          handleCreate(content);
        }
      }}
    />
  );
}

function SidebarHeader() {
  const { t } = useTranslation();
  const { closeSidebar } = useMemoriesContext();

  return (
    <div className="flex items-start justify-between shrink-0">
      <DialogTitle className="font-medium text-base leading-6 text-zinc-50 light:text-slate-900">
        {t("chat_window.memories.title")}
      </DialogTitle>
      <button
        type="button"
        onClick={closeSidebar}
        aria-label={t("chat_window.cancel")}
        className="-mt-1 -mr-1 rounded-md p-1 text-zinc-400 hover:bg-white/10 hover:text-zinc-50 light:text-slate-500 light:hover:bg-black/5 light:hover:text-slate-900"
      >
        <X size={16} />
      </button>
    </div>
  );
}

function EmptyState() {
  const { t } = useTranslation();
  const { openCreateModal } = useMemoriesContext();
  return (
    <p className="mt-4 text-sm leading-5 text-zinc-400 light:text-slate-600 text-center">
      {t("chat_window.memories.empty")}{" "}
      <button
        type="button"
        onClick={openCreateModal}
        className="text-zinc-50 light:text-slate-900 underline border-none bg-transparent cursor-pointer p-0 text-sm leading-5 font-normal"
      >
        {t("chat_window.memories.empty_cta")}
      </button>
    </p>
  );
}

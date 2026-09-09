import { createContext, useContext, useState, useEffect } from "react";
import { useMemoriesSidebar } from "../ChatSidebar";
import Memory from "@/models/memory";

export const LIMITS = {
  workspace: 20,
  global: 5,
};

const MemoriesContext = createContext(null);

export const MEMORIES_UPDATED_EVENT = "memories-updated";

/**
 * Announces that the server wrote a memory during a chat turn.
 *
 * The panel otherwise only refetches when it is opened, so a memory saved from
 * something the person just said would sit behind a stale list while the panel
 * is open next to the conversation that created it.
 */
export function emitMemoriesUpdatedEvent() {
  window.dispatchEvent(new CustomEvent(MEMORIES_UPDATED_EVENT));
}

export function useMemoriesContext() {
  const ctx = useContext(MemoriesContext);
  if (!ctx) {
    throw new Error("useMemoriesContext must be used within MemoriesProvider");
  }
  return ctx;
}

export function MemoriesProvider({ workspace, children }) {
  const { sidebarOpen, closeSidebar } = useMemoriesSidebar();

  const [memories, setMemories] = useState({ global: [], workspace: [] });
  const [activeTab, setActiveTab] = useState("workspace");
  const [modalState, setModalState] = useState({ open: false, mode: "create" });
  const [editingMemory, setEditingMemory] = useState(null);
  // Whether the feature exists at all, which is an admin's decision. The API
  // also reports each user's own preference, but nothing in the UI sets it any
  // more, so the panel follows the instance policy alone.
  const [enabled, setEnabled] = useState(false);

  async function loadPreferences() {
    const { instance } = await Memory.preferences();
    setEnabled(instance.memoryEnabled);
  }

  // Read on mount rather than when the panel opens. The panel only renders once
  // this resolves, and it is now opened from the account menu, so deferring the
  // read would leave the first click doing nothing visible until it lands.
  useEffect(() => {
    loadPreferences();
  }, []);

  async function fetchMemories() {
    if (!workspace?.slug) return;
    const data = await Memory.forWorkspace(workspace.slug);
    setMemories(data);
  }

  useEffect(() => {
    if (sidebarOpen && enabled) fetchMemories();
  }, [sidebarOpen, workspace?.slug, enabled]);

  useEffect(() => {
    if (!sidebarOpen || !enabled) return;
    function onMemoriesUpdated() {
      fetchMemories();
    }
    window.addEventListener(MEMORIES_UPDATED_EVENT, onMemoriesUpdated);
    return () =>
      window.removeEventListener(MEMORIES_UPDATED_EVENT, onMemoriesUpdated);
  }, [sidebarOpen, enabled, workspace?.slug]);

  async function handleCreate(content) {
    const { memory } = await Memory.create(workspace.slug, {
      content,
      scope: activeTab,
    });
    if (memory) fetchMemories();
  }

  async function handleDelete(memoryId) {
    await Memory.delete(memoryId);
    fetchMemories();
  }

  async function handleUpdate(memoryId, content) {
    const { memory } = await Memory.update(memoryId, { content });
    if (memory) fetchMemories();
  }

  async function handlePromote(memoryId) {
    const { memory } = await Memory.promoteToGlobal(memoryId);
    if (memory) fetchMemories();
  }

  async function handleDemote(memoryId) {
    if (!workspace?.slug) return;
    const { memory } = await Memory.demoteToWorkspace(memoryId, workspace.slug);
    if (memory) fetchMemories();
  }

  function openCreateModal() {
    setEditingMemory(null);
    setModalState({ open: true, mode: "create" });
  }

  function openEditModal(memory) {
    setEditingMemory(memory);
    setModalState({ open: true, mode: "edit" });
  }

  function closeModal() {
    setModalState({ open: false, mode: "create" });
    setEditingMemory(null);
  }

  const activeMemories =
    activeTab === "workspace" ? memories.workspace : memories.global;

  const value = {
    workspace,
    sidebarOpen,
    closeSidebar,
    memories,
    activeTab,
    setActiveTab,
    activeMemories,
    enabled,
    modalState,
    editingMemory,
    openCreateModal,
    openEditModal,
    closeModal,
    handleCreate,
    handleDelete,
    handleUpdate,
    handlePromote,
    handleDemote,
  };

  return (
    <MemoriesContext.Provider value={value}>
      {children}
    </MemoriesContext.Provider>
  );
}

import { createContext, useContext, useState, useEffect } from "react";
import { useMemoriesSidebar } from "../ChatSidebar";
import Memory from "@/models/memory";

export const LIMITS = {
  workspace: 20,
  global: 5,
};

const MemoriesContext = createContext(null);

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
  // `enabled`/`autoExtraction` are the *effective* state - the instance policy
  // ANDed with this user's own choice. `instance` is kept alongside so the UI
  // can say "an admin turned this off" instead of showing a dead switch.
  const [enabled, setEnabled] = useState(false);
  const [autoExtraction, setAutoExtraction] = useState(true);
  const [instance, setInstance] = useState({
    memoryEnabled: false,
    memoryAutoExtraction: true,
  });
  const [loadingEnabled, setLoadingEnabled] = useState(true);

  async function loadPreferences() {
    const { instance, effective } = await Memory.preferences();
    setInstance(instance);
    setEnabled(effective.memoryEnabled);
    setAutoExtraction(effective.memoryAutoExtraction);
    setLoadingEnabled(false);
  }

  useEffect(() => {
    if (!sidebarOpen) return;
    loadPreferences();
  }, [sidebarOpen]);

  /**
   * Writes the caller's own preference and re-reads the resolved state, so the
   * switches always reflect what the server actually decided rather than an
   * optimistic guess that ignores the instance policy above it.
   * @param {{memoryEnabled?: boolean, memoryAutoExtraction?: boolean}} updates
   */
  async function updatePreferences(updates) {
    const { success } = await Memory.updatePreferences(updates);
    if (!success) return;
    await loadPreferences();
  }

  async function fetchMemories() {
    if (!workspace?.slug) return;
    const data = await Memory.forWorkspace(workspace.slug);
    setMemories(data);
  }

  useEffect(() => {
    if (sidebarOpen && enabled) fetchMemories();
  }, [sidebarOpen, workspace?.slug, enabled]);

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
    autoExtraction,
    instance,
    updatePreferences,
    loadingEnabled,
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

import { useEffect, useState } from "react";
import { Empty, EmptyDescription, EmptyHeader } from "@/components/ui/empty";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useModal } from "@/hooks/useModal";
import showToast from "@/utils/toast";
import AddPresetModal from "./AddPresetModal";
import EditPresetModal from "./EditPresetModal";
import WorkspaceSettingsSectionHeader from "@/components/layout/WorkspaceSettingsSectionHeader";

/**
 * The list + add/edit/delete UI shared by the two places slash commands are managed:
 * a workspace's own commands, and the instance-wide built-ins. The caller supplies the
 * data access so this component stays unaware of which scope it is editing.
 *
 * @param {object} props
 * @param {string} props.title
 * @param {string} props.description
 * @param {() => Promise<object[]>} props.fetchPresets
 * @param {(preset: object) => Promise<{error: string|null}>} props.createPreset
 * @param {(id: number, preset: object) => Promise<{error: string|null}>} props.updatePreset
 * @param {(id: number) => Promise<boolean>} props.deletePreset
 * @param {string} [props.emptyHint] - shown when there are no commands yet.
 */
export default function SlashCommandManager({
  title,
  description,
  fetchPresets,
  createPreset,
  updatePreset,
  deletePreset,
  emptyHint = "No slash commands yet.",
}) {
  const [presets, setPresets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPreset, setSelectedPreset] = useState(null);
  const {
    isOpen: isAddOpen,
    openModal: openAdd,
    closeModal: closeAdd,
  } = useModal();
  const {
    isOpen: isEditOpen,
    openModal: openEdit,
    closeModal: closeEdit,
  } = useModal();

  async function refresh() {
    const next = await fetchPresets();
    setPresets(next);
    setLoading(false);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleCreate(preset) {
    const { error } = await createPreset(preset);
    if (error) {
      showToast(error, "error");
      return false;
    }
    showToast("Slash command created.", "success", { clear: true });
    await refresh();
    closeAdd();
    return true;
  }

  async function handleUpdate(updated) {
    const { error } = await updatePreset(updated.id, updated);
    if (error) {
      showToast(error, "error");
      return;
    }
    showToast("Slash command updated.", "success", { clear: true });
    await refresh();
    closeEdit();
    setSelectedPreset(null);
  }

  async function handleDelete(presetId) {
    const ok = await deletePreset(presetId);
    if (!ok) {
      showToast("Could not delete slash command.", "error");
      return;
    }
    showToast("Slash command deleted.", "success", { clear: true });
    await refresh();
    closeEdit();
    setSelectedPreset(null);
  }

  return (
    <div className="flex flex-col gap-y-4">
      <WorkspaceSettingsSectionHeader
        title={title}
        description={description}
        actions={
          <Button
            type="button"
            size="lg"
            onClick={openAdd}
            disabled={loading}
          >
            <Plus className="mr-1.5 size-4" />
            New command
          </Button>
        }
      />

      {loading ? (
        <div className="flex flex-col gap-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-md" />
          ))}
        </div>
      ) : presets.length === 0 ? (
        <Empty className="border border-dashed border-theme-sidebar-border py-8">
          <EmptyHeader>
            <EmptyDescription>{emptyHint}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ul className="flex flex-col gap-y-2">
          {presets.map((preset) => (
            <li key={preset.id}>
              <button
                type="button"
                onClick={() => {
                  setSelectedPreset(preset);
                  openEdit();
                }}
                className="flex w-full flex-col items-start gap-y-1 rounded-md border border-theme-sidebar-border bg-theme-bg-secondary px-4 py-3 text-left transition-colors hover:border-theme-text-secondary"
              >
                <code className="font-mono text-sm text-theme-text-primary">
                  {preset.command}
                </code>
                <span className="line-clamp-2 text-xs text-theme-text-secondary">
                  {preset.description}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <AddPresetModal
        isOpen={isAddOpen}
        onClose={closeAdd}
        onSave={handleCreate}
      />
      {selectedPreset && (
        <EditPresetModal
          isOpen={isEditOpen}
          onClose={() => {
            closeEdit();
            setSelectedPreset(null);
          }}
          onSave={handleUpdate}
          onDelete={handleDelete}
          preset={selectedPreset}
        />
      )}
    </div>
  );
}

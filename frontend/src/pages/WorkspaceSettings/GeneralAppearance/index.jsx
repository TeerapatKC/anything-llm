import Workspace from "@/models/workspace";
import { castToType } from "@/utils/types";
import showToast from "@/utils/toast";
import { useEffect, useRef, useState } from "react";
import WorkspaceName from "./WorkspaceName";
import SuggestedChatMessages from "./SuggestedChatMessages";
import WorkspaceStatus from "./WorkspaceStatus";
import DeleteWorkspace from "./DeleteWorkspace";
import { Button } from "@/components/ui/button";
import ContextualSaveBar from "@/components/ContextualSaveBar";

export default function GeneralInfo({
  slug,
  deletionProtected = false,
  saveBarProps,
  suggestedSaveBarProps,
  onWorkspaceSaved,
}) {
  const [workspace, setWorkspace] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [resetKey, setResetKey] = useState(0);
  const formEl = useRef(null);

  useEffect(() => {
    async function fetchWorkspace() {
      const workspace = await Workspace.bySlug(slug);
      setWorkspace(workspace);
      setLoading(false);
    }
    fetchWorkspace();
  }, [slug]);

  const handleUpdate = async (e) => {
    setSaving(true);
    e.preventDefault();
    const data = {};
    const form = new FormData(formEl.current);
    for (var [key, value] of form.entries()) data[key] = castToType(key, value);
    const { workspace: updatedWorkspace, message } = await Workspace.update(
      workspace.slug,
      data
    );
    if (!!updatedWorkspace) {
      showToast("Workspace updated!", "success", { clear: true });
      setWorkspace(updatedWorkspace);
      onWorkspaceSaved?.(updatedWorkspace);
      setHasChanges(false);
    } else {
      showToast(`Error: ${message}`, "error", { clear: true });
    }
    setSaving(false);
  };

  if (!workspace || loading) return null;
  return (
    <div className="flex w-full flex-col gap-y-[32px]">
      <form
        key={resetKey}
        ref={formEl}
        onSubmit={handleUpdate}
        className="flex w-full flex-col gap-y-6"
      >
        {hasChanges && !saveBarProps?.register && (
          <div className="flex w-full justify-end">
            <Button size="lg" type="submit">
              {saving ? "Updating..." : "Update Workspace"}
            </Button>
          </div>
        )}
        <div className="w-full md:w-1/2">
          <WorkspaceName
            key={workspace.slug}
            workspace={workspace}
            setHasChanges={setHasChanges}
          />
        </div>
      </form>
      <ContextualSaveBar
        {...saveBarProps}
        showing={hasChanges}
        saving={saving}
        onSave={() => formEl.current?.requestSubmit()}
        onCancel={() => {
          setHasChanges(false);
          setResetKey((key) => key + 1);
        }}
      />
      <SuggestedChatMessages
        slug={workspace.slug}
        saveBarProps={suggestedSaveBarProps}
      />
      <WorkspaceStatus workspace={workspace} />
      <DeleteWorkspace workspace={workspace} visible={!deletionProtected} />
    </div>
  );
}

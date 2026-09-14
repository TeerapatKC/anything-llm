import Workspace from "@/models/workspace";
import showToast from "@/utils/toast";
import { castToType } from "@/utils/types";
import { useRef, useState } from "react";
import VectorDBIdentifier from "./VectorDBIdentifier";
import MaxContextSnippets from "./MaxContextSnippets";
import DocumentSimilarityThreshold from "./DocumentSimilarityThreshold";
import ResetDatabase from "./ResetDatabase";
import VectorCount from "./VectorCount";
import VectorSearchMode from "./VectorSearchMode";
import { Button } from "@/components/ui/button";
import ContextualSaveBar from "@/components/ContextualSaveBar";

export default function VectorDatabase({
  workspace,
  saveBarProps,
  onWorkspaceSaved,
}) {
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const formEl = useRef(null);

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
      onWorkspaceSaved?.(updatedWorkspace);
      setHasChanges(false);
    } else {
      showToast(`Error: ${message}`, "error", { clear: true });
    }
    setSaving(false);
  };

  if (!workspace) return null;
  return (
    <div className="w-full">
      <form
        key={resetKey}
        ref={formEl}
        onSubmit={handleUpdate}
        className="flex w-full flex-col gap-y-[32px]"
      >
        {hasChanges && !saveBarProps?.register && (
          <div className="flex w-full justify-end">
            <Button size="lg" type="submit">
              {saving ? "Updating..." : "Update Workspace"}
            </Button>
          </div>
        )}
        <div className="flex w-full flex-col gap-y-[32px] md:w-1/2">
          <div className="flex items-start gap-x-5">
            <VectorDBIdentifier workspace={workspace} />
            <VectorCount reload={true} workspace={workspace} />
          </div>
          <VectorSearchMode
            workspace={workspace}
            setHasChanges={setHasChanges}
          />
          <MaxContextSnippets
            workspace={workspace}
            setHasChanges={setHasChanges}
          />
          <DocumentSimilarityThreshold
            workspace={workspace}
            setHasChanges={setHasChanges}
          />
          <ResetDatabase workspace={workspace} />
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
    </div>
  );
}

import { useRef, useState } from "react";
import VectorSearchMode from "@/pages/WorkspaceSettings/VectorDatabase/VectorSearchMode";
import MaxContextSnippets from "@/pages/WorkspaceSettings/VectorDatabase/MaxContextSnippets";
import DocumentSimilarityThreshold from "@/pages/WorkspaceSettings/VectorDatabase/DocumentSimilarityThreshold";
import ContextualSaveBar from "@/components/ContextualSaveBar";
import { collectFields } from "./index";

/**
 * The retrieval settings every private workspace is created with.
 *
 * The same controls as a workspace's own Vector Database tab, without the three that
 * describe a particular workspace rather than configure one: its namespace, how many
 * vectors it currently holds, and the button that empties it.
 */
export default function VectorDefaults({ workspace, onSave }) {
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const formEl = useRef(null);

  async function handleUpdate(e) {
    e.preventDefault();
    setSaving(true);
    const saved = await onSave(collectFields(formEl.current));
    setSaving(false);
    if (saved) setHasChanges(false);
  }

  if (!workspace) return null;
  return (
    <div className="w-full">
      <form
        key={resetKey}
        ref={formEl}
        onSubmit={handleUpdate}
        className="flex w-full flex-col gap-y-[32px]"
      >
        <div className="flex w-full flex-col gap-y-[32px] md:w-1/2">
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
        </div>
      </form>
      <ContextualSaveBar
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

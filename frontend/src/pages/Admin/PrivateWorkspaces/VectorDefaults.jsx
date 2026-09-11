import { useRef, useState } from "react";
import VectorSearchMode from "@/pages/WorkspaceSettings/VectorDatabase/VectorSearchMode";
import MaxContextSnippets from "@/pages/WorkspaceSettings/VectorDatabase/MaxContextSnippets";
import DocumentSimilarityThreshold from "@/pages/WorkspaceSettings/VectorDatabase/DocumentSimilarityThreshold";
import { collectFields, SaveBar } from "./index";

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
    <div className="relative w-full">
      <form
        ref={formEl}
        onSubmit={handleUpdate}
        className="flex w-1/2 flex-col gap-y-[32px]"
      >
        <SaveBar hasChanges={hasChanges} saving={saving} />
        <VectorSearchMode workspace={workspace} setHasChanges={setHasChanges} />
        <MaxContextSnippets
          workspace={workspace}
          setHasChanges={setHasChanges}
        />
        <DocumentSimilarityThreshold
          workspace={workspace}
          setHasChanges={setHasChanges}
        />
      </form>
    </div>
  );
}

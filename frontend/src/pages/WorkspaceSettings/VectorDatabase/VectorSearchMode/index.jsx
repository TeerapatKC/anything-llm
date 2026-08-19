import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// We dont support all vectorDBs yet for reranking due to complexities of how each provider
// returns information. We need to normalize the response data so Reranker can be used for each provider.
const supportedVectorDBs = ["lancedb"];
const hint = {
  default: {
    title: "Default",
    description:
      "This is the fastest performance, but may not return the most relevant results leading to model hallucinations.",
  },
  rerank: {
    title: "Accuracy Optimized",
    description:
      "LLM responses may take longer to generate, but your responses will be more accurate and relevant.",
  },
};

export default function VectorSearchMode({ workspace, setHasChanges }) {
  const [selection, setSelection] = useState(
    workspace?.vectorSearchMode ?? "default"
  );
  if (!workspace?.vectorDB || !supportedVectorDBs.includes(workspace?.vectorDB))
    return null;

  return (
    <div className="flex flex-col">
      <div className="flex flex-col gap-y-[8px]">
        <label htmlFor="name" className="block input-label">
          Search Preference
        </label>
        <p className="text-theme-text-primary/60 text-xs font-medium">
          {hint[selection]?.description}
        </p>
      </div>
      <Select
        name="vectorSearchMode"
        value={selection}
        onValueChange={(value) => {
          setSelection(value);
          setHasChanges(true);
        }}
        required={true}
      >
        <SelectTrigger className="border-none bg-theme-settings-input-bg text-theme-text-primary text-sm mt-2 rounded-lg focus:outline-primary-button active:outline-primary-button outline-none w-full p-2.5">
          <SelectValue placeholder="Select an option" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="default">Default</SelectItem>
          <SelectItem value="rerank">Accuracy Optimized</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

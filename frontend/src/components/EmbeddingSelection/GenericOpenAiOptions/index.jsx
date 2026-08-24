import React, { useState } from "react";
import { ChevronDown, ChevronUp, Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function GenericOpenAiEmbeddingOptions({ settings }) {
  const [showAdvancedControls, setShowAdvancedControls] = useState(false);
  return (
    <div className="w-full flex flex-col gap-y-7">
      <div className="w-full flex items-center gap-[36px] mt-1.5 flex-wrap">
        <div className="flex flex-col w-60">
          <Label className="block mb-3">Base URL</Label>
          <Input
            type="url"
            name="EmbeddingBasePath"
            placeholder="https://api.openai.com/v1"
            defaultValue={settings?.EmbeddingBasePath}
            required={true}
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        <div className="flex flex-col w-60">
          <Label className="block mb-3">Embedding Model</Label>
          <Input
            type="text"
            name="EmbeddingModelPref"
            placeholder="text-embedding-ada-002"
            defaultValue={settings?.EmbeddingModelPref}
            required={true}
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        <div className="flex flex-col w-60">
          <div className="flex items-center mb-3 gap-x-1">
            <Label className="block">Max embedding chunk length</Label>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Info
                    size={18}
                    className="text-theme-text-secondary cursor-pointer"
                  />
                }
              ></TooltipTrigger>
              <TooltipContent side="top" className="max-w-[250px] text-xs">
                Maximum length of text chunks, in characters, for embedding.
              </TooltipContent>
            </Tooltip>
          </div>
          <Input
            type="number"
            name="EmbeddingModelMaxChunkLength"
            placeholder="8192"
            min={1}
            onScroll={(e) => e.target.blur()}
            defaultValue={settings?.EmbeddingModelMaxChunkLength}
            required={false}
            autoComplete="off"
          />
        </div>
      </div>
      <div className="w-full flex items-center gap-[36px]">
        <div className="flex flex-col w-60">
          <div className="flex flex-col gap-y-1 mb-4">
            <Label className="flex items-center gap-x-2">
              API Key <p className="text-xs! italic! font-thin!">optional</p>
            </Label>
          </div>
          <Input
            type="password"
            name="GenericOpenAiEmbeddingApiKey"
            placeholder="sk-mysecretkey"
            defaultValue={
              settings?.GenericOpenAiEmbeddingApiKey ? "*".repeat(20) : ""
            }
            autoComplete="new-password"
            spellCheck={false}
          />
        </div>
      </div>
      <div className="flex justify-start mt-4">
        <Button
          variant="link"
          size="sm"
          onClick={(e) => {
            e.preventDefault();
            setShowAdvancedControls(!showAdvancedControls);
          }}
        >
          {showAdvancedControls ? "Hide" : "Show"} advanced settings
          {showAdvancedControls ? (
            <ChevronUp size={14} className="ml-1" />
          ) : (
            <ChevronDown size={14} className="ml-1" />
          )}
        </Button>
      </div>
      <div hidden={!showAdvancedControls}>
        <div className="w-full flex items-start gap-4 flex-wrap">
          <div className="flex flex-col w-60">
            <div className="flex flex-col gap-y-1 mb-4">
              <Label className="flex items-center gap-x-2">
                Max concurrent Chunks
                <p className="text-xs! italic! font-thin!">optional</p>
              </Label>
            </div>
            <Input
              type="number"
              name="GenericOpenAiEmbeddingMaxConcurrentChunks"
              placeholder="500"
              min={1}
              onScroll={(e) => e.target.blur()}
              defaultValue={settings?.GenericOpenAiEmbeddingMaxConcurrentChunks}
              required={false}
              autoComplete="off"
              spellCheck={false}
            />
          </div>
          <div className="flex flex-col w-60">
            <div className="flex items-center mb-4 gap-x-1">
              <Label className="flex items-center gap-x-2">
                Passage Prefix
              </Label>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Info
                      size={18}
                      className="text-theme-text-secondary cursor-pointer"
                    />
                  }
                ></TooltipTrigger>
                <TooltipContent side="top" className="max-w-[250px] text-xs">
                  <p className="text-xs leading-[18px] font-base">
                    Text prepended to each chunk of content before embedding for
                    storage. Some models require this to distinguish passages
                    from queries (e.g. "passage: " or "search_document: ").
                    <br />
                    <br />
                    NexusAI <b>does not</b> append anything to this text
                    including the ":" character.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
            <Input
              type="text"
              name="GenericOpenAiEmbeddingPassagePrefix"
              placeholder="passage: "
              defaultValue={settings?.GenericOpenAiEmbeddingPassagePrefix}
              required={false}
              autoComplete="off"
              spellCheck={false}
            />
          </div>
          <div className="flex flex-col w-60">
            <div className="flex items-center mb-4 gap-x-1">
              <Label className="flex items-center gap-x-2">Query Prefix</Label>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Info
                      size={18}
                      className="text-theme-text-secondary cursor-pointer"
                    />
                  }
                ></TooltipTrigger>
                <TooltipContent side="top" className="max-w-[250px] text-xs">
                  <p className="text-xs leading-[18px] font-base">
                    Text prepended to the query text before embedding for
                    search. Some models require this to distinguish queries from
                    passages (e.g. "query: " or "search_query: ").
                    <br />
                    <br />
                    NexusAI <b>does not</b> append anything to this text
                    including the ":" character.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
            <Input
              type="text"
              name="GenericOpenAiEmbeddingQueryPrefix"
              placeholder="query: "
              defaultValue={settings?.GenericOpenAiEmbeddingQueryPrefix}
              required={false}
              autoComplete="off"
              spellCheck={false}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

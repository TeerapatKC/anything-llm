import { Trans, useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  const [showAdvancedControls, setShowAdvancedControls] = useState(false);
  return (
    <div className="w-full flex flex-col gap-y-7">
      <div className="w-full flex items-center gap-[36px] mt-1.5 flex-wrap">
        <div className="flex flex-col w-60">
          <Label className="block mb-3">{t("provider-options.base-url")}</Label>
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
          <Label className="block mb-3">
            {t("provider-options.embedding-model")}
          </Label>
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
            <Label className="block">
              {t("provider-options.max-embedding-chunk")}
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
                {t("provider-options.max-embedding-chunk-help")}
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
              {t("provider-options.api-key")}{" "}
              <p className="text-xs! italic! font-thin!">optional</p>
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
                    <Trans
                      i18nKey="help.generic-open-ai-options"
                      components={{ b: <b />, br: <br /> }}
                    />
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
                    <Trans
                      i18nKey="help.generic-open-ai-options-2"
                      components={{ b: <b />, br: <br /> }}
                    />
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

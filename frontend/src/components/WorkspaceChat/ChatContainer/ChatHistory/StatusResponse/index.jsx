import React, { useState } from "react";
import { ChevronDown } from "lucide-react";

import AgentAnimation from "@/media/animations/agent-animation.webm";
import AgentStatic from "@/media/animations/agent-static.png";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * The agent's running commentary - "Swapping over to agent chat", the thought before
 * each step - shown while it works.
 *
 * It is deliberately unobtrusive: no card, no border, just dim text with a light
 * sweeping across it, so the eye reads it as progress rather than as another message.
 * Once the answer itself arrives this unmounts entirely, leaving the reply on its own.
 *
 * @param {{messages: Array, isThinking: boolean, isComplete: boolean}} props
 *   `isComplete` means a later message exists - the agent has answered.
 */
export default function StatusResponse({
  messages = [],
  isThinking = false,
  isComplete = false,
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const currentThought = messages[messages.length - 1];
  const previousThoughts = messages.slice(0, -1);

  // The point of the whole component is to get out of the way once there is a real
  // answer to read.
  if (isComplete || !currentThought) return null;

  function handleExpandClick() {
    if (previousThoughts.length === 0) return;
    setIsExpanded(!isExpanded);
  }

  const canExpand = previousThoughts.length > 0;

  return (
    <div className="flex justify-center w-full pr-4">
      <div className="w-full flex flex-col">
        <div
          onClick={handleExpandClick}
          className={`flex items-start gap-x-2.5 py-2 ${canExpand ? "cursor-pointer" : ""}`}
        >
          <div className="shrink-0 w-[18px] h-[18px] mt-[1px] opacity-50">
            {isThinking ? (
              <video
                autoPlay
                loop
                muted
                playsInline
                className="w-[18px] h-[18px] scale-[165%] light:invert"
                aria-label="Agent is thinking..."
              >
                <source src={AgentAnimation} type="video/webm" />
              </video>
            ) : (
              <img
                src={AgentStatic}
                alt="Agent complete"
                className="w-[18px] h-[18px] light:invert"
                aria-label="Agent has finished thinking"
              />
            )}
          </div>

          <div
            className={`min-w-0 flex-1 transition-[max-height] duration-300 ease-in-out origin-top ${
              isExpanded ? "" : "overflow-hidden max-h-[18px]"
            }`}
          >
            <div className="font-mono text-sm leading-[18px]">
              {!isExpanded ? (
                <span
                  className={`block w-full truncate ${
                    isThinking
                      ? "text-shimmer"
                      : "text-white/40 light:text-slate-900/40"
                  }`}
                >
                  {currentThought.content}
                </span>
              ) : (
                <>
                  {previousThoughts.map((thought, index) => (
                    <div
                      key={`cot-${thought.uuid || index}`}
                      className="mb-2 text-white/40 light:text-slate-900/40"
                    >
                      {thought.content}
                    </div>
                  ))}
                  <div
                    className={
                      isThinking
                        ? "text-shimmer"
                        : "text-white/40 light:text-slate-900/40"
                    }
                  >
                    {currentThought.content}
                  </div>
                </>
              )}
            </div>
          </div>

          {canExpand && (
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    onClick={handleExpandClick}
                    className="shrink-0 border-none text-white/40 light:text-slate-900/40 hover:text-white/70 light:hover:text-slate-900/70 transition-colors"
                    aria-label={
                      isExpanded ? "Hide thought chain" : "Show thought chain"
                    }
                  />
                }
              >
                <ChevronDown
                  className={`w-4 h-4 transform transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                />
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[250px] text-xs">
                {isExpanded ? "Hide thought chain" : "Show thought chain"}
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    </div>
  );
}

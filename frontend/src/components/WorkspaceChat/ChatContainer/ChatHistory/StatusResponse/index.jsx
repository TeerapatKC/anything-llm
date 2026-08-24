import React, { useState } from "react";
import { ChevronDown, CircleStop } from "lucide-react";

import AgentAnimation from "@/media/animations/agent-animation.webm";
import AgentStatic from "@/media/animations/agent-static.png";

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
  isStopped = false,
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const currentThought = messages[messages.length - 1];
  const previousThoughts = messages.slice(0, -1);

  // The point of the whole component is to get out of the way once there is a real
  // answer to read.
  if (isComplete || !currentThought) return null;

  return (
    <div className="flex w-full justify-center px-4 md:pl-0">
      <div className="w-full flex flex-col">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          aria-expanded={isExpanded}
          className="flex w-full cursor-pointer items-center gap-x-2.5 py-2 text-left"
        >
          <span className="size-[18px] shrink-0 opacity-50">
            {isStopped ? (
              <CircleStop
                className="size-[17px]"
                aria-label="Response stopped"
              />
            ) : isThinking ? (
              <video
                autoPlay
                loop
                muted
                playsInline
                className="size-[18px] scale-[165%] light:invert"
                aria-label="Agent is thinking..."
              >
                <source src={AgentAnimation} type="video/webm" />
              </video>
            ) : (
              <img
                src={AgentStatic}
                alt="Agent complete"
                className="size-[18px] light:invert"
                aria-label="Agent has finished thinking"
              />
            )}
          </span>

          <span
            className={`min-w-0 flex-1 font-mono text-sm leading-[18px] ${
              isThinking && !isStopped
                ? "text-shimmer"
                : "text-white/40 light:text-slate-900/40"
            }`}
          >
            {isStopped ? "Stopped" : "Thinking"}
          </span>

          <ChevronDown
            className={`size-4 shrink-0 transform text-white/40 transition-transform duration-200 light:text-slate-900/40 ${isExpanded ? "rotate-180" : ""}`}
          />
        </button>

        <div
          className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
            isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
          }`}
        >
          <div className="overflow-hidden">
            <div className="pb-2 pl-7 font-mono text-sm leading-5 text-white/40 light:text-slate-900/40">
              {previousThoughts.map((thought, index) => (
                <div key={`cot-${thought.uuid || index}`} className="mb-2">
                  {thought.content}
                </div>
              ))}
              <div>{currentThought.content}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

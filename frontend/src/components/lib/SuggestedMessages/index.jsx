export default function SuggestedMessages({
  suggestedMessages = [],
  sendCommand,
}) {
  if (!suggestedMessages?.length) return null;

  return (
    <div className="flex w-full max-w-[650px] flex-col px-4 mt-6">
      <div className="mb-2 px-1 text-xs font-medium text-zinc-500 light:text-theme-text-secondary">
        <span>Suggested prompts</span>
      </div>
      <ul className="flex flex-col gap-1">
        {suggestedMessages.map((msg, index) => {
          const heading = msg.heading?.trim() || "";
          const message = msg.message?.trim() || "";
          const text = heading ? `${heading} ${message}`.trim() : message;
          if (!text) return null;

          return (
            <li key={index}>
              <button
                type="button"
                onClick={() => sendCommand({ text, autoSubmit: true })}
                className="group flex w-full items-start gap-3 rounded-md px-1 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <span
                  aria-hidden="true"
                  className="mt-2 size-1.5 shrink-0 rounded-full bg-zinc-500 transition-colors group-hover:bg-white light:bg-theme-text-secondary light:group-hover:bg-theme-text-primary"
                />
                <span className="block min-w-0">
                  <span className="block text-sm font-medium leading-5 text-white/85 transition-colors group-hover:text-white light:text-theme-text-primary light:group-hover:text-theme-text-primary/80">
                    {heading || message}
                  </span>
                  {heading && message && (
                    <span className="mt-0.5 block text-xs leading-5 text-zinc-400 light:text-theme-text-secondary">
                      {message}
                    </span>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

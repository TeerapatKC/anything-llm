/**
 * A single runnable slash command in the prompt menu. Read-only - the edit/publish
 * menu that used to live here moved to the workspace and instance settings screens
 * when slash commands became workspace scoped.
 */
export default function SlashCommandRow({
  command,
  description,
  onClick,
  highlighted = false,
}) {
  return (
    <div
      onClick={onClick}
      className={`flex items-center justify-between px-2 py-1 rounded cursor-pointer group relative ${
        highlighted
          ? "bg-zinc-700/50 light:bg-slate-100"
          : "hover:bg-zinc-700/50 light:hover:bg-slate-100"
      }`}
    >
      <div className="flex gap-1.5 items-center text-xs min-w-0 flex-1">
        <span className="text-theme-text-primary light:text-slate-900 shrink-0">
          {command}
        </span>
        <span className="text-zinc-400 light:text-slate-500 italic truncate">
          {description}
        </span>
      </div>
    </div>
  );
}

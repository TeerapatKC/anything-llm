import useSessionId from "@/hooks/useSessionId";

export default function SessionId() {
  const sessionId = useSessionId();
  if (!sessionId) return null;

  return (
    <div className="allm-w-full allm-text-center allm-font-mono allm-text-[10px] allm-text-slate-400">
      {sessionId}
    </div>
  );
}

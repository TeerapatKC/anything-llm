import AsyncTTSMessage from "./asyncTts";

export default function TTSMessage({ slug, chatId }) {
  if (!chatId) return null;
  return (
    <div className="shrink-0">
      <AsyncTTSMessage chatId={chatId} slug={slug} />
    </div>
  );
}

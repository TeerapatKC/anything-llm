export const CHAT_UI_REOPEN = "___nexusai-chat-widget-open___";
export function parseStylesSrc(scriptSrc = null) {
  try {
    const _url = new URL(scriptSrc);
    _url.pathname = _url.pathname
      .replace("nexusai-chat-widget.js", "nexusai-chat-widget.min.css")
      .replace(
        "nexusai-chat-widget.min.js",
        "nexusai-chat-widget.min.css"
      );
    return _url.toString();
  } catch {
    return "";
  }
}

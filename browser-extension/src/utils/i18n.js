const ENGLISH_FALLBACKS = {
  document_title: "Nexus AI Document Saver",
  logo_alt: "Nexus AI Logo",
  intro:
    "Right click on any page and send selected text or entire pages to Nexus AI.",
  connection_string_label: "Nexus AI Connection String",
  connection_string_placeholder: "Paste connection string here",
  connect: "Connect",
  connected: "Connected to Nexus AI",
  disconnect: "Disconnect",
  disconnect_success: "Successfully disconnected from Nexus AI",
  invalid_connection_string: "Invalid connection string format.",
  offline: "Nexus AI is currently offline. Please try again later.",
  invalid_api_key: "Failed to connect: Invalid API key",
  connect_success: "Successfully connected to Nexus AI",
  connection_error: "An error occurred during connection: $1",
  no_connection: "No connection found",
  disconnect_server_failed: "Failed to disconnect from the server",
  disconnection_error: "An error occurred during disconnection: $1",
  generic_error: "An error occurred. Please try again later.",
};

export function t(key, substitutions) {
  const translated = globalThis.chrome?.i18n?.getMessage(key, substitutions);
  if (translated) return translated;

  const fallback = ENGLISH_FALLBACKS[key] ?? key;
  const values = Array.isArray(substitutions)
    ? substitutions
    : substitutions == null
      ? []
      : [substitutions];
  return values.reduce(
    (message, value, index) =>
      message.replaceAll(`$${index + 1}`, String(value)),
    fallback
  );
}

export function currentLanguage() {
  return globalThis.chrome?.i18n?.getUILanguage?.() || "en";
}

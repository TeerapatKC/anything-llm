import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import { parseStylesSrc } from "./utils/constants.js";
import { initI18n } from "./i18n.js";

const appElement = document.createElement("div");
document.body.appendChild(appElement);

const scriptSettings = Object.assign(
  {},
  document?.currentScript?.dataset || {}
);

export const embedderSettings = {
  settings: scriptSettings,
  stylesSrc: parseStylesSrc(document?.currentScript?.src),
  USER_STYLES: {
    msgBg: scriptSettings?.userBgColor ?? "#0F172A",
    base: `allm-text-white allm-rounded-xl allm-ml-12 allm-mr-1 allm-max-w-[80%]`,
  },
  ASSISTANT_STYLES: {
    msgBg: scriptSettings?.assistantBgColor ?? "#F8FAFC",
    base: `allm-text-slate-900 allm-rounded-xl allm-mr-10 allm-ml-2 allm-max-w-[calc(100%-3.5rem)]`,
  },
};

// Initialize i18n after settings are available
initI18n(scriptSettings);

const root = ReactDOM.createRoot(appElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

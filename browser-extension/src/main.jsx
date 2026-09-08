import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import { currentLanguage, t } from "./utils/i18n";

document.documentElement.lang = currentLanguage();
document.title = t("document_title");

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

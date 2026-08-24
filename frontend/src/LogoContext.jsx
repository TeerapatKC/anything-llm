import { createContext, useEffect, useRef, useState } from "react";
import NexusAI from "./media/logo/nexus-ai-re-bg-light.png";
import NexusAIDark from "./media/logo/nexus-ai-re-bg-dark.png";
import System, { CUSTOM_APP_NAME_UPDATED_EVENT } from "./models/system";

export const REFETCH_LOGO_EVENT = "refetch-logo";

function isLightMode() {
  return document.documentElement.getAttribute("data-theme") === "light";
}

function defaultBrandLogo() {
  return isLightMode() ? NexusAIDark : NexusAI;
}

export const LogoContext = createContext();

export function LogoProvider({ children }) {
  const [logo, setLogo] = useState("");
  const [isCustomLogo, setIsCustomLogo] = useState(false);

  async function fetchInstanceLogo() {
    try {
      const { isCustomLogo, logoURL } = await System.fetchLogo();
      if (isCustomLogo && logoURL) {
        setLogo(logoURL);
        setIsCustomLogo(true);
      } else {
        setLogo(defaultBrandLogo());
        setIsCustomLogo(false);
      }
    } catch (err) {
      setLogo(defaultBrandLogo());
      setIsCustomLogo(false);
      console.error("Failed to fetch logo:", err);
    }
  }

  useEffect(() => {
    fetchInstanceLogo();
    window.addEventListener(REFETCH_LOGO_EVENT, fetchInstanceLogo);
    return () => {
      window.removeEventListener(REFETCH_LOGO_EVENT, fetchInstanceLogo);
    };
  }, []);

  return (
    <LogoContext.Provider
      value={{ logo, setLogo, loginLogo: logo, isCustomLogo }}
    >
      <BrowserTabBranding />
      {children}
    </LogoContext.Provider>
  );
}

/** Keeps the browser tab title aligned with the primary brand name. */
function BrowserTabBranding() {
  const [appName, setAppName] = useState("");
  const initialTitleRef = useRef(document.title);

  useEffect(() => {
    System.fetchCustomAppName().then(({ appName }) =>
      setAppName(appName || "")
    );
    const handleNameUpdate = (event) => setAppName(event.detail?.appName || "");
    window.addEventListener(CUSTOM_APP_NAME_UPDATED_EVENT, handleNameUpdate);
    return () =>
      window.removeEventListener(
        CUSTOM_APP_NAME_UPDATED_EVENT,
        handleNameUpdate
      );
  }, []);

  useEffect(() => {
    document.title = appName || initialTitleRef.current;
  }, [appName]);

  return null;
}

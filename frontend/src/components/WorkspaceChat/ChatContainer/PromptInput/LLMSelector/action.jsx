import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Brain, CheckCircle } from "@phosphor-icons/react";
import LLMSelectorModal from "./index";
import { useRef, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import useUser from "@/hooks/useUser";
import { useModal } from "@/hooks/useModal";
import SetupProvider from "./SetupProvider";
import { WORKSPACE_PERMISSIONS as WS, workspaceCan } from "@/utils/permissions";

export const TOGGLE_LLM_SELECTOR_EVENT = "toggle_llm_selector";
export const SAVE_LLM_SELECTOR_EVENT = "save_llm_selector";
export const PROVIDER_SETUP_EVENT = "provider_setup_requested";

export default function LLMSelectorAction({ workspaceSlug = null }) {
  const { slug: urlSlug } = useParams();
  const slug = urlSlug ?? workspaceSlug;
  const tooltipRef = useRef(null);
  const { user } = useUser();
  const [saved, setSaved] = useState(false);
  const {
    isOpen: isSetupProviderOpen,
    openModal: openSetupProviderModal,
    closeModal: closeSetupProviderModal,
  } = useModal();
  const [config, setConfig] = useState({
    settings: {},
    provider: null,
  });

  function toggleLLMSelectorTooltip() {
    if (!tooltipRef.current) return;
    tooltipRef.current.isOpen
      ? tooltipRef.current.close()
      : tooltipRef.current.open();
  }

  function handleSaveLLMSelector() {
    if (!tooltipRef.current) return;
    tooltipRef.current.close();
    setSaved(true);
  }

  useEffect(() => {
    window.addEventListener(
      TOGGLE_LLM_SELECTOR_EVENT,
      toggleLLMSelectorTooltip
    );
    window.addEventListener(SAVE_LLM_SELECTOR_EVENT, handleSaveLLMSelector);
    return () => {
      window.removeEventListener(
        TOGGLE_LLM_SELECTOR_EVENT,
        toggleLLMSelectorTooltip
      );
      window.removeEventListener(
        SAVE_LLM_SELECTOR_EVENT,
        handleSaveLLMSelector
      );
    };
  }, []);

  useEffect(() => {
    if (!saved) return;
    setTimeout(() => {
      setSaved(false);
    }, 1500);
  }, [saved]);

  useEffect(() => {
    function handleProviderSetupEvent(e) {
      const { provider, settings } = e.detail;
      setConfig({
        settings,
        provider,
      });
      setTimeout(() => {
        openSetupProviderModal();
      }, 300);
    }

    window.addEventListener(PROVIDER_SETUP_EVENT, handleProviderSetupEvent);
    return () =>
      window.removeEventListener(
        PROVIDER_SETUP_EVENT,
        handleProviderSetupEvent
      );
  }, []);

  // This feature is disabled for multi-user instances where the user is not an admin
  // This is because of the limitations of model selection currently and other nuances in controls.
  if (!workspaceCan(WS.SETTINGS_MANAGE, slug, user)) return null;
  if (!slug) return null;

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            id="llm-selector-btn"
            aria-label="LLM Selector"
            className={`border-none relative flex justify-center items-center opacity-60 hover:opacity-100 light:opacity-100 light:hover:opacity-60 cursor-pointer`}
          >
            {saved ? (
              <CheckCircle className="w-[20px] h-[20px] pointer-events-none text-green-400" />
            ) : (
              <Brain className="w-[20px] h-[20px] pointer-events-none text-[var(--theme-sidebar-footer-icon-fill)]" />
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[250px] text-xs">
          <LLMSelectorModal tooltipRef={tooltipRef} workspaceSlug={slug} />
        </TooltipContent>
      </Tooltip>

      <SetupProvider
        isOpen={isSetupProviderOpen}
        closeModal={closeSetupProviderModal}
        postSubmit={() => closeSetupProviderModal()}
        settings={config.settings}
        llmProvider={config.provider}
      />
    </>
  );
}

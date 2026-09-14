import { useCallback, useRef, useState } from "react";

export default function useContextualSaveBars() {
  const [saveBars, setSaveBars] = useState({});
  const saveBarActions = useRef({});

  const registerSaveBar = useCallback((id, { showing, saving, actions }) => {
    saveBarActions.current[id] = actions;
    setSaveBars((current) => ({ ...current, [id]: { showing, saving } }));
    return () => {
      if (saveBarActions.current[id] === actions)
        delete saveBarActions.current[id];
      setSaveBars((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
    };
  }, []);

  return { saveBars, saveBarActions, registerSaveBar };
}

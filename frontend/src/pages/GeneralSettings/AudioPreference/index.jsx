import React, { useEffect, useState } from "react";
import { PaneLayout } from "@/components/layout/SettingsLayout";
import { SpinnerBlock } from "@/components/ui/spinner";
import System from "@/models/system";
import SpeechToTextProvider from "./stt";
import TextToSpeechProvider from "./tts";

export default function AudioPreference() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchKeys() {
      const _settings = await System.keys();
      setSettings(_settings);
      setLoading(false);
    }
    fetchKeys();
  }, []);

  return (
    <PaneLayout>
      {loading ? (
        <SpinnerBlock className="h-full" />
      ) : (
        <>
          <SpeechToTextProvider settings={settings} />
          <TextToSpeechProvider settings={settings} />
        </>
      )}
    </PaneLayout>
  );
}

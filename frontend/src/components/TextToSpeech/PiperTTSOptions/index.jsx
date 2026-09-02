import { useTranslation } from "react-i18next";
import { useState, useEffect, useRef } from "react";
import { Spinner } from "@/components/ui/spinner";
import PiperTTSClient from "@/utils/piperTTS";
import { titleCase } from "text-case";
import { humanFileSize } from "@/utils/numbers";
import showToast from "@/utils/toast";
import { CirclePause, CirclePlay } from "lucide-react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function PiperTTSOptions({ settings }) {
  const { t } = useTranslation();
  return (
    <>
      <p className="text-sm/60 font-base text-theme-text-primary mb-4">
        {t("help.piper-ttsoptions")}
      </p>
      <div className="flex gap-x-4 items-center">
        <PiperTTSModelSelection settings={settings} />
      </div>
    </>
  );
}

function voicesByLanguage(voices = []) {
  const voicesByLanguage = voices.reduce((acc, voice) => {
    const langName = voice?.language?.name_english ?? "Unlisted";
    acc[langName] = acc[langName] || [];
    acc[langName].push(voice);
    return acc;
  }, {});
  return Object.entries(voicesByLanguage);
}

function voiceDisplayName(voice) {
  const { is_stored, name, quality, files } = voice;
  const onnxFileKey = Object.keys(files).find((key) => key.endsWith(".onnx"));
  const fileSize = files?.[onnxFileKey]?.size_bytes || 0;
  return `${is_stored ? "✔ " : ""}${titleCase(name)}-${quality === "low" ? "Low" : "HQ"} (${humanFileSize(fileSize)})`;
}

function PiperTTSModelSelection({ settings }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [voices, setVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState(
    settings?.TTSPiperTTSVoiceModel
  );

  function flushVoices() {
    PiperTTSClient.flush()
      .then(() =>
        showToast("All voices flushed from browser storage", "info", {
          clear: true,
        })
      )
      .catch((e) => console.error(e));
  }

  useEffect(() => {
    PiperTTSClient.voices()
      .then((voices) => {
        if (voices?.length !== 0) return setVoices(voices);
        throw new Error("Could not fetch voices from web worker.");
      })
      .catch((e) => {
        console.error(e);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col w-60">
        <Label className="block mb-3">
          {t("provider-options.voice-model-selection")}
        </Label>
        <Select name="TTSPiperTTSVoiceModel" value="" disabled={true}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder={t("provider-options.loading-models")} />
          </SelectTrigger>
          <SelectContent />
        </Select>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-fit">
      <div className="flex flex-col w-60">
        <Label className="block mb-3">
          {t("provider-options.voice-model-selection")}
        </Label>
        <div className="flex items-center w-fit gap-x-4 mb-2">
          <Select
            name="TTSPiperTTSVoiceModel"
            required={true}
            onValueChange={setSelectedVoice}
            value={selectedVoice}
          >
            <SelectTrigger className="border-none shrink-0 bg-theme-settings-input-bg border-gray-500 text-theme-text-primary text-sm rounded-lg w-full p-2.5">
              <SelectValue placeholder={t("provider-options.select-option")} />
            </SelectTrigger>
            <SelectContent>
              {voicesByLanguage(voices).map(([lang, voices]) => {
                return (
                  <SelectGroup key={lang}>
                    <SelectLabel>{lang}</SelectLabel>
                    {voices.map((voice) => (
                      <SelectItem key={voice.key} value={voice.key}>
                        {voiceDisplayName(voice)}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                );
              })}
            </SelectContent>
          </Select>
          <DemoVoiceSample voiceId={selectedVoice} />
        </div>
        <p className="text-xs text-white/40">{t("help.piper-ttsoptions-2")}</p>
      </div>
      {!!voices.find((voice) => voice.is_stored) && (
        <button
          type="button"
          onClick={flushVoices}
          className="w-fit border-none hover:text-white hover:underline text-white/40 text-sm my-4"
        >
          Flush voice cache
        </button>
      )}
    </div>
  );
}

function DemoVoiceSample({ voiceId }) {
  const playerRef = useRef(null);
  const [speaking, setSpeaking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [audioSrc, setAudioSrc] = useState(null);

  async function speakMessage(e) {
    e.preventDefault();
    if (speaking) {
      playerRef?.current?.pause();
      return;
    }

    try {
      if (!audioSrc) {
        setLoading(true);
        const client = new PiperTTSClient({ voiceId });
        const blobUrl = await client.getAudioBlobForText(
          "Hello, welcome to NexusAI!"
        );
        setAudioSrc(blobUrl);
        setLoading(false);
        client.worker?.terminate();
        PiperTTSClient._instance = null;
      } else {
        playerRef.current.play();
      }
    } catch (e) {
      console.error(e);
      setLoading(false);
      setSpeaking(false);
    }
  }

  useEffect(() => {
    function setupPlayer() {
      if (!playerRef?.current) return;
      playerRef.current.addEventListener("play", () => {
        setSpeaking(true);
      });

      playerRef.current.addEventListener("pause", () => {
        playerRef.current.currentTime = 0;
        setSpeaking(false);
        setAudioSrc(null);
      });
    }
    setupPlayer();
  }, []);

  return (
    <button
      type="button"
      onClick={speakMessage}
      disabled={loading}
      className="border-none text-zinc-300 flex items-center gap-x-1"
    >
      {speaking ? (
        <>
          <CirclePause size={20} className="shrink-0" />
          <p className="text-sm shrink-0">Stop demo</p>
        </>
      ) : (
        <>
          {loading ? (
            <>
              <Spinner className="shrink-0" />
              <p className="text-sm shrink-0">Loading voice</p>
            </>
          ) : (
            <>
              <CirclePlay
                size={20}
                className="shrink-0 text-theme-text-primary"
              />
              <p className="text-theme-text-primary text-sm shrink-0">
                Play sample
              </p>
            </>
          )}
        </>
      )}
      <audio
        ref={playerRef}
        hidden={true}
        src={audioSrc}
        autoPlay={true}
        controls={false}
      />
    </button>
  );
}

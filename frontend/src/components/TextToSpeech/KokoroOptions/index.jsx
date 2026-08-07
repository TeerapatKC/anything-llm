import { useEffect, useState } from "react";
import System from "@/models/system";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function KokoroTTSOptions({ settings }) {
  const [endpoint, setEndpoint] = useState(
    settings?.TTSKokoroEndpoint || "http://localhost:8880/v1"
  );
  const [inputEndpoint, setInputEndpoint] = useState(endpoint);
  const [apiKey, setApiKey] = useState(settings?.TTSKokoroKey);
  const [inputApiKey, setInputApiKey] = useState(apiKey);

  return (
    <div className="w-full flex flex-col gap-y-7">
      <p className="text-sm font-base text-white text-opacity-60">
        Connect to a self-hosted{" "}
        <a
          href="https://github.com/remsky/Kokoro-FastAPI"
          target="_blank"
          rel="noreferrer"
          className="underline"
        >
          kokoro-fastapi
        </a>{" "}
        server. The voice list is pulled live from your server.
      </p>
      <div className="flex gap-x-4">
        <div className="flex flex-col w-60">
          <Label variant="settings" className="block mb-2">
            Base URL
          </Label>
          <Input
            variant="settings"
            type="url"
            name="TTSKokoroEndpoint"
            placeholder="http://localhost:8880/v1"
            defaultValue={settings?.TTSKokoroEndpoint}
            required={true}
            autoComplete="off"
            spellCheck={false}
            onChange={(e) => setInputEndpoint(e.target.value)}
            onBlur={() => setEndpoint(inputEndpoint)}
          />
          <p className="text-xs leading-[18px] font-base text-white text-opacity-60 mt-2">
            The OpenAI-compatible base URL of your kokoro-fastapi server.
          </p>
        </div>
        <div className="flex flex-col w-60">
          <Label variant="settings" className="block mb-2">
            API Key
          </Label>
          <Input
            variant="settings"
            type="password"
            name="TTSKokoroKey"
            placeholder="Optional API Key"
            defaultValue={settings?.TTSKokoroKey ? "*".repeat(20) : ""}
            autoComplete="off"
            spellCheck={false}
            onChange={(e) => setInputApiKey(e.target.value)}
            onBlur={() => setApiKey(inputApiKey)}
          />
          <p className="text-xs leading-[18px] font-base text-white text-opacity-60 mt-2">
            Optional — only required if you front your Kokoro server with auth.
          </p>
        </div>
      </div>
      <div className="flex gap-x-4">
        <KokoroVoiceSelection
          settings={settings}
          endpoint={endpoint}
          apiKey={apiKey}
        />
      </div>
    </div>
  );
}

function KokoroVoiceSelection({ settings, endpoint, apiKey = null }) {
  const [voices, setVoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function findVoices() {
      if (!endpoint) {
        setVoices([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const { models } = await System.customModels(
          "kokoro-tts",
          apiKey,
          endpoint
        );
        setVoices(models || []);
      } catch {
        setVoices([]);
      } finally {
        setLoading(false);
      }
    }
    findVoices();
  }, [endpoint, apiKey]);

  if (loading) {
    return (
      <div className="flex flex-col w-60">
        <Label variant="settings" className="block mb-3">
          Voice Model
        </Label>
        <Select name="TTSKokoroVoiceModel" disabled={true}>
          <SelectTrigger variant="settings">
            <SelectValue placeholder="-- loading available voices --" />
          </SelectTrigger>
          <SelectContent />
        </Select>
      </div>
    );
  }

  if (voices.length === 0) {
    return (
      <div className="flex flex-col w-60">
        <Label variant="settings" className="block mb-3">
          Voice Model
        </Label>
        <Input
          variant="settings"
          type="text"
          name="TTSKokoroVoiceModel"
          placeholder="af_bella"
          defaultValue={settings?.TTSKokoroVoiceModel ?? "af_bella"}
          required={true}
          autoComplete="off"
          spellCheck={false}
        />
        <p className="text-xs leading-[18px] font-base text-white text-opacity-60 mt-2">
          Could not reach the Kokoro server to load voices. Enter a voice id
          manually.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-60">
      <Label variant="settings" className="block mb-3">
        Voice Model
      </Label>
      <Select
        name="TTSKokoroVoiceModel"
        required={true}
        defaultValue={settings?.TTSKokoroVoiceModel ?? "af_bella"}
      >
        <SelectTrigger variant="settings">
          <SelectValue placeholder="Select an option" />
        </SelectTrigger>
        <SelectContent>
          {voices.map((voice) => (
            <SelectItem key={voice.id} value={voice.id}>
              {voice.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

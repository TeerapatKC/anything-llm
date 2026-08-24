import { useEffect, useState } from "react";
import System from "@/models/system";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function GenericOpenAiSpeechToTextOptions({ settings }) {
  const [endpoint, setEndpoint] = useState(
    settings?.STTOpenAICompatibleEndpoint || ""
  );
  const [inputEndpoint, setInputEndpoint] = useState(endpoint);
  // The saved key is reported as a boolean by the server - keep it null so the
  // model listing falls back to the key already stored on the backend.
  const [apiKey, setApiKey] = useState(null);
  const [inputApiKey, setInputApiKey] = useState(null);

  return (
    <div className="w-full flex flex-col gap-y-7">
      <div className="flex gap-x-4">
        <div className="flex flex-col w-60">
          <Label className="block mb-2">Base URL</Label>
          <Input
            type="url"
            name="STTOpenAICompatibleEndpoint"
            placeholder="http://localhost:8000/v1"
            defaultValue={settings?.STTOpenAICompatibleEndpoint}
            required={true}
            autoComplete="off"
            spellCheck={false}
            onChange={(e) => setInputEndpoint(e.target.value)}
            onBlur={() => setEndpoint(inputEndpoint)}
          />
          <p className="text-xs/60 leading-[18px] font-base text-theme-text-primary mt-2">
            This should be the base URL of the OpenAI compatible STT service you
            will transcribe audio with.
          </p>
        </div>
        <div className="flex flex-col w-60">
          <Label className="block mb-2">API Key</Label>
          <Input
            type="password"
            name="STTOpenAICompatibleKey"
            placeholder="API Key"
            defaultValue={
              settings?.STTOpenAICompatibleKey ? "*".repeat(20) : ""
            }
            autoComplete="new-password"
            spellCheck={false}
            onChange={(e) => setInputApiKey(e.target.value)}
            onBlur={() => setApiKey(inputApiKey)}
          />
          <p className="text-xs/60 leading-[18px] font-base text-theme-text-primary mt-2">
            Some STT services require an API key to transcribe audio - this is
            optional if your service does not require one.
          </p>
        </div>
        <STTModelSelection
          settings={settings}
          endpoint={endpoint}
          apiKey={apiKey}
        />
      </div>
    </div>
  );
}

function STTModelSelection({ settings, endpoint, apiKey = null }) {
  const [customModels, setCustomModels] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function findCustomModels() {
      if (!endpoint) {
        setCustomModels([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const { models } = await System.customModels(
          "generic-openai-stt",
          apiKey,
          endpoint
        );
        setCustomModels(models || []);
      } catch (error) {
        console.error("Failed to fetch STT models:", error);
        setCustomModels([]);
      }
      setLoading(false);
    }
    findCustomModels();
  }, [endpoint, apiKey]);

  if (loading) {
    return (
      <div className="flex flex-col w-60">
        <Label className="block mb-2">Transcription Model</Label>
        {/*
          Keyed apart from the loaded select below so Base UI's `useControlled`
          does not lock this instance into uncontrolled mode - see the same note
          in components/LLMSelection/GenericOpenAiOptions.
        */}
        <Select
          key="stt-openai-compatible-model-loading"
          name="STTOpenAICompatibleModel"
          disabled={true}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="--loading available models--" />
          </SelectTrigger>
          <SelectContent />
        </Select>
      </div>
    );
  }

  const savedModel = settings?.STTOpenAICompatibleModel || "";
  const savedModelInList =
    !!savedModel && customModels.some((model) => model.id === savedModel);

  // Nothing was returned (many self-hosted servers do not implement `/models`)
  // or the saved model is not in the list - let the model be typed by hand.
  if (customModels.length === 0 || (savedModel && !savedModelInList)) {
    return (
      <div className="flex flex-col w-60">
        <Label className="block mb-2">Transcription Model</Label>
        <Input
          type="text"
          name="STTOpenAICompatibleModel"
          placeholder="Your STT model identifier"
          defaultValue={savedModel}
          required={true}
          autoComplete="off"
          spellCheck={false}
        />
        <p className="text-xs/60 leading-[18px] font-base text-theme-text-primary mt-2">
          The <code>model</code> parameter passed to the transcription endpoint
          (e.g. <code>whisper-1</code>).
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-60">
      <Label className="block mb-2">Transcription Model</Label>
      <Select
        key="stt-openai-compatible-model-loaded"
        name="STTOpenAICompatibleModel"
        required={true}
        defaultValue={savedModel || customModels[0]?.id}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select a model" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Available models</SelectLabel>
            {customModels.map((model) => (
              <SelectItem key={model.id} value={model.id}>
                {model.id}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      <p className="text-xs/60 leading-[18px] font-base text-theme-text-primary mt-2">
        The <code>model</code> parameter passed to the transcription endpoint
        (e.g. <code>whisper-1</code>).
      </p>
    </div>
  );
}

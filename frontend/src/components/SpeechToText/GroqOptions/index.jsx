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

export default function GroqSpeechToTextOptions({ settings }) {
  const [inputValue, setInputValue] = useState(settings?.STTGroqApiKey);
  const [groqApiKey, setGroqApiKey] = useState(settings?.STTGroqApiKey);

  return (
    <div className="flex gap-x-4">
      <div className="flex flex-col w-60">
        <Label className="block mb-3">API Key</Label>
        <Input
          type="password"
          name="STTGroqApiKey"
          placeholder="Groq API Key"
          defaultValue={settings?.STTGroqApiKey ? "*".repeat(20) : ""}
          required={true}
          autoComplete="new-password"
          spellCheck={false}
          onChange={(e) => setInputValue(e.target.value)}
          onBlur={() => setGroqApiKey(inputValue)}
        />
      </div>
      <GroqSttModelSelection apiKey={groqApiKey} settings={settings} />
    </div>
  );
}

function GroqSttModelSelection({ apiKey, settings }) {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function findModels() {
      setLoading(true);
      const { models } = await System.customModels(
        "groq-stt",
        typeof apiKey === "boolean" ? null : apiKey
      );
      setModels(models || []);
      setLoading(false);
    }
    findModels();
  }, [apiKey]);

  if (loading) {
    return (
      <div className="flex flex-col w-60">
        <Label className="block mb-3">Transcription Model</Label>
        <Select name="STTGroqModel" disabled={true}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="-- loading available models --" />
          </SelectTrigger>
          <SelectContent />
        </Select>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-60">
      <Label className="block mb-3">Transcription Model</Label>
      <Select
        name="STTGroqModel"
        required={true}
        defaultValue={settings?.STTGroqModel ?? "whisper-large-v3-turbo"}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select an option" />
        </SelectTrigger>
        <SelectContent>
          {models.map((model) => (
            <SelectItem key={model.id} value={model.id}>
              {model.id}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

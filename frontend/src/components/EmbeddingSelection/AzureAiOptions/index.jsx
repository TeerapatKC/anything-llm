import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
export default function AzureAiOptions({ settings }) {
  return (
    <div className="w-full flex flex-col gap-y-4">
      <div className="w-full flex items-center gap-[36px] mt-1.5">
        <div className="flex flex-col w-60">
          <Label className="block mb-3">Azure Service Endpoint</Label>
          <Input
            type="url"
            name="AzureOpenAiEndpoint"
            placeholder="https://my-azure.openai.azure.com"
            defaultValue={settings?.AzureOpenAiEndpoint}
            required={true}
            autoComplete="off"
            spellCheck={false}
          />
        </div>

        <div className="flex flex-col w-60">
          <Label className="block mb-3">API Key</Label>
          <Input
            type="password"
            name="AzureOpenAiKey"
            placeholder="Azure OpenAI API Key"
            defaultValue={settings?.AzureOpenAiKey ? "*".repeat(20) : ""}
            required={true}
            autoComplete="new-password"
            spellCheck={false}
          />
        </div>

        <div className="flex flex-col w-60">
          <Label className="block mb-3">Embedding Deployment Name</Label>
          <Input
            type="text"
            name="AzureOpenAiEmbeddingModelPref"
            placeholder="Azure OpenAI embedding model deployment name"
            defaultValue={settings?.AzureOpenAiEmbeddingModelPref}
            required={true}
            autoComplete="off"
            spellCheck={false}
          />
        </div>
      </div>
    </div>
  );
}

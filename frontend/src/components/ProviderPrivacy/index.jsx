import { useState, useEffect } from "react";
import System from "@/models/system";
import { PROVIDER_PRIVACY_MAP } from "./constants";
import { BrainCircuit, Database, SquareArrowOutUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import { titleCase, sentenceCase } from "text-case";

function defaultProvider(providerString) {
  // Nothing chosen yet is a normal state during setup - onboarding no longer asks for an
  // LLM - so say so, rather than reporting the policy of a provider called "undefined".
  if (!providerString)
    return {
      name: "Not configured",
      description: [
        "The active service has not been reported by the server yet.",
      ],
      icon: "database",
    };

  return {
    name: titleCase(sentenceCase(String(providerString))),
    description: [
      "Data is processed by the configured service. Check where this endpoint runs and its retention policy before sending sensitive content.",
    ],
    icon: "database",
  };
}

export default function ProviderPrivacy() {
  const [loading, setLoading] = useState(true);
  const [providers, setProviders] = useState({
    llmProvider: null,
    embeddingEngine: null,
    vectorDb: null,
  });

  useEffect(() => {
    async function fetchProviders() {
      const _settings = await System.keys();
      const providerDefinition =
        PROVIDER_PRIVACY_MAP.llm[_settings?.LLMProvider] ||
        defaultProvider(_settings?.LLMProvider);
      const embeddingEngineDefinition =
        PROVIDER_PRIVACY_MAP.embeddingEngine[_settings?.EmbeddingEngine] ||
        defaultProvider(_settings?.EmbeddingEngine);
      const vectorDbDefinition =
        PROVIDER_PRIVACY_MAP.vectorDb[_settings?.VectorDB] ||
        defaultProvider(_settings?.VectorDB);

      setProviders({
        llmProvider: providerDefinition,
        embeddingEngine: embeddingEngineDefinition,
        vectorDb: vectorDbDefinition,
      });
      setLoading(false);
    }
    fetchProviders();
  }, []);

  if (loading) return null;
  return (
    <div className="flex flex-col gap-8 w-full max-w-4xl">
      <section className="rounded-xl border border-theme-sidebar-border bg-theme-bg-secondary p-5 text-theme-text-secondary">
        <h2 className="mb-2 text-base font-semibold text-theme-text-primary">
          What is saved on this server
        </h2>
        <p className="text-sm leading-6">
          Chat messages and responses are saved in the application database so
          conversations can be reopened. Uploaded and collected documents are
          processed into text and kept in server storage. When a document is
          added to a workspace, its text is split into excerpts, converted into
          embeddings, and indexed in the selected vector database for search.
          The configured model receives the chat content and document context
          needed to answer each request.
        </p>
      </section>
      <ProviderPrivacyItem
        title="Chat model"
        provider={providers.llmProvider}
        altText="LLM Logo"
      />
      <ProviderPrivacyItem
        title="Embedding model"
        provider={providers.embeddingEngine}
        altText="Embedding Logo"
      />
      <ProviderPrivacyItem
        title="Vector database"
        provider={providers.vectorDb}
        altText="Vector DB Logo"
      />
    </div>
  );
}

function ProviderPrivacyItem({ title, provider, altText }) {
  return (
    <div className="flex flex-col items-start gap-y-3 pb-4 border-b border-theme-sidebar-border">
      <div className="text-theme-text-primary text-base font-bold">{title}</div>
      <div className="flex items-start gap-3">
        {provider.logo ? (
          <img
            src={provider.logo}
            alt={altText}
            className="w-8 h-8 rounded shrink-0 mt-0.5 object-contain"
          />
        ) : (
          <span
            className="flex size-8 shrink-0 items-center justify-center rounded bg-theme-bg-secondary text-theme-text-secondary"
            aria-hidden="true"
          >
            {provider.icon === "brain" ? (
              <BrainCircuit className="size-5" />
            ) : (
              <Database className="size-5" />
            )}
          </span>
        )}
        <div className="flex flex-col gap-2 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-theme-text-primary text-sm font-semibold">
              {provider.name}
            </span>
          </div>
          {provider.description?.map((desc, idx) => (
            <p
              key={idx}
              className="text-theme-text-secondary text-sm leading-6"
            >
              {desc}
            </p>
          ))}
          {provider.policyUrl && (
            <Link
              className="text-theme-text-secondary hover:text-theme-text-primary text-sm font-medium underline transition-colors inline-flex items-center gap-1"
              to={provider.policyUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Service privacy policy
              <SquareArrowOutUpRight size={12} />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

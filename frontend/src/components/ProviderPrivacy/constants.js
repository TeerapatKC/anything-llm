import GenericOpenAiLogo from "@/media/llmprovider/generic-openai.png";
import ZillizLogo from "@/media/vectordbs/zilliz.png";
import AstraDBLogo from "@/media/vectordbs/astraDB.png";
import ChromaLogo from "@/media/vectordbs/chroma.png";
import PineconeLogo from "@/media/vectordbs/pinecone.png";
import LanceDbLogo from "@/media/vectordbs/lancedb.png";
import WeaviateLogo from "@/media/vectordbs/weaviate.png";
import QDrantLogo from "@/media/vectordbs/qdrant.png";
import MilvusLogo from "@/media/vectordbs/milvus.png";
import PGVectorLogo from "@/media/vectordbs/pgvector.png";

const LLM_PROVIDER_PRIVACY_MAP = {
  "generic-openai": {
    name: "OpenAI-compatible endpoint",
    description: [
      "When you chat, your message, relevant conversation history, and any document context used for the answer are sent to the configured endpoint. It may run locally or on another server; that service controls any copies it retains.",
    ],
    logo: GenericOpenAiLogo,
  },
};
const VECTOR_DB_PROVIDER_PRIVACY_MAP = {
  pgvector: {
    name: "PGVector",
    description: [
      "Document excerpts and their embeddings are saved in the configured PostgreSQL database for workspace search. Where that database runs determines where this indexed data is stored.",
    ],
    logo: PGVectorLogo,
  },
  chroma: {
    name: "Chroma",
    description: [
      "Document excerpts and their embeddings are saved in the configured Chroma database for workspace search. Where that database runs determines where this indexed data is stored.",
    ],
    logo: ChromaLogo,
  },
  chromacloud: {
    name: "Chroma Cloud",
    description: [
      "Indexed document excerpts and embeddings are sent to Chroma Cloud and stored there for search.",
    ],
    policyUrl: "https://www.trychroma.com/privacy",
    logo: ChromaLogo,
  },
  pinecone: {
    name: "Pinecone",
    description: [
      "Indexed document excerpts and embeddings are sent to Pinecone and stored there for search.",
    ],
    policyUrl: "https://www.pinecone.io/privacy/",
    logo: PineconeLogo,
  },
  qdrant: {
    name: "Qdrant",
    description: [
      "Indexed document excerpts and embeddings are stored in the configured Qdrant database for search. This may be a local or remote service.",
    ],
    policyUrl: "https://qdrant.tech/legal/privacy-policy/",
    logo: QDrantLogo,
  },
  weaviate: {
    name: "Weaviate",
    description: [
      "Indexed document excerpts and embeddings are stored in the configured Weaviate database for search. This may be a local or remote service.",
    ],
    policyUrl: "https://weaviate.io/privacy",
    logo: WeaviateLogo,
  },
  milvus: {
    name: "Milvus",
    description: [
      "Indexed document excerpts and embeddings are stored in the configured Milvus database for search. This may be a self-hosted or cloud service.",
    ],
    logo: MilvusLogo,
  },
  zilliz: {
    name: "Zilliz Cloud",
    description: [
      "Indexed document excerpts and embeddings are sent to Zilliz Cloud and stored there for search.",
    ],
    policyUrl: "https://zilliz.com/privacy-policy",
    logo: ZillizLogo,
  },
  astra: {
    name: "AstraDB",
    description: [
      "Indexed document excerpts and embeddings are sent to the configured AstraDB database and stored there for search.",
    ],
    policyUrl: "https://www.ibm.com/us-en/privacy",
    logo: AstraDBLogo,
  },
  lancedb: {
    name: "LanceDB",
    description: [
      "Document excerpts and their embeddings are stored in the LanceDB files on this server for workspace search. The source documents remain in the server's document storage.",
    ],
    logo: LanceDbLogo,
  },
};

const EMBEDDING_ENGINE_PROVIDER_PRIVACY_MAP = {
  native: {
    name: "Built-in (multilingual-e5-small)",
    description: [
      "Document excerpts and search queries are converted into embeddings on this server. The text is not sent to an external embedding endpoint.",
    ],
    icon: "brain",
  },
  "generic-openai": {
    name: "OpenAI-compatible endpoint",
    description: [
      "Document excerpts and search queries are sent to the configured endpoint to generate embeddings. The endpoint may run locally or remotely; a remote service may retain what it receives under its own policy.",
    ],
    logo: GenericOpenAiLogo,
  },
};

export const PROVIDER_PRIVACY_MAP = {
  llm: LLM_PROVIDER_PRIVACY_MAP,
  embeddingEngine: EMBEDDING_ENGINE_PROVIDER_PRIVACY_MAP,
  vectorDb: VECTOR_DB_PROVIDER_PRIVACY_MAP,
};

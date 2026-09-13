import NexusAIIcon from "@/media/logo/nexus-ai-icon.png";
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
    name: "Generic OpenAI compatible service",
    description: [
      "Chats and prompts are sent to the OpenAI-compatible service configured for this instance.",
    ],
    logo: GenericOpenAiLogo,
  },
};
const VECTOR_DB_PROVIDER_PRIVACY_MAP = {
  pgvector: {
    name: "PGVector",
    description: [
      "Your vectors and document text are stored on your PostgreSQL instance.",
      "Access to your instance is managed by you.",
    ],
    logo: PGVectorLogo,
  },
  chroma: {
    name: "Chroma",
    description: [
      "Your vectors and document text are stored on your Chroma instance.",
      "Access to your instance is managed by you.",
    ],
    logo: ChromaLogo,
  },
  chromacloud: {
    name: "Chroma Cloud",
    policyUrl: "https://www.trychroma.com/privacy",
    logo: ChromaLogo,
  },
  pinecone: {
    name: "Pinecone",
    policyUrl: "https://www.pinecone.io/privacy/",
    logo: PineconeLogo,
  },
  qdrant: {
    name: "Qdrant",
    policyUrl: "https://qdrant.tech/legal/privacy-policy/",
    logo: QDrantLogo,
  },
  weaviate: {
    name: "Weaviate",
    policyUrl: "https://weaviate.io/privacy",
    logo: WeaviateLogo,
  },
  milvus: {
    name: "Milvus",
    description: [
      "Your vectors and document text are stored on your Milvus instance (cloud or self-hosted).",
    ],
    logo: MilvusLogo,
  },
  zilliz: {
    name: "Zilliz Cloud",
    policyUrl: "https://zilliz.com/privacy-policy",
    logo: ZillizLogo,
  },
  astra: {
    name: "AstraDB",
    policyUrl: "https://www.ibm.com/us-en/privacy",
    logo: AstraDBLogo,
  },
  lancedb: {
    name: "LanceDB",
    description: [
      "Your vectors and document text are stored privately on this instance of Nexus AI.",
    ],
    logo: LanceDbLogo,
  },
};

const EMBEDDING_ENGINE_PROVIDER_PRIVACY_MAP = {
  native: {
    name: "Nexus AI Built-in (multilingual-e5-small)",
    description: [
      "Your document text is embedded privately on this instance of Nexus AI.",
    ],
    logo: NexusAIIcon,
  },
  "generic-openai": {
    name: "Generic OpenAI compatible service",
    description: [
      "Data is shared according to the terms of service applicable with your generic endpoint provider.",
    ],
    logo: GenericOpenAiLogo,
  },
};

export const PROVIDER_PRIVACY_MAP = {
  llm: LLM_PROVIDER_PRIVACY_MAP,
  embeddingEngine: EMBEDDING_ENGINE_PROVIDER_PRIVACY_MAP,
  vectorDb: VECTOR_DB_PROVIDER_PRIVACY_MAP,
};

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Database } from "lucide-react";
import SettingsLayout from "@/components/layout/SettingsLayout";
import PageHeader from "@/components/layout/PageHeader";
import { SpinnerBlock } from "@/components/ui/spinner";
import System from "@/models/system";

import LanceDbLogo from "@/media/vectordbs/lancedb.png";
import ChromaLogo from "@/media/vectordbs/chroma.png";
import PineconeLogo from "@/media/vectordbs/pinecone.png";
import WeaviateLogo from "@/media/vectordbs/weaviate.png";
import QDrantLogo from "@/media/vectordbs/qdrant.png";
import MilvusLogo from "@/media/vectordbs/milvus.png";
import ZillizLogo from "@/media/vectordbs/zilliz.png";
import AstraDBLogo from "@/media/vectordbs/astraDB.png";
import PGVectorLogo from "@/media/vectordbs/pgvector.png";

const VECTOR_DBS = {
  lancedb: {
    name: "LanceDB",
    logo: LanceDbLogo,
    description: "A local vector database running on this server.",
  },
  pgvector: {
    name: "PGVector",
    logo: PGVectorLogo,
    description: "Vector search powered by PostgreSQL.",
  },
  chroma: {
    name: "Chroma",
    logo: ChromaLogo,
    description: "An open source vector database.",
  },
  chromacloud: {
    name: "Chroma Cloud",
    logo: ChromaLogo,
    description: "A managed Chroma database.",
  },
  pinecone: {
    name: "Pinecone",
    logo: PineconeLogo,
    description: "A managed vector database.",
  },
  zilliz: {
    name: "Zilliz Cloud",
    logo: ZillizLogo,
    description: "A managed Milvus database.",
  },
  qdrant: {
    name: "Qdrant",
    logo: QDrantLogo,
    description: "A local or distributed vector database.",
  },
  weaviate: {
    name: "Weaviate",
    logo: WeaviateLogo,
    description: "A local or cloud vector database.",
  },
  milvus: {
    name: "Milvus",
    logo: MilvusLogo,
    description: "A scalable vector database.",
  },
  astra: {
    name: "Astra DB",
    logo: AstraDBLogo,
    description: "A managed vector database.",
  },
};

export default function GeneralVectorDatabase() {
  const { t } = useTranslation();
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    System.keys().then((current) => setSettings(current ?? {}));
  }, []);

  const providerId = settings?.VectorDB || "lancedb";
  const provider = VECTOR_DBS[providerId] || { name: providerId };

  return (
    <SettingsLayout>
      {!settings ? (
        <SpinnerBlock className="min-h-[60vh]" />
      ) : (
        <div className="flex w-full flex-col">
          <PageHeader
            title={t("vector.title")}
            description={t("vector.description")}
          />
          <div className="mt-6 max-w-4xl">
            <h2 className="text-base font-semibold text-theme-text-primary">
              {t("vector.provider.title")}
            </h2>
            <p className="mt-1 text-sm text-theme-text-secondary">
              {t("vector.provider.description")}
            </p>
            <div className="mt-5 rounded-xl border border-theme-modal-border bg-theme-bg-secondary p-4 sm:p-5">
              <div className="flex flex-wrap items-center gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-white p-1.5">
                  {provider.logo ? (
                    <img
                      src={provider.logo}
                      alt=""
                      className="size-full object-contain"
                    />
                  ) : (
                    <Database size={27} className="text-theme-text-secondary" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="break-all font-semibold text-theme-text-primary">
                    {provider.name}
                  </p>
                  {provider.description && (
                    <p className="mt-0.5 text-sm text-theme-text-secondary">
                      {provider.description}
                    </p>
                  )}
                </div>
                <span className="rounded-full border border-primary-button px-2.5 py-1 text-xs font-semibold text-primary-button">
                  {t("vector.active")}
                </span>
              </div>
              <div className="mt-5 border-t border-theme-modal-border pt-4 text-sm text-theme-text-secondary">
                {t("vector.managed-by-env")}
              </div>
            </div>
          </div>
        </div>
      )}
    </SettingsLayout>
  );
}

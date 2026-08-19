import React, { useState, useEffect, useRef } from "react";
import SettingsLayout from "@/components/layout/SettingsLayout";
import PageHeader from "@/components/layout/PageHeader";
import { SpinnerBlock } from "@/components/ui/spinner";
import System from "@/models/system";
import showToast from "@/utils/toast";
import { useModal } from "@/hooks/useModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ChevronsUpDown, Search, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import ChangeWarningModal from "@/components/ChangeWarning";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import VectorDBItem from "@/components/VectorDBSelection/VectorDBItem";

import LanceDbLogo from "@/media/vectordbs/lancedb.png";
import ChromaLogo from "@/media/vectordbs/chroma.png";
import PineconeLogo from "@/media/vectordbs/pinecone.png";
import WeaviateLogo from "@/media/vectordbs/weaviate.png";
import QDrantLogo from "@/media/vectordbs/qdrant.png";
import MilvusLogo from "@/media/vectordbs/milvus.png";
import ZillizLogo from "@/media/vectordbs/zilliz.png";
import AstraDBLogo from "@/media/vectordbs/astraDB.png";
import PGVectorLogo from "@/media/vectordbs/pgvector.png";

import LanceDBOptions from "@/components/VectorDBSelection/LanceDBOptions";
import ChromaDBOptions from "@/components/VectorDBSelection/ChromaDBOptions";
import ChromaCloudOptions from "@/components/VectorDBSelection/ChromaCloudOptions";
import PineconeDBOptions from "@/components/VectorDBSelection/PineconeDBOptions";
import WeaviateDBOptions from "@/components/VectorDBSelection/WeaviateDBOptions";
import QDrantDBOptions from "@/components/VectorDBSelection/QDrantDBOptions";
import MilvusDBOptions from "@/components/VectorDBSelection/MilvusDBOptions";
import ZillizCloudOptions from "@/components/VectorDBSelection/ZillizCloudOptions";
import AstraDBOptions from "@/components/VectorDBSelection/AstraDBOptions";
import PGVectorOptions from "@/components/VectorDBSelection/PGVectorOptions";

const VECTOR_DBS = [
  {
    name: "LanceDB",
    value: "lancedb",
    logo: LanceDbLogo,
    options: (_) => <LanceDBOptions />,
    description:
      "100% local vector DB that runs on the same instance as AnythingLLM.",
  },
  {
    name: "PGVector",
    value: "pgvector",
    logo: PGVectorLogo,
    options: (settings) => <PGVectorOptions settings={settings} />,
    description: "Vector search powered by PostgreSQL.",
  },
  {
    name: "Chroma",
    value: "chroma",
    logo: ChromaLogo,
    options: (settings) => <ChromaDBOptions settings={settings} />,
    description:
      "Open source vector database you can host yourself or on the cloud.",
  },
  {
    name: "Chroma Cloud",
    value: "chromacloud",
    logo: ChromaLogo,
    options: (settings) => <ChromaCloudOptions settings={settings} />,
    description:
      "Fully managed Chroma cloud service with enterprise features and support.",
  },
  {
    name: "Pinecone",
    value: "pinecone",
    logo: PineconeLogo,
    options: (settings) => <PineconeDBOptions settings={settings} />,
    description: "100% cloud-based vector database for enterprise use cases.",
  },
  {
    name: "Zilliz Cloud",
    value: "zilliz",
    logo: ZillizLogo,
    options: (settings) => <ZillizCloudOptions settings={settings} />,
    description:
      "Cloud hosted vector database built for enterprise with SOC 2 compliance.",
  },
  {
    name: "QDrant",
    value: "qdrant",
    logo: QDrantLogo,
    options: (settings) => <QDrantDBOptions settings={settings} />,
    description: "Open source local and distributed cloud vector database.",
  },
  {
    name: "Weaviate",
    value: "weaviate",
    logo: WeaviateLogo,
    options: (settings) => <WeaviateDBOptions settings={settings} />,
    description:
      "Open source local and cloud hosted multi-modal vector database.",
  },
  {
    name: "Milvus",
    value: "milvus",
    logo: MilvusLogo,
    options: (settings) => <MilvusDBOptions settings={settings} />,
    description: "Open-source, highly scalable, and blazing fast.",
  },
  {
    name: "AstraDB",
    value: "astra",
    logo: AstraDBLogo,
    options: (settings) => <AstraDBOptions settings={settings} />,
    description: "Vector Search for Real-world GenAI.",
  },
];

export default function GeneralVectorDatabase() {
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [hasEmbeddings, setHasEmbeddings] = useState(false);
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredVDBs, setFilteredVDBs] = useState([]);
  const [selectedVDB, setSelectedVDB] = useState(null);
  const [searchMenuOpen, setSearchMenuOpen] = useState(false);
  const searchInputRef = useRef(null);
  const { isOpen, openModal, closeModal } = useModal();
  const { t } = useTranslation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedVDB !== settings?.VectorDB && hasChanges && hasEmbeddings) {
      openModal();
    } else {
      await handleSaveSettings();
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    const form = document.getElementById("vectordb-form");
    const settingsData = {};
    const formData = new FormData(form);
    settingsData.VectorDB = selectedVDB;
    for (var [key, value] of formData.entries()) settingsData[key] = value;

    const { error } = await System.updateSystem(settingsData);
    if (error) {
      showToast(`Failed to save vector database settings: ${error}`, "error");
      setHasChanges(true);
    } else {
      showToast("Vector database preferences saved successfully.", "success");
      setHasChanges(false);
    }
    setSaving(false);
    closeModal();
  };

  const updateVectorChoice = (selection) => {
    setSearchQuery("");
    setSelectedVDB(selection);
    setSearchMenuOpen(false);
    setHasChanges(true);
  };

  const handleXButton = () => {
    if (searchQuery.length > 0) {
      setSearchQuery("");
      if (searchInputRef.current) searchInputRef.current.value = "";
    } else {
      setSearchMenuOpen(!searchMenuOpen);
    }
  };

  useEffect(() => {
    async function fetchKeys() {
      const _settings = await System.keys();
      setSettings(_settings);
      setSelectedVDB(_settings?.VectorDB || "lancedb");
      setHasEmbeddings(_settings?.HasExistingEmbeddings || false);
      setLoading(false);
    }
    fetchKeys();
  }, []);

  useEffect(() => {
    const filtered = VECTOR_DBS.filter((vdb) =>
      vdb.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredVDBs(filtered);
  }, [searchQuery, selectedVDB]);

  const selectedVDBObject =
    VECTOR_DBS.find((vdb) => vdb.value === selectedVDB) ?? VECTOR_DBS[0];

  return (
    <SettingsLayout>
      {loading ? (
        <SpinnerBlock className="min-h-[60vh]" />
      ) : (
        <form
          id="vectordb-form"
          onSubmit={handleSubmit}
          className="flex flex-col w-full"
        >
          <PageHeader
            title={t("vector.title")}
            description={t("vector.description")}
          />
          <div className="w-full justify-end flex">
            {hasChanges && (
              <Button size="lg" type="submit" className="mt-3 mr-0 -mb-14 z-10">
                {saving ? t("common.saving") : t("common.save")}
              </Button>
            )}
          </div>
          <div className="text-base font-bold text-theme-text-primary mt-6 mb-4">
            {t("vector.provider.title")}
          </div>
          <Popover open={searchMenuOpen} onOpenChange={setSearchMenuOpen}>
            <PopoverTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full max-w-[640px] h-[64px] justify-between gap-0 p-[14px] rounded-lg border-2 border-transparent bg-theme-settings-input-bg hover:bg-theme-settings-input-bg hover:border-primary-button aria-expanded:bg-theme-settings-input-bg transition-all duration-300"
                >
                  <div className="flex gap-x-4 items-center">
                    <img
                      src={selectedVDBObject.logo}
                      alt={`${selectedVDBObject.name} logo`}
                      className="w-10 h-10 rounded-md"
                    />
                    <div className="flex flex-col text-left">
                      <div className="text-sm font-semibold text-theme-text-primary">
                        {selectedVDBObject.name}
                      </div>
                      <div className="mt-1 text-xs text-description font-normal">
                        {selectedVDBObject.description}
                      </div>
                    </div>
                  </div>
                  <ChevronsUpDown
                    size={24}
                    className="text-theme-text-primary"
                  />
                </Button>
              }
            />
            <PopoverContent
              align="start"
              sideOffset={4}
              className="w-(--anchor-width) max-w-[640px] max-h-[310px] min-h-[64px] flex-col gap-0 rounded-lg bg-theme-settings-input-bg p-0 border-2 border-primary-button"
            >
              <div className="flex items-center border-b border-[#9CA3AF] px-4">
                <Search
                  size={20}
                  className="text-theme-text-primary shrink-0"
                />
                <Input
                  type="text"
                  name="vdb-search"
                  autoComplete="off"
                  placeholder="Search all vector database providers"
                  className="h-[38px] border-0 bg-transparent px-3 shadow-none focus-visible:ring-0 focus-visible:border-0 text-theme-text-primary placeholder:text-theme-text-primary placeholder:font-medium"
                  onChange={(e) => setSearchQuery(e.target.value)}
                  ref={searchInputRef}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") e.preventDefault();
                  }}
                />
                <X
                  size={20}
                  className="cursor-pointer text-theme-text-primary hover:text-x-button shrink-0"
                  onClick={handleXButton}
                />
              </div>
              <div className="flex-1 flex flex-col gap-y-1 overflow-y-auto thin-scrollbar px-2 py-2 max-h-[245px]">
                {filteredVDBs.map((vdb) => (
                  <VectorDBItem
                    key={vdb.name}
                    name={vdb.name}
                    value={vdb.value}
                    image={vdb.logo}
                    description={vdb.description}
                    checked={selectedVDB === vdb.value}
                    onClick={() => updateVectorChoice(vdb.value)}
                  />
                ))}
              </div>
            </PopoverContent>
          </Popover>
          <div
            onChange={() => setHasChanges(true)}
            className="mt-4 flex flex-col gap-y-1"
          >
            {selectedVDB &&
              VECTOR_DBS.find((vdb) => vdb.value === selectedVDB)?.options(
                settings
              )}
          </div>
        </form>
      )}
      <Dialog
        open={isOpen}
        onOpenChange={(open) => (open ? openModal() : closeModal())}
      >
        <DialogContent>
          <ChangeWarningModal
            warningText="Switching the vector database will reset all previously embedded documents in all workspaces.\n\nConfirming will clear all embeddings from your vector database and remove all documents from your workspaces. Your uploaded documents will not be deleted, they will be available for re-embedding."
            onClose={closeModal}
            onConfirm={handleSaveSettings}
          />
        </DialogContent>
      </Dialog>
    </SettingsLayout>
  );
}

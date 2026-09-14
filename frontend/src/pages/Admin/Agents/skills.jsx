import AgentWebSearchSelection from "./WebSearchSelection";
import AgentSQLConnectorSelection from "./SQLConnectorSelection";
import GenericSkillPanel from "./GenericSkillPanel";
import DefaultSkillPanel from "./DefaultSkillPanel";
import FileSystemSkillPanel from "./FileSystemSkillPanel";
import CreateFileSkillPanel from "./CreateFileSkillPanel";
import { Link } from "react-router-dom";
import paths from "@/utils/paths";
import {
  AppWindow,
  Brain,
  CalendarCheck,
  ChartColumn,
  Database,
  File,
  FilePlus,
  FolderOpen,
  ImageIcon,
  ListFilter,
  Mail,
} from "lucide-react";

export const getDefaultSkills = (t) => ({
  "rag-memory": {
    title: t("agent.skill.rag.title"),
    description: t("agent.skill.rag.description"),
    component: DefaultSkillPanel,
    icon: Brain,
    skill: "rag-memory",
  },
  "document-summarizer": {
    title: t("agent.skill.view.title"),
    description: t("agent.skill.view.description"),
    component: DefaultSkillPanel,
    icon: File,
    skill: "document-summarizer",
  },
  "web-scraping": {
    title: t("agent.skill.scrape.title"),
    description: t("agent.skill.scrape.description"),
    component: DefaultSkillPanel,
    icon: AppWindow,
    skill: "web-scraping",
  },
});

/**
 * Get the configurable skills for the agent.
 * @param {function} t - The translation function.
 * @param {object} options - The options for the configurable skills.
 * @param {boolean} options.fileSystemAgentAvailable - Whether the file system agent is available.
 * @param {boolean} options.createFilesAgentAvailable - Whether the create files agent is available.
 * @param {boolean} options.imageGenerationAvailable - Whether an image endpoint is configured.
 * @returns {object} The configurable skills.
 */
export const getConfigurableSkills = (
  t,
  {
    fileSystemAgentAvailable = true,
    createFilesAgentAvailable = true,
    smtpReady = true,
    imageGenerationAvailable = true,
  } = {}
) => ({
  ...(fileSystemAgentAvailable && {
    "filesystem-agent": {
      title: t("agent.skill.filesystem.title"),
      description: t("agent.skill.filesystem.description"),
      component: FileSystemSkillPanel,
      skill: "filesystem-agent",
      icon: FolderOpen,
    },
  }),
  ...(createFilesAgentAvailable && {
    "create-files-agent": {
      title: t("agent.skill.createFiles.title"),
      description: t("agent.skill.createFiles.description"),
      component: CreateFileSkillPanel,
      skill: "create-files-agent",
      icon: FilePlus,
    },
  }),
  "create-chart": {
    title: t("agent.skill.generate.title"),
    description: t("agent.skill.generate.description"),
    component: GenericSkillPanel,
    skill: "create-chart",
    icon: ChartColumn,
  },
  "generate-image": {
    title: t("agent.skill.generateImage.title"),
    description: t("agent.skill.generateImage.description"),
    component: GenericSkillPanel,
    skill: "generate-image",
    icon: ImageIcon,
    disabled: !imageGenerationAvailable,
    disabledHint: !imageGenerationAvailable
      ? t("agent.skill.generateImage.unavailable")
      : null,
  },
  "web-browsing": {
    title: t("agent.skill.web.title"),
    description: t("agent.skill.web.description"),
    component: AgentWebSearchSelection,
    skill: "web-browsing",
    icon: ListFilter,
  },
  "sql-agent": {
    title: t("agent.skill.sql.title"),
    description: t("agent.skill.sql.description"),
    component: AgentSQLConnectorSelection,
    skill: "sql-agent",
    icon: Database,
  },
  "create-scheduled-job": {
    title: t("agent.skill.scheduledJob.title"),
    description: t("agent.skill.scheduledJob.description"),
    component: GenericSkillPanel,
    skill: "create-scheduled-job",
    icon: CalendarCheck,
    mode: ["adminOnly"],
  },
  "send-email": {
    title: t("agent.skill.sendEmail.title"),
    description: t("agent.skill.sendEmail.description"),
    component: GenericSkillPanel,
    skill: "send-email",
    icon: Mail,
    disabled: !smtpReady,
    disabledHint: !smtpReady ? (
      <span>
        {t("agent.skill.sendEmail.needsSmtp")}{" "}
        <Link to={paths.settings.smtp()} className="text-cta-button underline">
          {t("agent.skill.sendEmail.needsSmtpLink")}
        </Link>
      </span>
    ) : null,
  },
});

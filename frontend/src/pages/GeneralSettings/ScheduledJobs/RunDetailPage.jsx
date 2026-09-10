import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import SettingsLayout from "@/components/layout/SettingsLayout";
import {
  ArrowLeft,
  Brain,
  File,
  Mail,
  MessageSquareText,
  Square,
  Wrench,
} from "lucide-react";
import ScheduledJobs from "@/models/scheduledJobs";
import usePolling from "@/hooks/usePolling";
import showToast from "@/utils/toast";
import paths from "@/utils/paths";
import renderMarkdown from "@/utils/chat/markdown";
import CollapsibleSection from "./components/CollapsibleSection";
import ToolCallCard from "./components/ToolCallCard";
import GeneratedFileCard from "./components/GeneratedFileCard";
import moment from "moment";
import { formatDuration, numberWithCommas } from "@/utils/numbers";
import DOMPurify from "@/utils/chat/purify";
import {
  THOUGHT_REGEX_COMPLETE,
  THOUGHT_REGEX_OPEN,
  THOUGHT_REGEX_CLOSE,
} from "@/components/WorkspaceChat/ChatContainer/ChatHistory/ThoughtContainer";

export default function RunDetailPage() {
  const { t } = useTranslation();
  const { id, runId, slug = null } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [run, setRun] = useState(null);
  const [job, setJob] = useState(null);
  const [emailLogs, setEmailLogs] = useState([]);
  const [continuing, setContinuing] = useState(false);
  const [killing, setKilling] = useState(false);

  useEffect(() => {
    fetchRun();
    fetchEmailLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId, slug]);

  const fetchRun = async () => {
    const data = slug
      ? await ScheduledJobs.workspace.getRun(slug, runId)
      : await ScheduledJobs.getRun(runId);
    setRun(data.run);
    setJob(data.job);
    setLoading(false);

    if (data.run && !data.run.readAt) {
      if (slug) ScheduledJobs.workspace.markRunRead(slug, runId);
      else ScheduledJobs.markRunRead(runId);
    }
  };

  const fetchEmailLogs = async () => {
    const { logs } = slug
      ? await ScheduledJobs.workspace.emailLogs(slug, runId)
      : await ScheduledJobs.emailLogs(runId);
    setEmailLogs(logs || []);
  };

  const isNonTerminal = run?.status === "running" || run?.status === "queued";
  // Poll every 3s while a run is in progress so the trace/status updates live.
  // Stops automatically once the run reaches a terminal state.
  usePolling(fetchRun, 3000, isNonTerminal);

  // The result email is sent just after the run completes, not before - refetch
  // the email log shortly after the run turns terminal so a just-arrived send
  // shows up without the user having to leave and come back.
  useEffect(() => {
    if (isNonTerminal || !run?.status) return;
    const timeoutId = setTimeout(fetchEmailLogs, 2000);
    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run?.status]);

  const handleContinueInThread = async () => {
    setContinuing(true);
    const { workspaceSlug, threadSlug, error } = slug
      ? await ScheduledJobs.workspace.continueInThread(slug, runId)
      : await ScheduledJobs.continueInThread(runId);

    if (error || !workspaceSlug || !threadSlug) {
      showToast(error || t("scheduledJobs.runDetail.threadFailed"), "error");
      setContinuing(false);
      return;
    }

    navigate(paths.workspace.thread(workspaceSlug, threadSlug));
  };

  const handleKillRun = async () => {
    setKilling(true);
    const { success, error } = slug
      ? await ScheduledJobs.workspace.killRun(slug, runId)
      : await ScheduledJobs.killRun(runId);
    setKilling(false);

    if (!success) {
      showToast(error || t("scheduledJobs.toast.killFailed"), "error");
      return;
    }

    showToast(t("scheduledJobs.toast.killed"), "success");
    fetchRun();
  };

  const backPath = slug
    ? paths.workspace.settings.scheduledJobRuns(slug, id)
    : paths.settings.scheduledJobRuns(id);

  if (loading) {
    return (
      <RunDetailLayout slug={slug}>
        <p className="text-zinc-400 light:text-slate-600 text-sm">
          {t("scheduledJobs.runDetail.loading")}
        </p>
      </RunDetailLayout>
    );
  }

  if (!run) {
    return (
      <RunDetailLayout slug={slug}>
        <p className="text-zinc-400 light:text-slate-600 text-sm">
          {t("scheduledJobs.runDetail.notFound")}
        </p>
      </RunDetailLayout>
    );
  }

  const result = run.result || {};
  return (
    <RunDetailLayout slug={slug}>
      <RunHeader
        t={t}
        job={job}
        run={run}
        result={result}
        continuing={continuing}
        killing={killing}
        onBack={() => navigate(backPath)}
        onContinueInThread={handleContinueInThread}
        onKillRun={handleKillRun}
      />

      <div className="mt-6 space-y-4">
        <PromptSection t={t} prompt={job?.prompt} />
        <ErrorSection t={t} error={run?.error} />
        <AgentThoughtsSection t={t} result={result} />
        <ToolCallsSection t={t} result={result} />
        <GeneratedFilesSection t={t} result={result} />
        <FinalResponseSection t={t} result={result} />
        <MetricsSection t={t} metrics={result?.metrics} />
        <EmailLogSection t={t} logs={emailLogs} />
      </div>
    </RunDetailLayout>
  );
}

function RunDetailLayout({ slug = null, children }) {
  // Same reasoning as RunHistoryPage - a workspace-owned job's run detail
  // renders as its own screen rather than pulling in the instance-wide admin
  // sidebar, which would be the wrong navigation context here.
  if (slug) return <div className="w-full max-w-5xl mx-auto px-4 py-10">{children}</div>;
  return <SettingsLayout>{children}</SettingsLayout>;
}

function RunHeader({
  t,
  job,
  run,
  result,
  continuing,
  killing,
  onBack,
  onContinueInThread,
  onKillRun,
}) {
  function getStatusInfo() {
    return {
      completed: {
        text: t("scheduledJobs.status.completed"),
        style: "text-green-400 light:text-green-600",
      },
      failed: {
        text: t("scheduledJobs.status.failed"),
        style: "text-red-400 light:text-red-600",
      },
      timed_out: {
        text: t("scheduledJobs.status.timed_out"),
        style: "text-orange-400 light:text-orange-600",
      },
      running: {
        text: t("scheduledJobs.status.running"),
        style: "text-yellow-400 light:text-yellow-600",
      },
      queued: {
        text: t("scheduledJobs.status.queued"),
        style: "text-blue-400 light:text-blue-600",
      },
      default: {
        text: "—",
        style: "text-zinc-400 light:text-slate-600",
      },
    };
  }
  const statusInfo = getStatusInfo();
  const { text, style } = statusInfo[run.status] || statusInfo.default;
  const isKillable = ["running", "queued"].includes(run.status);

  return (
    <div className="w-full flex items-end justify-between gap-x-4 pb-6 border-theme-sidebar-border light:border-zinc-300 border-b-2">
      <div className="flex flex-col gap-y-2">
        <button
          type="button"
          onClick={onBack}
          className="border-none flex items-center gap-2 text-zinc-400 light:text-slate-600 hover:text-zinc-50 light:hover:text-slate-950 text-sm transition-colors w-fit"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("scheduledJobs.runDetail.back")}
        </button>
        <p className="text-lg leading-7 font-semibold text-zinc-50 light:text-slate-950">
          {t("scheduledJobs.runDetail.runHeading", {
            name: job?.name || t("scheduledJobs.runDetail.unknownJob"),
            id: run.id,
          })}
        </p>
        <div className="flex items-center gap-2 text-xs">
          <span className={style}>{text}</span>
          <span className="text-zinc-400 light:text-slate-600">
            {moment(run.startedAt).format("LTS")}
          </span>
          {result.duration && (
            <span className="text-zinc-400 light:text-slate-600">
              {t("scheduledJobs.runDetail.duration", {
                value: formatDuration(result.duration / 1000),
              })}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {isKillable && (
          <button
            type="button"
            onClick={onKillRun}
            disabled={killing}
            title={t("scheduledJobs.runDetail.stopJob")}
            className="border-none h-9 px-5 rounded-lg bg-red-500/20 text-red-400 light:bg-red-100 light:text-red-600 text-sm font-medium hover:bg-red-500/30 light:hover:bg-red-200 transition-colors disabled:opacity-50 shrink-0 flex items-center gap-2"
          >
            <Square className="h-4 w-4" />
            {killing
              ? t("scheduledJobs.runDetail.killing")
              : t("scheduledJobs.runDetail.stopJob")}
          </button>
        )}
        {run.status === "completed" && (
          <button
            type="button"
            onClick={onContinueInThread}
            disabled={continuing}
            className="border-none h-9 px-5 rounded-lg bg-zinc-50 text-zinc-950 light:bg-slate-900 light:text-white text-sm font-medium hover:bg-zinc-200 light:hover:bg-slate-800 transition-colors disabled:opacity-50 shrink-0"
          >
            {continuing
              ? t("scheduledJobs.runDetail.creating")
              : t("scheduledJobs.runDetail.continueInThread")}
          </button>
        )}
      </div>
    </div>
  );
}

function PromptSection({ t, prompt }) {
  return (
    <div className="border border-zinc-700 light:border-slate-400 rounded-lg p-[18px]">
      <p className="text-sm font-medium text-theme-text-primary light:text-slate-950 uppercase tracking-[1.4px] mb-1">
        {t("scheduledJobs.runDetail.sections.prompt")}
      </p>
      <p className="text-sm text-zinc-400 light:text-slate-600 whitespace-pre-wrap">
        {prompt || "—"}
      </p>
    </div>
  );
}

function ErrorSection({ t, error }) {
  if (!error) return null;
  return (
    <div className="border border-red-500/20 light:border-red-300 rounded-lg p-[18px] bg-red-500/5 light:bg-red-50">
      <p className="text-sm font-medium text-red-400 light:text-red-600 uppercase tracking-[1.4px] mb-1">
        {t("scheduledJobs.runDetail.sections.error")}
      </p>
      <p className="text-sm text-red-300 light:text-red-700">{error}</p>
    </div>
  );
}

function AgentThoughtsSection({ t, result }) {
  if (!result.thoughts || result.thoughts.length === 0) return null;

  return (
    <CollapsibleSection
      title={t("scheduledJobs.runDetail.sections.thinking", {
        count: result.thoughts.length,
      })}
      icon={Brain}
    >
      <div className="space-y-2">
        {result.thoughts.map((thought, i) => (
          <div
            key={i}
            className="flex items-start gap-2 text-sm text-theme-text-secondary"
          >
            <span className="text-xs text-theme-text-secondary/50 mt-0.5 min-w-[20px]">
              {i + 1}.
            </span>
            <span>{thought}</span>
          </div>
        ))}
      </div>
    </CollapsibleSection>
  );
}

function ToolCallsSection({ t, result }) {
  if (!result.toolCalls || result.toolCalls.length === 0) return null;

  return (
    <CollapsibleSection
      title={t("scheduledJobs.runDetail.sections.toolCalls", {
        count: result.toolCalls.length,
      })}
      icon={Wrench}
    >
      <div className="space-y-3">
        {result.toolCalls.map((toolCall, i) => (
          <ToolCallCard key={i} toolCall={toolCall} />
        ))}
      </div>
    </CollapsibleSection>
  );
}

function GeneratedFilesSection({ t, result }) {
  // outputs contains {type, payload} objects from agent plugins
  const outputs = result.outputs || [];
  if (outputs.length === 0) return null;

  return (
    <CollapsibleSection
      title={t("scheduledJobs.runDetail.sections.files", {
        count: outputs.length,
      })}
      icon={File}
      defaultOpen={true}
    >
      <div className="space-y-2">
        {outputs.map((output, i) => (
          <GeneratedFileCard key={i} file={output.payload} type={output.type} />
        ))}
      </div>
    </CollapsibleSection>
  );
}

function FinalResponseSection({ t, result }) {
  if (!result.text) return null;
  let reasoning = null;
  let msgToRender = result.text;

  if (result.text.match(THOUGHT_REGEX_COMPLETE)) {
    reasoning = result.text.match(THOUGHT_REGEX_COMPLETE)?.[0];
    if (reasoning)
      reasoning = reasoning
        .replace(THOUGHT_REGEX_OPEN, "")
        .replace(THOUGHT_REGEX_CLOSE, "")
        .trim();
    msgToRender = result.text.replace(THOUGHT_REGEX_COMPLETE, "");
  }

  return (
    <CollapsibleSection
      title={t("scheduledJobs.runDetail.sections.response")}
      icon={MessageSquareText}
      defaultOpen={true}
      copyableContent={msgToRender}
    >
      {reasoning && (
        <div className="text-sm text-zinc-50/50 light:text-slate-950/50 markdown border-l-2 border-zinc-700 light:border-slate-400 pl-2 mb-4">
          <span
            dangerouslySetInnerHTML={{
              __html: DOMPurify.sanitize(renderMarkdown(reasoning)),
            }}
          />
        </div>
      )}
      <div
        className="text-sm text-zinc-50 light:text-slate-950 markdown"
        dangerouslySetInnerHTML={{
          __html: DOMPurify.sanitize(renderMarkdown(msgToRender)),
        }}
      />
    </CollapsibleSection>
  );
}

function MetricsSection({ t, metrics }) {
  if (!metrics || Object.keys(metrics).length === 0) return null;

  // Todo: there is a bug where if you create a job that has no tools, we wont get any metrics
  // To avoid confusion, we should not show the metrics section if there are no metrics.
  if (!metrics.prompt_tokens || !metrics.completion_tokens) return null;

  function renderModel(metrics) {
    if (!metrics.model) return null;
    return (
      <span className="font-mono text-xs font-normal text-zinc-50/50 light:text-slate-950/50">
        ({metrics.model})
      </span>
    );
  }

  return (
    <div className="border border-zinc-700 light:border-slate-400 rounded-lg p-[18px]">
      <p className="text-sm font-semibold text-zinc-400 light:text-slate-600 uppercase tracking-[1.4px] mb-1">
        {t("scheduledJobs.runDetail.sections.metrics")} {renderModel(metrics)}
      </p>
      <div className="flex gap-6 text-sm text-zinc-400 light:text-slate-600">
        {metrics.prompt_tokens != null && (
          <span>
            {t("scheduledJobs.runDetail.metrics.promptTokens")}{" "}
            <span className="text-zinc-50 light:text-slate-950">
              {numberWithCommas(metrics.prompt_tokens)}
            </span>
          </span>
        )}
        {metrics.completion_tokens != null && (
          <span>
            {t("scheduledJobs.runDetail.metrics.completionTokens")}{" "}
            <span className="text-zinc-50 light:text-slate-950">
              {numberWithCommas(metrics.completion_tokens)}
            </span>
          </span>
        )}
      </div>
    </div>
  );
}

function EmailLogSection({ t, logs }) {
  if (!logs || logs.length === 0) return null;

  return (
    <CollapsibleSection
      title={t("scheduledJobs.runDetail.sections.emailLog", {
        count: logs.length,
      })}
      icon={Mail}
    >
      <p className="text-xs text-zinc-400 light:text-slate-600 mb-3">
        {logs[0]?.metadata?.workspaceName
          ? t("scheduledJobs.runDetail.emailLog.sourceWorkspace", {
              name: logs[0].metadata.workspaceName,
            })
          : t("scheduledJobs.runDetail.emailLog.sourceSystem")}
      </p>
      <div className="space-y-2">
        {logs.map((log) => {
          const sent = log.event === "scheduled_job_email_sent";
          return (
            <div
              key={log.id}
              className="flex items-start justify-between gap-4 text-sm"
            >
              <div className="flex flex-col">
                <span className="text-zinc-50 light:text-slate-950">
                  {t("scheduledJobs.runDetail.emailLog.to")}{" "}
                  {log.metadata?.to || "—"}
                </span>
                {!sent && log.metadata?.reason && (
                  <span className="text-red-400 light:text-red-600 text-xs">
                    {t("scheduledJobs.runDetail.emailLog.reason")}{" "}
                    {log.metadata.reason}
                  </span>
                )}
              </div>
              <span
                className={
                  sent
                    ? "text-green-400 light:text-green-600 text-xs shrink-0"
                    : "text-red-400 light:text-red-600 text-xs shrink-0"
                }
              >
                {sent
                  ? t("scheduledJobs.runDetail.emailLog.sent")
                  : t("scheduledJobs.runDetail.emailLog.failed")}
              </span>
            </div>
          );
        })}
      </div>
    </CollapsibleSection>
  );
}

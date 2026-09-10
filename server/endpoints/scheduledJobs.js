const { ScheduledJob } = require("../models/scheduledJob");
const { ScheduledJobRun } = require("../models/scheduledJobRun");
const { ScheduledJobLog } = require("../models/scheduledJobLog");
const { validatedRequest } = require("../utils/middleware/validatedRequest");
const {
  userPermissionValid,
} = require("../utils/middleware/authorizedRequest");
const { PERMISSIONS } = require("../utils/permissions");
const { reqBody, safeJsonParse, userFromSession } = require("../utils/http");
const { EventLogs } = require("../models/eventLogs");
const { BackgroundService } = require("../utils/BackgroundWorkers");
const { isSendingEnabled, requireSmtpReady } = require("../utils/smtp");

// BackgroundService is a singleton, so `new BackgroundService()` anywhere in
// the codebase returns the same instance that `server/index.js` booted. We
// grab that reference once and reuse it across handlers.
const backgroundService = new BackgroundService();

function scheduledJobEndpoints(app) {
  if (!app) return;

  // Whether SMTP is configured and enabled - the frontend checks this before
  // showing anything else on the page, so it must not itself require SMTP.
  app.get(
    "/scheduled-jobs/smtp-status",
    [
      validatedRequest,
      userPermissionValid([PERMISSIONS.AGENTS_SCHEDULED_JOBS]),
    ],
    async (_request, response) => {
      try {
        return response.status(200).json({ ready: isSendingEnabled() });
      } catch (e) {
        console.error(e.message, e);
        response.sendStatus(500);
      }
    }
  );

  // List available tools for job configuration
  app.get(
    "/scheduled-jobs/available-tools",
    [
      validatedRequest,
      userPermissionValid([PERMISSIONS.AGENTS_SCHEDULED_JOBS]),
      requireSmtpReady,
    ],
    async (_request, response) => {
      try {
        const tools = await ScheduledJob.availableTools();
        return response.status(200).json({ tools });
      } catch (e) {
        console.error(e.message, e);
        response.sendStatus(500).json({ tools: [] });
      }
    }
  );

  // List workspaces/users a job's results can be emailed to
  app.get(
    "/scheduled-jobs/available-recipients",
    [
      validatedRequest,
      userPermissionValid([PERMISSIONS.AGENTS_SCHEDULED_JOBS]),
      requireSmtpReady,
    ],
    async (_request, response) => {
      try {
        const recipients = await ScheduledJob.availableRecipients();
        return response.status(200).json(recipients);
      } catch (e) {
        console.error(e.message, e);
        response.sendStatus(500).json({ workspaces: [], users: [] });
      }
    }
  );

  // Get a single run detail
  app.get(
    "/scheduled-jobs/runs/:runId",
    [
      validatedRequest,
      userPermissionValid([PERMISSIONS.AGENTS_SCHEDULED_JOBS]),
      requireSmtpReady,
    ],
    async (request, response) => {
      try {
        const run = await ScheduledJobRun.get({
          id: Number(request.params.runId),
        });
        if (!run) {
          return response
            .status(404)
            .json({ run: null, error: "Run not found" });
        }

        const job = await ScheduledJob.get({ id: run.jobId });
        return response.status(200).json({
          run: {
            ...run,
            result: safeJsonParse(run.result, null),
          },
          job,
        });
      } catch (e) {
        console.error(e.message, e);
        response.sendStatus(500);
      }
    }
  );

  // Email delivery log for a single run - who the result was sent to, and
  // whether each send succeeded.
  app.get(
    "/scheduled-jobs/runs/:runId/email-logs",
    [
      validatedRequest,
      userPermissionValid([PERMISSIONS.AGENTS_SCHEDULED_JOBS]),
      requireSmtpReady,
    ],
    async (request, response) => {
      try {
        const logs = await ScheduledJobLog.where(
          { runId: Number(request.params.runId) },
          50,
          { occurredAt: "desc" }
        );
        return response.status(200).json({
          logs: logs.map((l) => ({
            ...l,
            metadata: safeJsonParse(l.metadata, {}),
          })),
        });
      } catch (e) {
        console.error(e.message, e);
        response.sendStatus(500);
      }
    }
  );

  // Mark a run as read, or kill a running or queued job run
  app.post(
    "/scheduled-jobs/runs/:runId/:action",
    [
      validatedRequest,
      userPermissionValid([PERMISSIONS.AGENTS_SCHEDULED_JOBS]),
      requireSmtpReady,
    ],
    async (request, response) => {
      try {
        const { action } = request.params;

        if (!["read", "kill"].includes(action))
          throw new Error("Invalid action");

        if (action === "read") {
          await ScheduledJobRun.markRead(Number(request.params.runId));
          return response.status(200).json({ success: true });
        }

        if (action === "kill") {
          const run = await ScheduledJobRun.get({
            id: Number(request.params.runId),
          });
          if (!run)
            return response.status(404).json({ error: "Run not found" });
          if (!["queued", "running"].includes(run.status)) {
            return response.status(400).json({
              error: "Only running or queued jobs can be killed",
            });
          }

          const killed = backgroundService.killRun(run.jobId, run.id);
          if (!killed) await ScheduledJobRun.kill(run.id);
          return response.status(200).json({ success: true });
        }
      } catch {
        response.sendStatus(500);
      }
    }
  );

  // List all scheduled jobs
  app.get(
    "/scheduled-jobs",
    [
      validatedRequest,
      userPermissionValid([PERMISSIONS.AGENTS_SCHEDULED_JOBS]),
      requireSmtpReady,
    ],
    async (_request, response) => {
      try {
        const jobs = await ScheduledJob.where({}, null, null, {
          runs: {
            take: 1,
            orderBy: { startedAt: "desc" },
          },
        });

        const jobsWithStatus = jobs.map(({ runs, ...job }) => ({
          ...job,
          latestRun: runs[0] || null,
        }));

        return response.status(200).json({ jobs: jobsWithStatus });
      } catch (e) {
        console.error(e.message, e);
        response.sendStatus(500);
      }
    }
  );

  // Create a new scheduled job
  app.post(
    "/scheduled-jobs/new",
    [
      validatedRequest,
      userPermissionValid([PERMISSIONS.AGENTS_SCHEDULED_JOBS]),
      requireSmtpReady,
    ],
    async (request, response) => {
      try {
        const user = await userFromSession(request, response);
        const {
          name,
          prompt,
          tools,
          schedule,
          recipientType,
          recipientWorkspaceIds,
          recipientUserIds,
        } = reqBody(request);
        let errorMessage = null;

        if (!name?.trim()) {
          errorMessage = "Name is required";
        } else if (!prompt?.trim()) {
          errorMessage = "Prompt is required";
        } else if (!schedule?.trim()) {
          errorMessage = "Schedule is required";
        } else if (!ScheduledJob.isValidCron(schedule)) {
          errorMessage = "Invalid cron expression";
        } else if (tools?.length > 0 && !Array.isArray(tools)) {
          errorMessage = "Tools must be an array";
        } else if (
          recipientType !== undefined &&
          !ScheduledJob.isValidRecipientType(recipientType)
        ) {
          errorMessage = "Invalid recipient type";
        } else if (
          recipientType === "workspace" &&
          !Array.isArray(recipientWorkspaceIds)
        ) {
          errorMessage = "Recipient workspaces must be an array";
        } else if (
          recipientType === "user" &&
          !Array.isArray(recipientUserIds)
        ) {
          errorMessage = "Recipient users must be an array";
        }
        if (errorMessage)
          return response.status(400).json({
            job: null,
            error: errorMessage,
          });

        // New jobs default to enabled, so creating one always counts as an
        // activation. Reject if it would push us past the configured cap.
        const activation = await ScheduledJob.canActivate();
        if (!activation.allowed) {
          return response.status(400).json({
            job: null,
            error: `Cannot create: maximum of ${activation.limit} active scheduled jobs reached. Disable another job first.`,
          });
        }

        const { job, error } = await ScheduledJob.create({
          name: name.trim(),
          prompt: prompt.trim(),
          tools: tools || null,
          schedule: schedule.trim(),
          recipientType: recipientType || "none",
          recipientWorkspaceIds:
            recipientType === "workspace" ? recipientWorkspaceIds : null,
          recipientUserIds: recipientType === "user" ? recipientUserIds : null,
        });

        if (error) {
          return response.status(400).json({ job: null, error });
        }

        backgroundService.addScheduledJob(job);

        // A scheduled job runs an agent prompt unattended and emails the result, so
        // its whole lifecycle belongs in the audit trail. The prompt itself is left
        // out; the job id is enough to look it up, and prompts can be long.
        await EventLogs.logEvent(
          "scheduled_job_created",
          { jobName: job.name, jobId: job.id, schedule: job.schedule },
          user?.id
        );
        return response.status(201).json({ job, error: null });
      } catch (e) {
        console.error(e.message, e);
        response.sendStatus(500);
      }
    }
  );

  // Get a single scheduled job
  app.get(
    "/scheduled-jobs/:id",
    [
      validatedRequest,
      userPermissionValid([PERMISSIONS.AGENTS_SCHEDULED_JOBS]),
      requireSmtpReady,
    ],
    async (request, response) => {
      try {
        const job = await ScheduledJob.get({
          id: Number(request.params.id),
        });
        if (!job) {
          return response
            .status(404)
            .json({ job: null, error: "Job not found" });
        }
        return response.status(200).json({ job });
      } catch (e) {
        console.error(e.message, e);
        response.sendStatus(500);
      }
    }
  );

  // Update a scheduled job
  app.put(
    "/scheduled-jobs/:id",
    [
      validatedRequest,
      userPermissionValid([PERMISSIONS.AGENTS_SCHEDULED_JOBS]),
      requireSmtpReady,
    ],
    async (request, response) => {
      try {
        const user = await userFromSession(request, response);
        const {
          name,
          prompt,
          tools,
          schedule,
          enabled,
          recipientType,
          recipientWorkspaceIds,
          recipientUserIds,
        } = reqBody(request);
        const updates = {};

        if (name !== undefined) updates.name = String(name).trim();
        if (prompt !== undefined) updates.prompt = String(prompt).trim();
        if (tools !== undefined) updates.tools = tools;
        if (enabled !== undefined) updates.enabled = Boolean(enabled);
        if (schedule !== undefined) {
          if (!ScheduledJob.isValidCron(schedule)) {
            return response
              .status(400)
              .json({ job: null, error: "Invalid cron expression" });
          }
          updates.schedule = String(schedule).trim();
        }
        if (recipientType !== undefined) {
          if (!ScheduledJob.isValidRecipientType(recipientType)) {
            return response
              .status(400)
              .json({ job: null, error: "Invalid recipient type" });
          }
          if (recipientType === "workspace" && !Array.isArray(recipientWorkspaceIds)) {
            return response
              .status(400)
              .json({ job: null, error: "Recipient workspaces must be an array" });
          }
          if (recipientType === "user" && !Array.isArray(recipientUserIds)) {
            return response
              .status(400)
              .json({ job: null, error: "Recipient users must be an array" });
          }
          updates.recipientType = recipientType;
          updates.recipientWorkspaceIds =
            recipientType === "workspace" ? recipientWorkspaceIds : null;
          updates.recipientUserIds =
            recipientType === "user" ? recipientUserIds : null;
        }

        // If this update would activate the job, enforce the active-jobs cap.
        // We pass excludeId so a re-save of an already-enabled job is not
        // double-counted against the limit.
        if (updates.enabled === true) {
          const activation = await ScheduledJob.canActivate({
            excludeId: Number(request.params.id),
          });
          if (!activation.allowed) {
            return response.status(400).json({
              job: null,
              error: `Cannot enable: maximum of ${activation.limit} active scheduled jobs reached. Disable another job first.`,
            });
          }
        }

        const { job, error } = await ScheduledJob.update(
          Number(request.params.id),
          updates
        );

        if (error) {
          return response.status(400).json({ job: null, error });
        }

        await backgroundService.syncScheduledJob(job.id);

        await EventLogs.logEvent(
          "scheduled_job_updated",
          {
            jobName: job.name,
            jobId: job.id,
            fields: Object.keys(updates).sort(),
          },
          user?.id
        );
        return response.status(200).json({ job, error: null });
      } catch (e) {
        console.error(e.message, e);
        response.sendStatus(500);
      }
    }
  );

  // Delete a scheduled job
  app.delete(
    "/scheduled-jobs/:id",
    [
      validatedRequest,
      userPermissionValid([PERMISSIONS.AGENTS_SCHEDULED_JOBS]),
      requireSmtpReady,
    ],
    async (request, response) => {
      try {
        const user = await userFromSession(request, response);
        const job = await ScheduledJob.get({ id: Number(request.params.id) });
        backgroundService.removeScheduledJob(Number(request.params.id));

        const success = await ScheduledJob.delete(Number(request.params.id));
        if (success)
          await EventLogs.logEvent(
            "scheduled_job_deleted",
            {
              jobName: job?.name || "Unknown Job",
              jobId: Number(request.params.id),
            },
            user?.id
          );
        return response.status(200).json({ success });
      } catch (e) {
        console.error(e.message, e);
        response.sendStatus(500);
      }
    }
  );

  // Toggle enable/disable
  app.post(
    "/scheduled-jobs/:id/toggle",
    [
      validatedRequest,
      userPermissionValid([PERMISSIONS.AGENTS_SCHEDULED_JOBS]),
      requireSmtpReady,
    ],
    async (request, response) => {
      try {
        const user = await userFromSession(request, response);
        const job = await ScheduledJob.get({
          id: Number(request.params.id),
        });
        if (!job) {
          return response.status(404).json({ error: "Job not found" });
        }

        // Toggling a disabled job to enabled is an activation — enforce the cap.
        // Disabling never needs a check.
        if (!job.enabled) {
          const activation = await ScheduledJob.canActivate({
            excludeId: job.id,
          });
          if (!activation.allowed) {
            return response.status(400).json({
              job: null,
              error: `Cannot enable: maximum of ${activation.limit} active scheduled jobs reached. Disable another job first.`,
            });
          }
        }

        const { job: updated } = await ScheduledJob.update(job.id, {
          enabled: !job.enabled,
        });

        await backgroundService.syncScheduledJob(job.id);

        await EventLogs.logEvent(
          "scheduled_job_toggled",
          { jobName: job.name, jobId: job.id, enabled: !job.enabled },
          user?.id
        );
        return response.status(200).json({ job: updated });
      } catch (e) {
        console.error(e.message, e);
        response.sendStatus(500);
      }
    }
  );

  // Manual trigger — runs the job immediately
  app.post(
    "/scheduled-jobs/:id/trigger",
    [
      validatedRequest,
      userPermissionValid([PERMISSIONS.AGENTS_SCHEDULED_JOBS]),
      requireSmtpReady,
    ],
    async (request, response) => {
      try {
        const user = await userFromSession(request, response);
        const job = await ScheduledJob.get({
          id: Number(request.params.id),
        });
        if (!job) {
          return response.status(404).json({ error: "Job not found" });
        }

        const run = await backgroundService.enqueueScheduledJob(job.id);

        // Recorded even when the run is skipped, because "somebody pressed run" is
        // the fact being audited - a queue that refused it is part of that story.
        await EventLogs.logEvent(
          "scheduled_job_triggered",
          { jobName: job.name, jobId: job.id, skipped: !run },
          user?.id
        );
        return response
          .status(200)
          .json({ success: true, skipped: !run, error: null });
      } catch (e) {
        console.error(e.message, e);
        response.sendStatus(500);
      }
    }
  );

  // Instance-wide schedule log - every run (status/duration/error), across every
  // job (system + workspace-owned), newest first, each with its result-email
  // delivery attempts attached. Replaces the old per-job "Run History" page -
  // pass jobId to filter down to a single job's runs. Mirrors /system/event-logs.
  app.post(
    "/scheduled-jobs/logs",
    [
      validatedRequest,
      userPermissionValid([PERMISSIONS.AGENTS_SCHEDULED_JOBS]),
      requireSmtpReady,
    ],
    async (request, response) => {
      try {
        const { offset = 0, limit = 10, jobId = null } = reqBody(request);
        const clause = jobId ? { jobId: Number(jobId) } : {};

        const runs = await ScheduledJobRun.where(
          clause,
          limit,
          { startedAt: "desc" },
          { job: { include: { workspace: { select: { name: true, slug: true } } } } },
          offset * limit
        );
        const totalLogs = await ScheduledJobRun.count(clause);
        const hasPages = totalLogs > (offset + 1) * limit;

        const emailLogsByRun = await ScheduledJobLog.groupByRunId(
          runs.map((r) => r.id)
        );

        return response.status(200).json({
          logs: runs.map((run) => ({
            id: run.id,
            jobId: run.jobId,
            jobName: run.job?.name || "Unknown Job",
            workspaceName: run.job?.workspace?.name || null,
            workspaceSlug: run.job?.workspace?.slug || null,
            status: run.status,
            error: run.error,
            startedAt: run.startedAt,
            completedAt: run.completedAt,
            readAt: run.readAt,
            emailLogs: emailLogsByRun[run.id] || [],
          })),
          hasPages,
          totalLogs,
        });
      } catch (e) {
        console.error(e.message, e);
        response.sendStatus(500);
      }
    }
  );

  // Clears both halves of the merged view - the run rows and their attached
  // email delivery logs - since that's what the page actually shows.
  app.delete(
    "/scheduled-jobs/logs",
    [
      validatedRequest,
      userPermissionValid([PERMISSIONS.AGENTS_SCHEDULED_JOBS]),
      requireSmtpReady,
    ],
    async (_request, response) => {
      try {
        const success =
          (await ScheduledJobRun.delete()) && (await ScheduledJobLog.delete());
        return response.status(200).json({ success });
      } catch (e) {
        console.error(e.message, e);
        response.sendStatus(500);
      }
    }
  );
}

module.exports = { scheduledJobEndpoints };

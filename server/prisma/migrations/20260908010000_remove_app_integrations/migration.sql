-- Removes the App Integrations surface (Gmail, Google Calendar, Outlook) from
-- `system_settings`. The plugins, endpoints and UI are gone, so nothing reads these
-- rows any more - but three of them held live third-party credentials in plaintext
-- (Outlook's clientSecret/refreshToken, the Gmail and Calendar Apps Script apiKey),
-- so they are deleted rather than left behind on deployed instances.
DELETE FROM "system_settings" WHERE "label" IN (
    'gmail_agent_config',
    'google_calendar_agent_config',
    'outlook_agent_config',
    'disabled_gmail_skills',
    'disabled_google_calendar_skills',
    'disabled_outlook_skills'
);

-- Deliberately not touched: `default_agent_skills` and `workspaces.agentSkillConfig`
-- may still list "gmail-agent" / "outlook-agent" / "google-calendar-agent" inside their
-- JSON arrays. Those carry no credentials, and the agent loader already skips any skill
-- name it cannot resolve (see `#attachPlugins` in server/utils/agents/ephemeral.js), so
-- rewriting each workspace's JSON here would add risk without changing behaviour.

-- Strips the removed App Integration skill names out of the JSON skill configs.
-- `20260908010000_remove_app_integrations` deleted the settings rows that held their
-- credentials; these names are the leftover references to skills that no longer exist.
--
-- The agent loader already skips a skill name it cannot resolve, so this changes no
-- behaviour - it stops the configs from carrying dead entries that would reappear in
-- the UI's saved state and in any future export of an instance's configuration.
--
-- Every statement is guarded so it only touches rows that actually contain a removed
-- name, leaves NULL/malformed configs alone, and is safe to re-run.

-- 1. Instance-wide default skill list.
UPDATE "system_settings"
SET "value" = (
    SELECT json_group_array(entry.value)
    FROM json_each("system_settings"."value") AS entry
    WHERE entry.value NOT IN ('gmail-agent', 'outlook-agent', 'google-calendar-agent')
)
WHERE "label" = 'default_agent_skills'
  AND json_valid("value")
  AND json_type("value") = 'array'
  AND EXISTS (
    SELECT 1 FROM json_each("system_settings"."value") AS e
    WHERE e.value IN ('gmail-agent', 'outlook-agent', 'google-calendar-agent')
  );

-- 2. Per-workspace `activeSkills`. Surviving entries keep their original order.
UPDATE "workspaces"
SET "agentSkillConfig" = json_set(
    "agentSkillConfig",
    '$.activeSkills',
    (
      SELECT json_group_array(entry.value)
      FROM json_each(json_extract("workspaces"."agentSkillConfig", '$.activeSkills')) AS entry
      WHERE entry.value NOT IN ('gmail-agent', 'outlook-agent', 'google-calendar-agent')
    )
)
WHERE "agentSkillConfig" IS NOT NULL
  AND json_valid("agentSkillConfig")
  AND json_type("agentSkillConfig", '$.activeSkills') = 'array'
  AND EXISTS (
    SELECT 1 FROM json_each(json_extract("workspaces"."agentSkillConfig", '$.activeSkills')) AS e
    WHERE e.value IN ('gmail-agent', 'outlook-agent', 'google-calendar-agent')
  );

-- 3. Per-workspace `disabledSubSkills`, which is keyed by parent skill name. Only the
-- removed parents are dropped; sibling keys such as `filesystem-agent` stay as they are.
UPDATE "workspaces"
SET "agentSkillConfig" = json_remove(
    "agentSkillConfig",
    '$.disabledSubSkills."gmail-agent"',
    '$.disabledSubSkills."outlook-agent"',
    '$.disabledSubSkills."google-calendar-agent"'
)
WHERE "agentSkillConfig" IS NOT NULL
  AND json_valid("agentSkillConfig")
  AND json_type("agentSkillConfig", '$.disabledSubSkills') = 'object'
  AND (
    json_type("agentSkillConfig", '$.disabledSubSkills."gmail-agent"') IS NOT NULL
    OR json_type("agentSkillConfig", '$.disabledSubSkills."outlook-agent"') IS NOT NULL
    OR json_type("agentSkillConfig", '$.disabledSubSkills."google-calendar-agent"') IS NOT NULL
  );

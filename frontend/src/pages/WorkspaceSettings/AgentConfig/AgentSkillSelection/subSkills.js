import { getFileSystemSubSkills } from "@/pages/Admin/Agents/FileSystemSkillPanel";
import { getCreateFileSkills } from "@/pages/Admin/Agents/CreateFileSkillPanel";

/**
 * Parent skills whose children can be toggled individually. These keys must stay
 * in sync with SUB_SKILL_PARENTS in server/utils/agents/workspaceSkills.js — the
 * server only honours `disabledSubSkills` entries for these parents.
 */
const SUB_SKILL_SOURCES = {
  "filesystem-agent": (t) => getFileSystemSubSkills(t),
  "create-files-agent": (t) => getCreateFileSkills(t),
};

/**
 * Get the toggleable sub-skills for a parent skill.
 * @param {string} parentSkill - e.g. "filesystem-agent"
 * @param {function} t - i18n translator
 * @returns {Array<{name: string, title: string, description?: string}>} empty when the parent has none
 */
export function getSubSkillsFor(parentSkill, t) {
  const source = SUB_SKILL_SOURCES[parentSkill];
  if (!source) return [];
  return (source(t) ?? []).filter((skill) => !!skill?.name);
}

/**
 * Whether a parent skill exposes sub-skills at all.
 * @param {string} parentSkill
 * @returns {boolean}
 */
export function hasSubSkills(parentSkill) {
  return Object.prototype.hasOwnProperty.call(SUB_SKILL_SOURCES, parentSkill);
}

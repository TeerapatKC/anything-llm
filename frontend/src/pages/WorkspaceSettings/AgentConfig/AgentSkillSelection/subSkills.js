import { getFileSystemSubSkills } from "@/pages/Admin/Agents/FileSystemSkillPanel";
import { getCreateFileSkills } from "@/pages/Admin/Agents/CreateFileSkillPanel";
import { getGmailSkills } from "@/pages/Admin/Agents/GMailSkillPanel/utils";
import { getOutlookSkills } from "@/pages/Admin/Agents/OutlookSkillPanel/utils";

/**
 * Parent skills whose children can be toggled individually. These keys must stay
 * in sync with SUB_SKILL_PARENTS in server/utils/agents/workspaceSkills.js — the
 * server only honours `disabledSubSkills` entries for these parents.
 *
 * The underlying catalogs come in two shapes: filesystem/create-files export a
 * flat array of skills, while gmail/outlook export an object keyed by category
 * with a nested `skills` array. Both are flattened to `{name, title, description}`
 * so the UI can render them uniformly.
 */
const SUB_SKILL_SOURCES = {
  "filesystem-agent": (t) => getFileSystemSubSkills(t),
  "create-files-agent": (t) => getCreateFileSkills(t),
  "gmail-agent": (t) => flattenCategories(getGmailSkills(t)),
  "outlook-agent": (t) => flattenCategories(getOutlookSkills(t)),
};

/**
 * Flatten a category-keyed catalog ({ search: { skills: [...] }, ... }) into a
 * single list of skills.
 * @param {object} categories
 * @returns {Array<{name: string, title: string, description?: string}>}
 */
function flattenCategories(categories = {}) {
  return Object.values(categories).flatMap((category) =>
    Array.isArray(category?.skills) ? category.skills : []
  );
}

/**
 * Get the toggleable sub-skills for a parent skill.
 * @param {string} parentSkill - e.g. "gmail-agent"
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

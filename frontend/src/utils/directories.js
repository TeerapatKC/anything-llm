import i18next from "@/i18n";
import { userFromStorage } from "@/utils/request";
import moment from "moment";

export function formatDate(dateString) {
  const date = isNaN(new Date(dateString).getTime())
    ? new Date()
    : new Date(dateString);
  const options = { year: "numeric", month: "short", day: "numeric" };
  const formattedDate = date.toLocaleDateString("en-US", options);
  return formattedDate;
}

export function formatDateTimeAsMoment(dateString, format = "LLL") {
  if (!dateString) return moment().format(format);
  try {
    return moment(dateString).format(format);
  } catch {
    return moment().format(format);
  }
}

export function getFileExtension(path) {
  const hasExtension = path?.includes(".");
  if (!hasExtension) return "FILE";
  const extension = path?.split(".")?.slice(-1)?.[0];
  return extension?.toUpperCase() || "FILE";
}

export function middleTruncate(str, n) {
  const fileExtensionPattern = /([^.]*)$/;
  const extensionMatch = str.includes(".") && str.match(fileExtensionPattern);

  if (str.length <= n) return str;

  if (extensionMatch && extensionMatch[1]) {
    const extension = extensionMatch[1];
    const nameWithoutExtension = str.replace(fileExtensionPattern, "");
    const truncationPoint = Math.max(0, n - extension.length - 4);
    const truncatedName =
      nameWithoutExtension.substr(0, truncationPoint) +
      "..." +
      nameWithoutExtension.slice(-4);

    return truncatedName + extension;
  } else {
    return str.length > n ? str.substr(0, n - 8) + "..." + str.slice(-4) : str;
  }
}

/**
 * The folder every upload without an explicit destination lands in. Its name
 * is hardcoded across the server, the collector and the picker (and the server
 * refuses to rename or remove it), so it is relabelled for display only -
 * never in a value sent back to the API.
 */
export const DEFAULT_DOCUMENTS_FOLDER = "custom-documents";

/**
 * A user's own uploads folder is named after their id so renaming the account
 * cannot orphan it - which makes it unreadable on screen. Matches the server's
 * `DocumentFolder.privateFolderName`.
 */
const PRIVATE_FOLDER_PATTERN = /^user-(\d+)$/;

/**
 * The label to show a user for a folder. Only the two folders the system names
 * itself differ from their stored name - every other folder was named by a
 * person already.
 * @param {string} name - the folder's real name, as stored
 * @returns {string}
 */
export function folderDisplayName(name = "") {
  if (name === DEFAULT_DOCUMENTS_FOLDER)
    return i18next.t("connectors.directory.default-folder");

  const owned = PRIVATE_FOLDER_PATTERN.exec(name);
  if (owned) {
    // Someone else's private folder is filtered out server-side, so reaching
    // here for another id means an operator holding documents.view_all - show
    // them the real name rather than claiming it is theirs.
    const user = userFromStorage();
    if (user?.id && String(user.id) === owned[1])
      return i18next.t("connectors.directory.my-folder");
  }
  return name;
}

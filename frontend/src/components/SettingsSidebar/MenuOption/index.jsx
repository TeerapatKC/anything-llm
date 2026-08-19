import React, { useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { safeJsonParse } from "@/utils/request";
import { isPathMatch } from "@/utils/paths";
import useScrollActiveItemIntoView from "@/hooks/useScrollActiveItemIntoView";
import { userCanAny } from "@/utils/permissions";

export default function MenuOption({
  btnText,
  icon,
  href,
  childOptions = [],
  user = null,
  permissions = [],
  hidden = false,
  isChild = false,
}) {
  const storageKey = generateStorageKey({ key: btnText });
  const location = useLocation();
  const hasChildren = childOptions.length > 0;
  const hasVisibleChildren = hasVisibleOptions(user, childOptions);
  const { isExpanded, setIsExpanded } = useIsExpanded({
    storageKey,
    hasVisibleChildren,
    childOptions,
    location: location.pathname,
  });

  const isActive = hasChildren
    ? (!isExpanded &&
        childOptions.some((child) =>
          isPathMatch(child.href, location.pathname)
        )) ||
      location.pathname === href
    : isPathMatch(href, location.pathname);

  const { ref } = useScrollActiveItemIntoView({
    isActive,
    behavior: "instant",
    block: "center",
  });

  if (hidden) return null;

  // If this option is a parent level option
  if (!isChild) {
    // and has no children then use its permissions prop directly
    if (!hasChildren && !isVisibleTo(user, permissions)) return null;

    // if has children and no visible children - remove it.
    if (hasChildren && !hasVisibleChildren) return null;
  } else {
    // is a child so we use it's permissions
    if (!isVisibleTo(user, permissions)) return null;
  }

  const handleClick = (e) => {
    if (hasChildren) {
      e.preventDefault();
      const newExpandedState = !isExpanded;
      setIsExpanded(newExpandedState);
      localStorage.setItem(storageKey, JSON.stringify(newExpandedState));
    }
  };

  return (
    <div>
      <div
        className={`
          flex items-center justify-between w-full
          transition-all duration-300
          rounded-[6px]
          ${
            isActive
              ? "bg-theme-sidebar-subitem-selected font-medium border-outline"
              : "hover:bg-theme-sidebar-subitem-hover"
          }
        `}
      >
        <Link
          ref={ref}
          to={href}
          className={`flex grow items-center px-[12px] h-[32px] font-medium ${
            isChild
              ? "hover:text-white"
              : "text-theme-text-primary light:text-black"
          }`}
          onClick={hasChildren ? handleClick : undefined}
        >
          {icon}
          <p
            className={`${
              isChild ? "text-xs" : "text-sm"
            } leading-loose whitespace-nowrap overflow-hidden ml-2 ${
              isActive
                ? "text-theme-text-primary font-semibold"
                : "text-theme-text-primary light:text-black"
            } ${!icon && "pl-5"}`}
          >
            {btnText}
          </p>
        </Link>
        {hasChildren && (
          <button onClick={handleClick} className="p-2 text-theme-text-primary">
            <ChevronRight
              size={16}
              // color={isExpanded ? "#000000" : "var(--theme-sidebar-subitem-icon)"}
              className={`transition-transform text-theme-text-primary light:text-black ${
                isExpanded ? "rotate-90" : ""
              }`}
            />
          </button>
        )}
      </div>
      {isExpanded && hasChildren && (
        <div className="mt-1 rounded-r-lg w-full">
          {childOptions.map((childOption, index) => (
            <MenuOption
              key={index}
              {...childOption} // permissions go here.
              user={user}
              isChild={true}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function useIsExpanded({
  storageKey = "",
  hasVisibleChildren = false,
  childOptions = [],
  location = null,
}) {
  const [isExpanded, setIsExpanded] = useState(() => {
    if (hasVisibleChildren) {
      const storedValue = localStorage.getItem(storageKey);
      if (storedValue !== null) {
        return safeJsonParse(storedValue, false);
      }
      return childOptions.some((child) => isPathMatch(child.href, location));
    }
    return false;
  });

  useEffect(() => {
    if (hasVisibleChildren) {
      const shouldExpand = childOptions.some((child) =>
        isPathMatch(child.href, location)
      );
      if (shouldExpand && !isExpanded) {
        setIsExpanded(true);
        localStorage.setItem(storageKey, JSON.stringify(true));
      }
    }
  }, [location]);

  return { isExpanded, setIsExpanded };
}

/**
 * Whether an option is shown to a user. An option is only ever shown to a signed-in user
 * whose role grants one of its permissions.
 * @param {Object|null} user
 * @param {string[]} permissions
 * @returns {boolean}
 */
function isVisibleTo(user, permissions = []) {
  if (!user) return false;
  return userCanAny(permissions, user);
}

/**
 * Whether any child option is visible to the user. If none are, the parent option is
 * hidden too rather than expanding into an empty list.
 * @param {object} user - The user object.
 * @param {array} childOptions - The child options.
 * @returns {boolean}
 */
function hasVisibleOptions(user = null, childOptions = []) {
  if (!Array.isArray(childOptions) || childOptions?.length === 0) return false;
  return childOptions.some(
    (opt) => !opt.hidden && isVisibleTo(user, opt.permissions)
  );
}

function generateStorageKey({ key = "" }) {
  const _key = key.replace(/\s+/g, "_").toLowerCase();
  return `anything_llm_menu_${_key}_expanded`;
}

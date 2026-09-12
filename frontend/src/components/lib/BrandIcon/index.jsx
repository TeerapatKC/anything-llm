import React from "react";
import { cn } from "@/lib/utils";

/**
 * Brand marks that lucide does not ship.
 *
 * lucide dropped its brand icons over trademark concerns. Most marks here are
 * the `fill` weight from Phosphor Icons (MIT, © 2023 Phosphor Icons) traced on
 * Phosphor's 256x256 grid. Telegram and LINE use full-colour SVGs from
 * logos.lndev.me.
 *
 * The vector props mirror lucide's: `size` sets both dimensions, `className`
 * merges, and each vector glyph paints with `currentColor`.
 */

/** Phosphor draws on a 256x256 grid; lucide uses 24x24. */
const VIEW_BOX = "0 0 256 256";

const BRAND_PATHS = {
  apple:
    "M128.23,30A40,40,0,0,1,167,0h1a8,8,0,0,1,0,16h-1a24,24,0,0,0-23.24,18,8,8,0,1,1-15.5-4ZM223.3,169.59a8.07,8.07,0,0,0-2.8-3.4C203.53,154.53,200,134.64,200,120c0-17.67,13.47-33.06,21.5-40.67a8,8,0,0,0,0-11.62C208.82,55.74,187.82,48,168,48a72.23,72.23,0,0,0-40,12.13,71.56,71.56,0,0,0-90.71,9.09A74.63,74.63,0,0,0,16,123.4a127,127,0,0,0,40.14,89.73A39.8,39.8,0,0,0,83.59,224h87.68a39.84,39.84,0,0,0,29.12-12.57,125,125,0,0,0,17.82-24.6C225.23,174,224.33,172,223.3,169.59Z",
  discord:
    "M247.51,174.39,218,58a16.08,16.08,0,0,0-13-11.88l-36.06-5.92a16.22,16.22,0,0,0-18.26,11.88l-.21.85a4,4,0,0,0,3.27,4.93,155.62,155.62,0,0,1,24.41,5.62,8.2,8.2,0,0,1,5.62,9.7,8,8,0,0,1-10.19,5.64,155.4,155.4,0,0,0-90.8-.1,8.22,8.22,0,0,1-10.28-4.81,8,8,0,0,1,5.08-10.33,156.85,156.85,0,0,1,24.72-5.72,4,4,0,0,0,3.27-4.93l-.21-.85A16.21,16.21,0,0,0,87.08,40.21L51,46.13A16.08,16.08,0,0,0,38,58L8.49,174.39a15.94,15.94,0,0,0,9.06,18.51l67,29.71a16.17,16.17,0,0,0,21.71-9.1l3.49-9.45a4,4,0,0,0-3.27-5.35,158.13,158.13,0,0,1-28.63-6.2,8.2,8.2,0,0,1-5.61-9.67,8,8,0,0,1,10.2-5.66,155.59,155.59,0,0,0,91.12,0,8,8,0,0,1,10.19,5.65,8.19,8.19,0,0,1-5.61,9.68,157.84,157.84,0,0,1-28.62,6.2,4,4,0,0,0-3.27,5.35l3.49,9.45a16.18,16.18,0,0,0,21.71,9.1l67-29.71A15.94,15.94,0,0,0,247.51,174.39ZM92,152a12,12,0,1,1,12-12A12,12,0,0,1,92,152Zm72,0a12,12,0,1,1,12-12A12,12,0,0,1,164,152Z",
  youtube:
    "M234.33,69.52a24,24,0,0,0-14.49-16.4C185.56,39.88,131,40,128,40s-57.56-.12-91.84,13.12a24,24,0,0,0-14.49,16.4C19.08,79.5,16,97.74,16,128s3.08,48.5,5.67,58.48a24,24,0,0,0,14.49,16.41C69,215.56,120.4,216,127.34,216h1.32c6.94,0,58.37-.44,91.18-13.11a24,24,0,0,0,14.49-16.41c2.59-10,5.67-28.22,5.67-58.48S236.92,79.5,234.33,69.52Zm-73.74,65-40,28A8,8,0,0,1,108,156V100a8,8,0,0,1,12.59-6.55l40,28a8,8,0,0,1,0,13.1Z",
};

/**
 * @param {{brand: keyof typeof BRAND_PATHS, size?: number|string, className?: string, title?: string}} props
 */
export function BrandIcon({ brand, size, className, title, ...props }) {
  const path = BRAND_PATHS[brand];
  if (!path) return null;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={VIEW_BOX}
      width={size}
      height={size}
      fill="currentColor"
      // Sized like a lucide icon unless the call site says otherwise.
      className={cn("shrink-0", size ? null : "size-4", className)}
      role={title ? "img" : "presentation"}
      aria-hidden={title ? undefined : "true"}
      {...props}
    >
      {title ? <title>{title}</title> : null}
      <path d={path} />
    </svg>
  );
}

const brandIcon = (brand, displayName) => {
  const Icon = (props) => <BrandIcon brand={brand} {...props} />;
  Icon.displayName = displayName;
  return Icon;
};

export const AppleLogo = brandIcon("apple", "AppleLogo");
export const DiscordLogo = brandIcon("discord", "DiscordLogo");
export function TelegramLogo({ size, className, ...props }) {
  return (
    <img
      src="https://logos.lndev.me/logos/telegram.svg"
      alt=""
      width={size}
      height={size}
      className={cn(
        "shrink-0 object-contain",
        size ? null : "size-5",
        className
      )}
      {...props}
    />
  );
}
export function LineLogo({ size, className, ...props }) {
  return (
    <img
      src="https://logos.lndev.me/logos/line.svg"
      alt=""
      width={size}
      height={size}
      className={cn(
        "shrink-0 object-contain",
        size ? null : "size-5",
        className
      )}
      {...props}
    />
  );
}
export const YoutubeLogo = brandIcon("youtube", "YoutubeLogo");

export default BrandIcon;

import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Switch } from "@/components/ui/switch";

/**
 * This component used to hand-roll its own switch out of a hidden checkbox and
 * a styled div, with green/zinc colours written literally. It now renders the
 * shadcn `Switch`, so the on/off colours come from `--primary` and `--input`
 * and therefore track both themes. Only this size map is app-specific — it
 * keeps the three sizes the ~33 call sites already pass.
 */
const SWITCH_SIZES = { sm: "sm", md: "default", lg: "lg" };

const LABEL_STYLES = {
  sm: {
    label: "text-[12px] leading-[10px] font-medium mt-[1.5px]",
    description: "text-[10px] leading-[16px] font-normal",
    gap: "gap-[2px]",
  },
  md: {
    label: "text-[14px] leading-[18px] font-medium mt-[-2px]",
    description: "text-[12px] leading-[16px] font-normal",
    gap: "gap-[2px]",
  },
  lg: {
    label: "text-[16px] leading-[14px] font-medium mt-[2.5px]",
    description: "text-[14px] leading-[24px] font-normal",
    gap: "gap-[2px]",
  },
};

/**
 * @param {Object} props - Component props
 * @param {string} [props.className] - Additional CSS classes
 * @param {boolean} [props.enabled] - Controlled checked state
 * @param {(checked: boolean) => void} [props.onChange] - Change handler receiving new checked state
 * @param {boolean} [props.disabled=false] - Whether toggle is disabled
 * @param {"sm" | "md" | "lg"} [props.size="sm"] - Toggle size
 * @param {string} [props.name] - Input name for form submission
 * @param {string} [props.label] - Label text next to toggle
 * @param {string} [props.description] - Description text below label
 * @param {"default" | "horizontal"} [props.variant="default"] - Layout variant
 * @param {import("react").ReactNode} [props.hint] - Tooltip content for the info
 * icon next to the label. This was a react-tooltip id resolved against a
 * definition elsewhere; it is now the content itself.
 * @param {string} [props.value] - Input value for form submission
 * @param {string} [props.labelClassName] - Additional CSS classes for label
 * @param {string} [props.descriptionClassName] - Additional CSS classes for description
 * @param {string} [props.gapClassName] - Additional CSS classes for gap
 */
export default function Toggle({
  className,
  enabled,
  onChange,
  disabled = false,
  size = "sm",
  name,
  label,
  description,
  variant = "default",
  hint,
  value,
  labelClassName,
  descriptionClassName,
  gapClassName,
}) {
  const inputProps =
    enabled !== undefined
      ? { checked: enabled, onCheckedChange: (checked) => onChange?.(checked) }
      : { defaultChecked: false };

  const labelStyles = LABEL_STYLES[size] || LABEL_STYLES.sm;

  if (variant === "horizontal") {
    return (
      <label
        className={`flex items-start justify-between max-w-[700px] ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"} ${className ?? ""}`}
      >
        <TextContent
          label={label}
          description={description}
          labelStyles={labelStyles}
          hint={hint}
          labelClassName={labelClassName}
          descriptionClassName={descriptionClassName}
          gapClassName={gapClassName}
        />
        <div className="shrink-0 ml-4">
          <ToggleSwitch
            name={name}
            disabled={disabled}
            size={size}
            inputProps={inputProps}
            value={value}
          />
        </div>
      </label>
    );
  }

  return (
    <label
      className={`inline-flex items-start ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"} ${className ?? ""}`}
    >
      <ToggleSwitch
        name={name}
        disabled={disabled}
        size={size}
        inputProps={inputProps}
        value={value}
      />
      {(label || description) && (
        <div className="ml-3">
          <TextContent
            label={label}
            description={description}
            labelStyles={labelStyles}
            hint={hint}
            labelClassName={labelClassName}
            descriptionClassName={descriptionClassName}
            gapClassName={gapClassName}
          />
        </div>
      )}
    </label>
  );
}

function ToggleSwitch({ name, disabled, size, inputProps, value }) {
  return (
    <Switch
      name={name}
      value={value}
      disabled={disabled}
      size={SWITCH_SIZES[size] ?? SWITCH_SIZES.sm}
      {...inputProps}
    />
  );
}

function TextContent({
  label,
  description,
  labelStyles = {},
  hint,
  labelClassName,
  descriptionClassName,
  gapClassName,
}) {
  if (!label && !description) return null;
  return (
    <div className={`flex flex-col ${gapClassName ?? labelStyles.gap}`}>
      {label && (
        <span
          className={`flex items-center gap-x-1 text-foreground ${labelClassName ?? labelStyles.label}`}
        >
          {label}
          {hint && (
            <Tooltip>
              <TooltipTrigger
                render={
                  <Info
                    size={14}
                    className="text-muted-foreground cursor-pointer"
                  />
                }
              ></TooltipTrigger>
              <TooltipContent side="top" className="max-w-[250px] text-xs">
                {hint}
              </TooltipContent>
            </Tooltip>
          )}
        </span>
      )}
      {description && (
        <span
          className={`text-muted-foreground ${descriptionClassName ?? labelStyles.description}`}
        >
          {description}
        </span>
      )}
    </div>
  );
}

/**
 * The same switch without the wrapping <label>, for rows that already handle
 * their own click target and where a label's focus-scroll behaviour got in the
 * way. Kept as a separate export so those call sites read unchanged.
 */
export function SimpleToggleSwitch({
  className,
  enabled,
  onChange,
  disabled = false,
  size = "sm",
}) {
  return (
    <Switch
      className={className}
      checked={enabled}
      disabled={disabled}
      size={SWITCH_SIZES[size] ?? SWITCH_SIZES.sm}
      onCheckedChange={(checked) => onChange?.(checked)}
      onClick={(e) => e.stopPropagation()}
    />
  );
}

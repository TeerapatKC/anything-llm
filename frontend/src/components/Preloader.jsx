import { Spinner } from "@/components/ui/spinner";

/**
 * Kept as a thin alias over the `Spinner` primitive so the call sites that
 * still import it keep working while the app converges on one loading idiom.
 *
 * The old implementation composed its classes as `h-${size} w-${size}`, which
 * Tailwind's scanner cannot see: those utilities only existed when an
 * unrelated file happened to use the same one, and `size="[100px]"` produced
 * no size at all. Sizes now map onto the primitive's fixed scale.
 *
 * @param {{ size?: string|number }} props Legacy Tailwind spacing step.
 */
export default function PreLoader({ size = "16" }) {
  // `text-primary` keeps the accent ring the old implementation drew with
  // `border-primary`; the primitive itself inherits its colour.
  return (
    <Spinner size={SIZE_MAP[String(size)] ?? "xl"} className="text-primary" />
  );
}

const SIZE_MAP = {
  3: "xs",
  4: "sm",
  6: "md",
  8: "lg",
  10: "lg",
  16: "xl",
};

/** Blocking loader shown while the app decides what to render. */
export function FullScreenLoader() {
  return (
    <div
      id="preloader"
      className="fixed left-0 top-0 z-999999 flex h-screen w-screen items-center justify-center bg-theme-bg-primary text-(--theme-loader)"
    >
      <Spinner size="xl" />
    </div>
  );
}

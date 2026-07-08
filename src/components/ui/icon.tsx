import { cn } from "@/lib/utils";

/**
 * Thin wrapper around Google's "Material Symbols" icon font (self-hosted via
 * the `material-symbols` npm package, Rounded family - see src/index.css for
 * the stylesheet import). Renders the icon as ligature text, so `name` must
 * be the symbol's exact snake_case name (e.g. "link_2", "next_plan").
 *
 * Every icon in the app uses the unfilled/"standard" weight by default;
 * pass `fill` for the rare filled variant (currently just the block editor's
 * Mode selector).
 */
export function Icon({
  name,
  fill = false,
  size = 20,
  className,
}: {
  name: string;
  fill?: boolean;
  size?: number;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn("material-symbols-rounded shrink-0 leading-none select-none", className)}
      style={{ fontSize: size, fontVariationSettings: `'FILL' ${fill ? 1 : 0}` }}
    >
      {name}
    </span>
  );
}

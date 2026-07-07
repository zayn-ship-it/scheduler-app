/**
 * colorPresets.ts
 * ---------------------------------------------------------------------------
 * A constrained palette of block colours, offered as the primary colour
 * picker UI (rather than a raw hex input) so schedules stay visually
 * consistent across projects. Any valid CSS color string still works if a
 * block was created with a custom color (e.g. imported data), the swatches
 * are just the easy default choices.
 */
export interface ColorPreset {
  name: string;
  value: string;
}

export const COLOR_PRESETS: ColorPreset[] = [
  { name: "Slate", value: "#475569" },
  { name: "Red", value: "#dc2626" },
  { name: "Orange", value: "#ea580c" },
  { name: "Amber", value: "#d97706" },
  { name: "Green", value: "#16a34a" },
  { name: "Teal", value: "#0d9488" },
  { name: "Blue", value: "#2563eb" },
  { name: "Indigo", value: "#4f46e5" },
  { name: "Purple", value: "#9333ea" },
  { name: "Pink", value: "#db2777" },
];

/** Extra grey/slate shades, offered alongside COLOR_PRESETS for RJF blocks (which lean toward a neutral, monochrome look). */
export const GREY_SHADES: ColorPreset[] = [
  { name: "Slate 300", value: "#cbd5e1" },
  { name: "Slate 400", value: "#94a3b8" },
  { name: "Slate 500", value: "#64748b" },
  { name: "Slate 700", value: "#334155" },
  { name: "Slate 800", value: "#1e293b" },
  { name: "Slate 900", value: "#0f172a" },
];

/** Light/medium/dark shade hexes for each COLOR_PRESETS entry, keyed by preset name. */
const SHADES: Record<string, { light: string; medium: string; dark: string }> = {
  Slate: { light: "#cbd5e1", medium: "#64748b", dark: "#1e293b" },
  Red: { light: "#fca5a5", medium: "#ef4444", dark: "#991b1b" },
  Orange: { light: "#fdba74", medium: "#f97316", dark: "#9a3412" },
  Amber: { light: "#fcd34d", medium: "#f59e0b", dark: "#92400e" },
  Green: { light: "#86efac", medium: "#22c55e", dark: "#166534" },
  Teal: { light: "#5eead4", medium: "#14b8a6", dark: "#115e59" },
  Blue: { light: "#93c5fd", medium: "#3b82f6", dark: "#1e40af" },
  Indigo: { light: "#a5b4fc", medium: "#6366f1", dark: "#3730a3" },
  Purple: { light: "#d8b4fe", medium: "#a855f7", dark: "#6b21a8" },
  Pink: { light: "#f9a8d4", medium: "#ec4899", dark: "#9d174d" },
};

/**
 * Each COLOR_PRESETS entry plus 3 additional shades (light/medium/dark) of
 * the same colour - a wider palette for places that benefit from finer
 * distinctions between similarly-themed phases, e.g. the Phase Titles list
 * in Settings.
 */
export const EXPANDED_COLOR_PRESETS: ColorPreset[] = COLOR_PRESETS.flatMap((preset) => {
  const shades = SHADES[preset.name];
  return [
    preset,
    { name: `${preset.name} Light`, value: shades.light },
    { name: `${preset.name} Medium`, value: shades.medium },
    { name: `${preset.name} Dark`, value: shades.dark },
  ];
});

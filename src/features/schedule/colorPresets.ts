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

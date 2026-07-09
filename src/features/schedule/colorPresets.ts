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

/** RJF blocks always render in this colour (true black), with no other colour choice offered. */
export const RJF_BLOCK_COLOR = "#000000";

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

/**
 * The colour options offered for Phase Titles in Settings - a single "400"-intensity
 * shade per named hue (no light/medium/dark variants), kept in its own list since
 * phase titles favour a softer, more muted set of tones than block colours.
 */
export const PHASE_COLOR_PRESETS: ColorPreset[] = [
  { name: "Olive", value: "#8a8f66" },
  { name: "Mist", value: "#9fb3bf" },
  { name: "Mauve", value: "#a68fa0" },
  { name: "Taupe", value: "#a89484" },
  { name: "Red", value: "#f87171" },
  { name: "Orange", value: "#fb923c" },
  { name: "Amber", value: "#fbbf24" },
  { name: "Lime", value: "#a3e635" },
  { name: "Green", value: "#4ade80" },
  { name: "Emerald", value: "#34d399" },
  { name: "Teal", value: "#2dd4bf" },
  { name: "Cyan", value: "#22d3ee" },
  { name: "Sky", value: "#38bdf8" },
  { name: "Violet", value: "#a78bfa" },
  { name: "Pink", value: "#f472b6" },
  { name: "Grey", value: "#9ca3af" },
];

/** A distinct-enough fallback color for a person who hasn't picked one yet, based on their position in the (alphabetical) people list - cycles through the same palette Phase Titles use. */
export function defaultPersonColor(index: number): string {
  return PHASE_COLOR_PRESETS[index % PHASE_COLOR_PRESETS.length].value;
}

/**
 * Picks black or white text for a given background hex colour based on
 * WCAG relative luminance, so light backgrounds (e.g. the lighter grey
 * shades) get dark text instead of unreadable white-on-light-grey.
 */
export function getContrastTextColor(hex: string): typeof RJF_BLOCK_COLOR | "#ffffff" {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!match) return "#ffffff";
  const value = match[1];
  const [r, g, b] = [0, 2, 4].map((offset) => parseInt(value.slice(offset, offset + 2), 16) / 255);
  const [rl, gl, bl] = [r, g, b].map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  const luminance = 0.2126 * rl + 0.7152 * gl + 0.0722 * bl;
  // Relative luminance threshold ~0.4 keeps AA contrast (>=4.5:1) for both black and white text across our palette.
  return luminance > 0.4 ? RJF_BLOCK_COLOR : "#ffffff";
}

// Pick a readable foreground (black or white) for an arbitrary hex
// background. Used everywhere we apply `branding.primaryColor` as a button
// or pill background — without this, users who pick a light brand color
// end up with white text on white backgrounds.

export function readableTextOn(bg: string | undefined | null): string {
  if (!bg) return "#ffffff";
  const hex = bg.replace("#", "").trim();
  if (hex.length !== 6 && hex.length !== 3) return "#ffffff";
  const full = hex.length === 3 ? hex.split("").map((c) => c + c).join("") : hex;
  const r = parseInt(full.substring(0, 2), 16);
  const g = parseInt(full.substring(2, 4), 16);
  const b = parseInt(full.substring(4, 6), 16);
  if ([r, g, b].some(Number.isNaN)) return "#ffffff";
  // Relative-luminance approximation per W3C. Threshold 0.6 keeps white text
  // on mid-tone brand colors (dark navy, crimson) while flipping to black on
  // pastels and white.
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#0a0a0a" : "#ffffff";
}

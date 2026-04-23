/**
 * Safely constructs a URL path by filtering out undefined or null segments.
 * Prevents "undefinedundefined" and other malformed URL issues.
 */
export function safePath(base: string, ...segments: (string | number | undefined | null)[]): string {
  const filteredSegments = segments.filter(s => s !== undefined && s !== null && s !== "");
  
  if (filteredSegments.length === 0) return base;
  
  const joined = filteredSegments.join("/");
  // Ensure the base ends with / or the joined part starts with it
  const cleanBase = base.endsWith("/") ? base.slice(0, -1) : base;
  return `${cleanBase}/${joined}`;
}

/**
 * Validates a slug or ID to ensure it is not the string "undefined" or "null".
 */
export function isValidIdentifier(id: string | undefined | null): boolean {
  if (!id) return false;
  const lower = id.toString().toLowerCase();
  // Aggressive check: if "undefined" or "null" appears anywhere in the string, it's malformed
  if (lower.includes("undefined") || lower.includes("null")) return false;
  return lower.trim().length > 0;
}

/**
 * Diagnostic utility to detect malformed URL segments during construction.
 */
export function debugUrl(name: string, value: unknown): void {
  if (value === undefined || value === null || value === "undefined" || value === "null") {
    console.warn(`[URL_SAFETY_WARNING] Potential malformed URL segment detected for "${name}":`, value);
  }
}

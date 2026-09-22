/**
 * Strip HTML tags from user-generated content before persisting it.
 * Defense-in-depth against stored XSS — React escapes output, but content
 * must never enter the database containing markup in the first place.
 */
export function sanitize(input: string): string {
  return input.replace(/<[^>]*>/g, "").trim();
}

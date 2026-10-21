// Which Messages section the inbox opens on. Groups has no nav entry of its
// own — it is a tab inside /messages — so the badge alone was not enough: a
// user whose only unread activity was group messages kept landing on an empty
// Chats tab. Pure helpers so the rule is testable without a browser.

export type MessagesTab = "chats" | "groups";

export function isMessagesTab(value: string | null | undefined): value is MessagesTab {
  return value === "chats" || value === "groups";
}

/** Section to open for an explicit `?tab=` deep link (defaults to chats). */
export function resolveMessagesTab(value: string | null | undefined): MessagesTab {
  return isMessagesTab(value) ? value : "chats";
}

/**
 * Href for the Messages nav entry. When the only unread activity is group
 * messages, the badge should lead to the section that actually has something
 * new; otherwise stay on Chats.
 */
export function messagesHref(dmUnread: number, groupUnread: number): string {
  return dmUnread === 0 && groupUnread > 0 ? "/messages?tab=groups" : "/messages";
}

export interface InboxDeepLink {
  tab: MessagesTab;
  /** Group whose chat should already be open when the inbox mounts. */
  group: string | null;
}

// Ids are Prisma uuids; the pattern is deliberately strict because the value
// is interpolated into a request path. Accept UUIDs (36 chars with hyphens)
// and short ids (alphanumeric + underscore/hyphen).
const GROUP_ID_PATTERN = /^(?:[A-Za-z0-9_-]{1,64}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

/**
 * Reads /messages?tab=...&group=... so a notification can open the inbox with
 * that group's chat already showing — the inbox opens the conversation itself
 * instead of redirecting to the group page. A `group` implies the Groups
 * section, whatever `tab` says.
 */
export function parseInboxDeepLink(search: string): InboxDeepLink {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  // Only an id-shaped value is accepted: this string is interpolated into a
  // fetch path, so junk (`../`, encoded separators) must never ride along. An
  // empty `?group=` is no group at all.
  const raw = params.get("group");
  const group = raw && GROUP_ID_PATTERN.test(raw) ? raw : null;
  return {
    tab: group ? "groups" : resolveMessagesTab(params.get("tab")),
    group,
  };
}

/** Pathname-only match for active nav highlighting (hrefs may carry a query). */
export function isNavActive(pathname: string, href: string): boolean {
  const base = href.split("?")[0];
  return pathname === base || pathname.startsWith(base + "/");
}

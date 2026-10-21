import { publish } from "./bus";

// Shared frame dispatcher for both transports: turns one delta payload (SSE
// "delta" frame or JSON poll response — identical shape) into bus events.
// Cursor management stays in each transport; everything user-facing happens
// here so event semantics can't drift between SSE and polling.

let typingFromSet = new Set<string>(); // everyone seen typing in the previous payload (DMs)
let groupTypingFromMap = new Map<string, Set<string>>(); // groupId -> set of senderIds seen typing
const seenSignals = new Set<string>(); // call signals re-scan the skew window — drop repeats by id

export function dispatchDelta(data: any): void {
  (data.messages || []).forEach((m: any) => publish("new-message", m.message));
  // Changed rows = edits, unsend tombstones, reaction-driven bumps, and my
  // own sends echoed from another device (those never appear in the
  // receiver-only new-rows scan). Dispatch on content shape; publishing
  // both events is safe — every handler dedupes/merges by message id.
  (data.changedMessages || []).forEach((m: any) => {
    if (m.deletedForEveryone) {
      publish("message-deleted", { messageId: m.id });
    } else {
      publish("new-message", m);
      publish("message-edited", { messageId: m.id, content: m.content, editedAt: m.editedAt });
      if (Array.isArray(m.reactions)) {
        publish("message-reaction", { messageId: m.id, reactions: m.reactions });
      }
    }
  });
  // Group rows carry their full shape — tombstones included (soft delete).
  (data.groupMessages || []).forEach((m: any) => publish("new-group-message", m));
  (data.changedGroupMessages || []).forEach((m: any) => {
    if (m.deletedForEveryone) {
      publish("group-message-deleted", { messageId: m.id, groupId: m.groupId });
    } else {
      publish("new-group-message", m);
    }
  });
  (data.reactions || []).forEach((r: any) => publish("message-reaction", r));

  // Unread badge counters (only published on change)
  if (typeof data.unreadNotifications === "number" && data.unreadNotifications !== (dispatchDelta as any)._lastNotifs) {
    (dispatchDelta as any)._lastNotifs = data.unreadNotifications;
    publish("notification-unread", data.unreadNotifications);
  }
  if (typeof data.unreadMessages === "number" && data.unreadMessages !== (dispatchDelta as any)._lastMsgs) {
    (dispatchDelta as any)._lastMsgs = data.unreadMessages;
    publish("messages-unread", data.unreadMessages);
  }
  // Published after the new-group-message events above, so an increment that
  // lands first is corrected by this absolute count in the same tick.
  if (typeof data.unreadGroupMessages === "number" && data.unreadGroupMessages !== (dispatchDelta as any)._lastGroupMsgs) {
    (dispatchDelta as any)._lastGroupMsgs = data.unreadGroupMessages;
    publish("groups-unread", data.unreadGroupMessages);
  }

  // DM Typing: diff against the previous payload so listeners get clean
  // user-typing / user-stop-typing pairs.
  const typingList: Array<{ senderId: string; senderName?: string }> = data.typing || [];
  const freshSet = new Set<string>(typingList.map((t) => t.senderId));
  typingList.forEach((t) => {
    if (!typingFromSet.has(t.senderId)) publish("user-typing", t);
  });
  typingFromSet.forEach((gone: string) => {
    if (!freshSet.has(gone)) publish("user-stop-typing", { senderId: gone });
  });
  typingFromSet = freshSet;

  // Group Typing: per-group diff so listeners get group-user-typing / group-user-stop-typing pairs
  const groupTypingList: Array<{ senderId: string; senderName?: string }> = data.groupTyping || [];
  const freshGroupMap = new Map<string, Set<string>>();
  groupTypingList.forEach((t) => {
    // groupId is not in the typing entry itself — it's the group we're currently in
    // The SSE stream includes groupTyping for the single groupId passed in the URL
    // We'll publish with the groupId from the data
  });
  // Note: SSE only includes groupTyping for one group (the one in the URL),
  // so we can just publish the diff for that group
  if (data.groupId && data.groupTyping) {
    const groupId = data.groupId;
    const prevSet = groupTypingFromMap.get(groupId) || new Set<string>();
    const currSet = new Set<string>(data.groupTyping.map((t: any) => t.senderId));
    data.groupTyping.forEach((t: any) => {
      if (!prevSet.has(t.senderId)) publish("group-user-typing", { ...t, groupId });
    });
    prevSet.forEach((gone: string) => {
      if (!currSet.has(gone)) publish("group-user-stop-typing", { senderId: gone, groupId });
    });
    groupTypingFromMap.set(groupId, currSet);
  }
}

// The SSE server prunes each stream's unread baselines per connection, so a
// fresh stream re-reports the same counts — reset our dedupe state whenever
// the transport reconnects.
export function resetDeltaState(): void {
  typingFromSet = new Set();
  (dispatchDelta as any)._lastNotifs = null;
  (dispatchDelta as any)._lastMsgs = null;
  (dispatchDelta as any)._lastGroupMsgs = null;
}

export function trackSignal(id: string): boolean {
  if (seenSignals.has(id)) return false;
  seenSignals.add(id);
  if (seenSignals.size > 500) {
    // Set iterates in insertion order — prune the oldest quarter
    const oldest: string[] = [];
    seenSignals.forEach((sid: string) => {
      if (oldest.length < 250) oldest.push(sid);
    });
    oldest.forEach((sid: string) => seenSignals.delete(sid));
  }
  return true;
}

import { describe, it, expect } from "vitest";
import {
  resolveMessagesTab,
  messagesHref,
  isNavActive,
  parseInboxDeepLink,
} from "@/lib/messages-inbox";

// The Messages inbox holds two sections, and the nav badge counts both. The
// rule worth pinning is the landing section: group-only unread must not drop
// the user on an empty Chats tab.
describe("Messages inbox section", () => {
  it("honours an explicit tab deep link", () => {
    expect(resolveMessagesTab("groups")).toBe("groups");
    expect(resolveMessagesTab("chats")).toBe("chats");
  });

  it("falls back to Chats for missing or unknown tabs", () => {
    expect(resolveMessagesTab(null)).toBe("chats");
    expect(resolveMessagesTab(undefined)).toBe("chats");
    expect(resolveMessagesTab("")).toBe("chats");
    expect(resolveMessagesTab("nonsense")).toBe("chats");
  });

  it("sends the nav badge to Groups only when group messages are the only unread", () => {
    expect(messagesHref(0, 3)).toBe("/messages?tab=groups");
    expect(messagesHref(1, 3)).toBe("/messages"); // DMs unread too → Chats first
    expect(messagesHref(2, 0)).toBe("/messages");
    expect(messagesHref(0, 0)).toBe("/messages");
  });

  it("parses the notification deep link into tab + open group", () => {
    // This is what a group-post row hands the inbox: the conversation must be
    // open on arrival, with no second navigation.
    expect(parseInboxDeepLink("?tab=groups&group=g1")).toEqual({
      tab: "groups",
      group: "g1",
    });
    // A group implies the Groups section even if tab says otherwise.
    expect(parseInboxDeepLink("?tab=chats&group=g1")).toEqual({
      tab: "groups",
      group: "g1",
    });
    expect(parseInboxDeepLink("?tab=groups")).toEqual({ tab: "groups", group: null });
    expect(parseInboxDeepLink("")).toEqual({ tab: "chats", group: null });
    expect(parseInboxDeepLink("?tab=nonsense&group=")).toEqual({
      tab: "chats",
      group: null,
    });
  });

  it("rejects values that are not group ids", () => {
    // The group id is interpolated into a fetch path, so anything that is not
    // id-shaped is dropped rather than requested.
    expect(parseInboxDeepLink("?tab=groups&group=../messages")).toEqual({
      tab: "groups",
      group: null,
    });
    expect(parseInboxDeepLink("?tab=groups&group=a%2Fb")).toEqual({
      tab: "groups",
      group: null,
    });
    expect(parseInboxDeepLink("?group=9d8f2c1a-1b4e-4c7a-9f3d-0a1b2c3d4e5f")).toEqual({
      tab: "groups",
      group: "9d8f2c1a-1b4e-4c7a-9f3d-0a1b2c3d4e5f",
    });
  });

  it("matches nav highlighting on the pathname, ignoring a query", () => {
    expect(isNavActive("/messages", "/messages?tab=groups")).toBe(true);
    expect(isNavActive("/messages/42", "/messages?tab=groups")).toBe(true);
    expect(isNavActive("/messages", "/messages")).toBe(true);
    expect(isNavActive("/feed", "/messages?tab=groups")).toBe(false);
    // Must not treat /messagesX as a child of /messages.
    expect(isNavActive("/messages-archive", "/messages")).toBe(false);
  });
});

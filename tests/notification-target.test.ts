import { describe, it, expect } from "vitest";
import { notificationTarget } from "@/lib/notification-target";

// Tap targets for the notification list. The interesting cases are the legacy
// rows written before a target was stored: they must still land somewhere
// sensible instead of dead-ending.
describe("notificationTarget", () => {
  it("opens the blog for a blog comment", () => {
    expect(notificationTarget({ type: "blog_comment", postId: "b1" })).toBe("/blogs/b1");
  });

  it("opens the group's chat inside the Messages inbox for a group post", () => {
    // Groups live in Messages, and the inbox opens the conversation itself —
    // no redirect to the group page.
    expect(notificationTarget({ type: "group_post", postId: "g1" })).toBe(
      "/messages?tab=groups&group=g1"
    );
  });

  it("sends likes and comments to the feed, highlighted on the post", () => {
    expect(notificationTarget({ type: "like", postId: "p1" })).toBe("/feed?post=p1");
    expect(notificationTarget({ type: "comment", postId: "p1" })).toBe("/feed?post=p1");
  });

  it("opens the follower's profile", () => {
    expect(notificationTarget({ type: "follow", fromUser: { username: "alice" } })).toBe(
      "/profile/alice"
    );
  });

  it("falls back to the section index for rows with no stored target", () => {
    expect(notificationTarget({ type: "group_post", postId: null })).toBe("/messages?tab=groups");
    expect(notificationTarget({ type: "blog_comment", postId: null })).toBe("/blogs");
    expect(notificationTarget({ type: "like", postId: null })).toBe("/feed");
  });

  it("returns null when there is nothing to open", () => {
    // A follow with no username can't produce a profile link — better a
    // non-clickable row than a broken navigation.
    expect(notificationTarget({ type: "follow", fromUser: null })).toBeNull();
    expect(notificationTarget({ type: "message" })).toBeNull();
    expect(notificationTarget({ type: "unknown_future_type", postId: "x" })).toBeNull();
  });
});

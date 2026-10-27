import { describe, it, expect } from "vitest";
import { pushTarget } from "@/lib/notifications/notification-target";

// A push notification and the matching in-app row must land in the same
// place. Before this, the like and comment senders hand-built `/posts/${id}` —
// a route that has never existed — so those taps dead-ended while the
// notification list opened the highlighted post on /feed. The senders now all
// go through pushTarget, so this pins the two sources of truth together.
describe("pushTarget", () => {
  it("sends like and comment pushes to the highlighted feed post", () => {
    // There is no post-detail page; /feed?post= scrolls to and rings the post.
    expect(pushTarget({ type: "like", postId: "p1" })).toBe("/feed?post=p1");
    expect(pushTarget({ type: "comment", postId: "p1" })).toBe("/feed?post=p1");
  });

  it("opens the group's chat inside the Messages inbox for a group post", () => {
    expect(pushTarget({ type: "group_post", postId: "g1" })).toBe(
      "/messages?tab=groups&group=g1"
    );
  });

  it("opens the blog for a blog comment", () => {
    expect(pushTarget({ type: "blog_comment", postId: "b1" })).toBe("/blogs/b1");
  });

  it("opens the follower's profile for a follow", () => {
    expect(pushTarget({ type: "follow", username: "alice" })).toBe("/profile/alice");
  });

  it("never produces a dead /posts/{id} link", () => {
    // Regression: the post-detail route does not exist. Every target must be
    // a page that actually renders.
    const targets = [
      pushTarget({ type: "like", postId: "p1" }),
      pushTarget({ type: "comment", postId: "p1" }),
      pushTarget({ type: "group_post", postId: "g1" }),
      pushTarget({ type: "blog_comment", postId: "b1" }),
    ];
    for (const url of targets) {
      expect(url).not.toMatch(/^\/posts\//);
    }
  });

  it("returns null when there is nothing to open", () => {
    // A follow with no username can't build a profile link — senders fall back
    // to a safe index rather than navigating to /profile/ with a bare slash.
    expect(pushTarget({ type: "follow", username: null })).toBeNull();
    expect(pushTarget({ type: "unknown_future_type", postId: "x" })).toBeNull();
  });
});

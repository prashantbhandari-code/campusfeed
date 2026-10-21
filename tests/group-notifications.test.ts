import { describe, it, expect } from "vitest";
import { groupNotifications } from "@/lib/group-notifications";

// Rows are links now, so collapsing may only merge rows that open the SAME
// destination — otherwise "· 3×" advertises three events while the link opens
// one. These tests pin that rule and the crash-safety of the helper.
describe("groupNotifications", () => {
  const row = (id: string, over: Record<string, unknown> = {}) => ({
    id,
    type: "like",
    fromUserId: "a1",
    postId: "p1",
    read: true,
    ...over,
  });

  it("collapses consecutive rows that open the same destination", () => {
    const grouped = groupNotifications([row("n1"), row("n2"), row("n3")]);
    expect(grouped).toHaveLength(1);
    expect(grouped[0]).toMatchObject({ id: "n1", count: 3 });
  });

  it("keeps rows apart when they point at different targets", () => {
    const grouped = groupNotifications([
      row("n1", { postId: "p1" }),
      row("n2", { postId: "p2" }),
    ]);
    expect(grouped).toHaveLength(2);
    expect(grouped[0].count).toBeUndefined();
  });

  it("treats a missing target the same as any other missing target", () => {
    const grouped = groupNotifications([
      row("n1", { postId: null }),
      row("n2", { postId: undefined }),
    ]);
    expect(grouped).toHaveLength(1);
    expect(grouped[0]).toMatchObject({ count: 2 });
  });

  it("only merges consecutive runs, not distant duplicates", () => {
    const grouped = groupNotifications([
      row("n1"),
      row("n2", { fromUserId: "b2" }),
      row("n3"),
    ]);
    expect(grouped.map((g) => g.id)).toEqual(["n1", "n2", "n3"]);
  });

  it("does not merge across different types", () => {
    const grouped = groupNotifications([
      row("n1"),
      row("n2", { type: "comment" }),
    ]);
    expect(grouped).toHaveLength(2);
  });

  it("survives an API error payload instead of crashing the page", () => {
    // The notifications API returns {error} when the session is gone; the
    // page must still render its empty state.
    expect(groupNotifications({ error: "Unauthorized" })).toEqual([]);
    expect(groupNotifications(null)).toEqual([]);
    expect(groupNotifications(undefined)).toEqual([]);
    expect(groupNotifications([])).toEqual([]);
  });
});

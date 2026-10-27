// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import React from "react";
import MessagesPage from "@/app/(main)/messages/page";

// The requirement this file pins: opening a group from the Messages > Groups
// list must NOT route away to the group page — the conversation opens inside
// the inbox, on the same URL. Boundary modules are mocked so the page's own
// behaviour is what gets asserted.

const h = vi.hoisted(() => ({
  push: vi.fn(),
  publish: vi.fn(),
  chatProps: [] as { groupId: string; isMember: boolean; isAdmin?: boolean }[],
  // Held open by a test so the group-detail response can be observed mid-flight.
  detailGate: { promise: Promise.resolve() as Promise<void> },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: h.push, replace: vi.fn(), back: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/messages",
  useParams: () => ({}),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: any) =>
    React.createElement(
      "a",
      { href: typeof href === "string" ? href : "#", ...rest },
      children
    ),
}));

vi.mock("@/lib/auth/session", () => ({
  useSession: () => ({ data: { user: { id: "u1", name: "Me", username: "me" } } }),
}));

vi.mock("@/lib/hooks/useSocket", () => ({
  useSocket: () => ({ onlineUsers: [], emit: vi.fn() }),
  useSocketEvent: vi.fn(),
}));

vi.mock("@/lib/notifications/useUnreadGroups", () => ({ useUnreadGroups: () => 0 }));

vi.mock("@/lib/realtime/bus", () => ({
  subscribe: () => () => {},
  publish: h.publish,
}));

// GroupChat is a boundary (socket rooms, media recorder): what matters here is
// that it renders, in place, with the right id/membership.
vi.mock("@/components/chat/GroupChat", () => ({
  default: (props: any) => {
    h.chatProps.push({ groupId: props.groupId, isMember: props.isMember, isAdmin: props.isAdmin });
    return React.createElement("div", { "data-testid": "group-chat" }, `chat:${props.groupId}`);
  },
}));

const jsonResponse = (body: unknown) =>
  ({ ok: true, json: () => Promise.resolve(body) }) as Response;

vi.stubGlobal(
  "fetch",
  vi.fn((input: any) => {
    const url = String(input);
    if (url.startsWith("/api/groups/")) {
      // Gated so a test can hold the detail response open while asserting the
      // chat still renders for a list click (membership is already known).
      return h.detailGate.promise.then(() =>
        jsonResponse({
          id: url.split("/").pop(),
          name: "CSE Gang",
          avatar: null,
          department: "CSE",
          isMember: true,
          myRole: "admin",
          unreadCount: 0,
        })
      );
    }
    if (url === "/api/groups") {
      return Promise.resolve(
        jsonResponse([
          {
            id: "g1",
            name: "CSE Gang",
            avatar: null,
            department: "CSE",
            isMember: true,
            memberCount: 3,
            postCount: 1,
          },
        ])
      );
    }
    if (url === "/api/messages") return Promise.resolve(jsonResponse([]));
    return Promise.resolve(jsonResponse([]));
  })
);

beforeEach(() => {
  h.detailGate.promise = Promise.resolve();
  h.chatProps.length = 0;
});

afterEach(() => cleanup());

describe("Messages > Groups — chat opens in place", () => {
  it("opens the conversation without routing to the group page", async () => {
    window.history.pushState({}, "", "/messages?tab=groups");

    render(React.createElement(MessagesPage));

    const row = await screen.findByText("CSE Gang");
    fireEvent.click(row);

    const chat = await screen.findByTestId("group-chat");
    expect(chat.textContent).toBe("chat:g1");
    // The requirement: no navigation, same URL.
    expect(h.push).not.toHaveBeenCalled();
    expect(window.location.pathname + window.location.search).toBe("/messages?tab=groups");
    // Detail resolved membership + admin role before the pane mounted.
    await waitFor(() => expect(h.chatProps.at(-1)).toMatchObject({ isMember: true, isAdmin: true }));
    expect(screen.getByTitle("Back to groups")).toBeTruthy();
  });

  it("back arrow returns to the group list", async () => {
    window.history.pushState({}, "", "/messages?tab=groups");

    render(React.createElement(MessagesPage));

    fireEvent.click(await screen.findByText("CSE Gang"));
    await screen.findByTestId("group-chat");

    fireEvent.click(screen.getByTitle("Back to groups"));

    await waitFor(() => expect(screen.queryByTestId("group-chat")).toBeNull());
    expect(screen.getByText("CSE Gang")).toBeTruthy();
    expect(h.push).not.toHaveBeenCalled();
  });

  it("shows the chat before the detail fetch lands on a list click", async () => {
    let release!: () => void;
    h.detailGate.promise = new Promise<void>((resolve) => {
      release = resolve;
    });

    window.history.pushState({}, "", "/messages?tab=groups");

    render(React.createElement(MessagesPage));

    fireEvent.click(await screen.findByText("CSE Gang"));
    // The list already told us the viewer is a member, so the pane mounts
    // without waiting for the round-trip that resolves the admin role.
    expect(screen.queryByTestId("group-chat")).not.toBeNull();
    expect(h.push).not.toHaveBeenCalled();

    release();
    await waitFor(() => expect(h.chatProps.at(-1)?.isAdmin).toBe(true));
  });

  it("deep link from a group-post notification opens the chat with no navigation", async () => {
    window.history.pushState({}, "", "/messages?tab=groups&group=g1");

    render(React.createElement(MessagesPage));

    const chat = await screen.findByTestId("group-chat");
    expect(chat.textContent).toBe("chat:g1");
    expect(h.push).not.toHaveBeenCalled();
    expect(window.location.pathname + window.location.search).toBe(
      "/messages?tab=groups&group=g1"
    );
  });
});

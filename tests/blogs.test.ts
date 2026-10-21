import { describe, it, expect, beforeEach, vi } from "vitest";

// Commenting on a blog notifies the blog's author — the one path that can't
// be exercised by hand without two accounts. Pinned here: who gets notified,
// that you never notify yourself, and that a broken fan-out (notification or
// push) can never cost someone their comment.

vi.mock("@/lib/server-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  default: {
    blog: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn() },
    blogComment: { create: vi.fn(), findUnique: vi.fn(), delete: vi.fn() },
    notification: { create: vi.fn() },
  },
}));
vi.mock("@/lib/push", () => ({ sendPush: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/blocking", () => ({ getBlockedIds: vi.fn().mockResolvedValue([]) }));

import { getServerSession } from "@/lib/server-auth";
import prisma from "@/lib/prisma";
import { sendPush } from "@/lib/push";
import { POST, DELETE } from "@/app/api/blogs/[id]/comments/route";
import { GET as listBlogs } from "@/app/api/blogs/route";

const getSession = getServerSession as ReturnType<typeof vi.fn>;
const blogFindUnique = prisma.blog.findUnique as ReturnType<typeof vi.fn>;
const blogFindMany = prisma.blog.findMany as ReturnType<typeof vi.fn>;
const commentCreate = prisma.blogComment.create as ReturnType<typeof vi.fn>;
const commentFindUnique = prisma.blogComment.findUnique as ReturnType<typeof vi.fn>;
const commentDelete = prisma.blogComment.delete as ReturnType<typeof vi.fn>;
const notificationCreate = prisma.notification.create as ReturnType<typeof vi.fn>;
const mockedSendPush = sendPush as ReturnType<typeof vi.fn>;

const ME = "user-1";
const BLOG_AUTHOR = "author-9";

function request(body: Record<string, unknown> = { content: "great post" }) {
  return new Request("http://x/api/blogs/b1/comments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function deleteRequest(commentId: string) {
  return new Request("http://x/api/blogs/b1/comments", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ commentId }),
  });
}

function context(blogId = "b1") {
  return { params: Promise.resolve({ id: blogId }) };
}

beforeEach(() => {
  vi.clearAllMocks();
  getSession.mockResolvedValue({ user: { id: ME, name: "Ann" } });
  blogFindUnique.mockResolvedValue({ authorId: BLOG_AUTHOR, title: "My blog" });
  commentCreate.mockResolvedValue({
    id: "c1",
    content: "great post",
    author: { id: ME, name: "Ann" },
  });
  notificationCreate.mockResolvedValue({});
});

describe("blog comment notifications", () => {
  it("notifies the blog author with type blog_comment pointing at the blog", async () => {
    const res = await POST(request(), context());

    expect(res.status).toBe(201);
    expect(notificationCreate).toHaveBeenCalledWith({
      data: { type: "blog_comment", userId: BLOG_AUTHOR, fromUserId: ME, postId: "b1" },
    });
    expect(mockedSendPush).toHaveBeenCalledWith(
      BLOG_AUTHOR,
      expect.objectContaining({ url: "/blogs/b1" })
    );
  });

  it("never notifies you on your own blog, but still posts the comment", async () => {
    blogFindUnique.mockResolvedValue({ authorId: ME, title: "My blog" });

    const res = await POST(request(), context());

    expect(res.status).toBe(201);
    expect(notificationCreate).not.toHaveBeenCalled();
    expect(mockedSendPush).not.toHaveBeenCalled();
    expect(commentCreate).toHaveBeenCalled();
  });

  it("404s on a missing blog before any comment work", async () => {
    blogFindUnique.mockResolvedValue(null);

    const res = await POST(request(), context());

    expect(res.status).toBe(404);
    expect(commentCreate).not.toHaveBeenCalled();
    expect(notificationCreate).not.toHaveBeenCalled();
  });

  it("still returns the comment when the notification write fails", async () => {
    notificationCreate.mockRejectedValue(new Error("db down"));

    const res = await POST(request(), context());

    expect(res.status).toBe(201);
    await expect(res.json()).resolves.toMatchObject({ id: "c1" });
  });

  it("still returns the comment when push delivery blows up", async () => {
    mockedSendPush.mockRejectedValue(new Error("push down"));

    const res = await POST(request(), context());

    expect(res.status).toBe(201);
  });

  it("400s when sanitize strips the comment to nothing", async () => {
    const res = await POST(request({ content: "<b></b>" }), context());

    expect(res.status).toBe(400);
    expect(commentCreate).not.toHaveBeenCalled();
  });

  it("401s without a session", async () => {
    getSession.mockResolvedValue(null);

    const res = await POST(request(), context());

    expect(res.status).toBe(401);
  });
});

describe("blogs before the tables exist", () => {
  // The feature can ship ahead of its migration. Missing table => 503
  // "not provisioned yet", never a generic 500 — and the guard must be narrow.
  it("answers 503 when the blogs table is missing (P2021)", async () => {
    blogFindMany.mockRejectedValue(
      Object.assign(new Error("The table `blogs` does not exist"), { code: "P2021" })
    );

    const res = await listBlogs(new Request("http://x/api/blogs"));

    expect(res.status).toBe(503);
    await expect(res.json()).resolves.toEqual({ error: "This feature isn't set up yet" });
  });

  it("still surfaces real database errors as 500", async () => {
    blogFindMany.mockRejectedValue(new Error("db down"));

    const res = await listBlogs(new Request("http://x/api/blogs"));

    expect(res.status).toBe(500);
  });
});

describe("blog comment deletion", () => {
  it("deletes your own comment", async () => {
    commentFindUnique.mockResolvedValue({ authorId: ME, blogId: "b1" });

    const res = await DELETE(deleteRequest("c1"), context());

    expect(res.status).toBe(200);
    expect(commentDelete).toHaveBeenCalledWith({ where: { id: "c1" } });
  });

  it("403s on someone else's comment", async () => {
    commentFindUnique.mockResolvedValue({ authorId: "other", blogId: "b1" });

    const res = await DELETE(deleteRequest("c1"), context());

    expect(res.status).toBe(403);
    expect(commentDelete).not.toHaveBeenCalled();
  });

  it("404s when the comment belongs to a different blog", async () => {
    commentFindUnique.mockResolvedValue({ authorId: ME, blogId: "other-blog" });

    const res = await DELETE(deleteRequest("c1"), context());

    expect(res.status).toBe(404);
    expect(commentDelete).not.toHaveBeenCalled();
  });
});

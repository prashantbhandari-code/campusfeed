import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextResponse } from "next/server";

// api-auth.ts + validation.ts are the two enforcement points every route
// leans on after the hardening pass. These tests pin the 401/403 contract
// and the schema rules that guard the LMS/events/push/socketio bodies.

vi.mock("@/lib/server-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    user: { findUnique: vi.fn() },
  },
}));

import { getServerSession } from "@/lib/server-auth";
import prisma from "@/lib/prisma";
import { requireUser, requireAdmin } from "@/lib/api-auth";
import {
  quizTakeSchema,
  adminRoleSchema,
  adminVerifySchema,
  createGroupPostSchema,
  createBlogSchema,
  updateBlogSchema,
  createBlogCommentSchema,
  pushSubscribeSchema,
  socketioSchema,
} from "@/lib/validation";
import { generateUsername } from "@/lib/user";

const getSession = getServerSession as ReturnType<typeof vi.fn>;
const userFindUnique = prisma.user.findUnique as ReturnType<typeof vi.fn>;

const fakeSession = { user: { id: "u1", name: "U", email: "u@x", username: "u", avatar: null, department: null, batchYear: null, rollNumber: null, collegeEmail: null } };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("requireUser", () => {
  it("401s when there is no session — unconditional, no optional chaining escape hatch", async () => {
    getSession.mockResolvedValue(null);
    const result = await requireUser(new Request("http://x/api/feed"));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const res = result.response as NextResponse;
      expect(res.status).toBe(401);
    }
  });

  it("passes the verified session through and never returns a response", async () => {
    getSession.mockResolvedValue(fakeSession);
    const result = await requireUser(new Request("http://x/api/feed"));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.session.user.id).toBe("u1");
  });
});

describe("requireAdmin", () => {
  it("401s without a session, 403s for non-admins, ok for admins", async () => {
    getSession.mockResolvedValueOnce(null);
    expect((await requireAdmin(new Request("http://x"))).ok).toBe(false);

    getSession.mockResolvedValueOnce(fakeSession);
    userFindUnique.mockResolvedValueOnce({ role: "student" });
    const denied = await requireAdmin(new Request("http://x"));
    expect(denied.ok).toBe(false);
    if (!denied.ok) expect((denied.response as NextResponse).status).toBe(403);

    getSession.mockResolvedValueOnce(fakeSession);
    userFindUnique.mockResolvedValueOnce({ role: "admin" });
    const allowed = await requireAdmin(new Request("http://x"));
    expect(allowed.ok).toBe(true);
    if (allowed.ok) expect(allowed.userId).toBe("u1");
  });
});

describe("LMS / admin / push schemas", () => {
  it("quizTakeSchema: defaults missing answers to [], caps array and item length", () => {
    expect(quizTakeSchema.parse({})).toEqual({ answers: [] });
    expect(quizTakeSchema.safeParse({ answers: new Array(201).fill("a") }).success).toBe(false);
    expect(quizTakeSchema.safeParse({ answers: ["x".repeat(2001)] }).success).toBe(false);
  });

  it("adminRoleSchema: only the three real roles pass", () => {
    expect(adminRoleSchema.safeParse({ role: "superadmin" }).success).toBe(false);
    expect(adminRoleSchema.safeParse({ role: 1 }).success).toBe(false);
    expect(adminRoleSchema.parse({ role: "teacher" })).toEqual({ role: "teacher" });
  });

  it("adminVerifySchema: strictly boolean", () => {
    expect(adminVerifySchema.safeParse({ verified: "yes" }).success).toBe(false);
    expect(adminVerifySchema.parse({ verified: false })).toEqual({ verified: false });
  });

  it("createGroupPostSchema: image arrays capped like the main feed", () => {
    expect(createGroupPostSchema.safeParse({ images: new Array(11).fill("u") }).success).toBe(false);
    expect(createGroupPostSchema.safeParse({ images: ["u".repeat(2049)] }).success).toBe(false);
    expect(createGroupPostSchema.safeParse({ images: ["https://x/y.png"] }).success).toBe(true);
  });

  it("blog schemas: title/content bounded, updates partial, comments capped", () => {
    expect(createBlogSchema.safeParse({ title: "ab", content: "body" }).success).toBe(false);
    expect(createBlogSchema.safeParse({ title: "a".repeat(151), content: "body" }).success).toBe(false);
    expect(createBlogSchema.safeParse({ title: "Real title", content: "" }).success).toBe(false);
    expect(createBlogSchema.safeParse({ title: "Real title", content: "x".repeat(50001) }).success).toBe(false);
    expect(createBlogSchema.parse({ title: "Real title", content: "body" })).toEqual({
      title: "Real title",
      content: "body",
    });

    expect(updateBlogSchema.parse({})).toEqual({});
    expect(updateBlogSchema.safeParse({ title: "okay" }).success).toBe(true);
    expect(updateBlogSchema.safeParse({ title: "no" }).success).toBe(false);

    expect(createBlogCommentSchema.safeParse({}).success).toBe(false);
    expect(createBlogCommentSchema.safeParse({ content: "x".repeat(5001) }).success).toBe(false);
    expect(createBlogCommentSchema.parse({ content: "nice" })).toEqual({ content: "nice" });
  });

  it("pushSubscribeSchema: endpoint must be a URL", () => {
    expect(pushSubscribeSchema.safeParse({ endpoint: "not-a-url", p256dh: "k", auth: "a" }).success).toBe(false);
    expect(pushSubscribeSchema.safeParse({ endpoint: "https://fcm/x", p256dh: "k", auth: "a" }).success).toBe(true);
  });

  it("socketioSchema: forwards unknown call-signal keys (offer/answer/ICE survive)", () => {
    const parsed = socketioSchema.parse({
      action: "ice-candidate",
      targetUserId: "u2",
      candidate: { candidate: "cand", sdpMid: "0" },
    });
    expect((parsed as any).candidate).toEqual({ candidate: "cand", sdpMid: "0" });
    expect(socketioSchema.safeParse({ action: "" }).success).toBe(false);
  });
});

describe("generateUsername", () => {
  it("slugifies and bounds the base", () => {
    const u = generateUsername("Prashant Bhandari!");
    expect(u).toMatch(/^prashant_bhandar_\d{4}$/); // base capped at 16 chars
    const long = generateUsername("A".repeat(50) + " Name");
    expect(long.length).toBeLessThanOrEqual(16 + 5); // base cap + _#### suffix
  });

  it("falls back to the user_ prefix when nothing survives slugifying", () => {
    expect(generateUsername("###")).toMatch(/^user_\d{4}$/);
  });
});

import { z } from "zod";
import { NextResponse } from "next/server";

// Shared request-body validation (M2 from the code review).
//
// Routes previously parsed bodies with destructuring + manual `if (!field)`
// checks — that catches missing fields but not wrong types, oversized
// strings, or arrays stuffed into scalar slots. These schemas enforce
// shape at the HTTP boundary with a 400 before any handler logic runs.
//
// Philosophy: strict on TYPE and LENGTH, permissive where handlers have
// their own business rules (e.g. "content or file required"), so we
// tighten safety without changing behavior. Empty-string-vs-absent
// distinctions are preserved: several routes treat "" and undefined
// differently (partial profile updates).

const id = z.string().min(1).max(64);

// batchYear arrives as: number (register/groups JSON), string (profile
// form state, possibly ""), or null/undefined. Normalize "" → null,
// coerce numeric strings, reject garbage before it reaches Prisma.
const batchYearField = z.preprocess(
  (v) => (v === "" || v === undefined ? v === "" ? null : undefined : v),
  z.coerce.number().int().min(2000).max(2100).nullable().optional()
);

const usernameField = z
  .string()
  .min(3)
  .max(30)
  .regex(/^[a-zA-Z0-9_.]+$/, "letters, digits, _ . only");

// ---- Auth ----
export const loginSchema = z.object({
  // Identifier may be an email OR a username — length only.
  email: z.string().min(1).max(254),
  password: z.string().min(1).max(128),
});

export const registerSchema = z.object({
  name: z.string().min(1).max(80),
  email: z.email().max(254),
  password: z.string().min(6).max(128),
  // Optional & may be "" — the route generates a username when absent.
  username: z.union([z.literal(""), usernameField]).optional(),
  phone: z.string().max(20).nullable().optional(),
  department: z.string().max(100).nullable().optional(),
  batchYear: batchYearField,
});

// ---- Messages ----
export const sendMessageSchema = z.object({
  receiverId: id,
  // No route-level DM cap existed; 10k blocks megabyte payloads without
  // touching realistic messages.
  content: z.string().max(10000).optional(),
  fileUrl: z.string().max(2048).nullable().optional(),
  fileType: z.string().max(100).nullable().optional(),
  fileName: z.string().max(255).nullable().optional(),
  replyToId: id.nullable().optional(),
});

export const editMessageSchema = z.object({
  content: z.string().min(1).max(10000),
});

export const messageReactionSchema = z.object({
  emoji: z.string().min(1).max(32),
});

// ---- Posts / comments ----
export const createPostSchema = z.object({
  // Generous type/length guard — the route keeps its own 5000-char rule
  // on the SANITIZED text (which can be shorter than the raw input).
  content: z.string().max(10000).optional(),
  images: z.array(z.string().max(2048)).max(10).optional(),
});

export const createCommentSchema = z.object({
  content: z.string().min(1).max(5000),
});

export const editCommentSchema = z.object({
  commentId: id,
  content: z.string().min(1).max(5000),
});

export const commentActionSchema = z.object({
  commentId: id,
});

// ---- Groups ----
export const createGroupSchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().max(1000).nullable().optional(),
  // Select options on the create form: custom / class / department / batch.
  type: z.enum(["custom", "class", "department", "batch"]).optional(),
  department: z.string().max(100).nullable().optional(),
  batchYear: batchYearField,
  section: z.string().max(50).nullable().optional(),
  allowMemberPosts: z.boolean().optional(),
});

export const groupMessageSchema = z.object({
  content: z.string().max(5000).optional(),
  fileUrl: z.string().max(2048).nullable().optional(),
  fileType: z.string().max(100).nullable().optional(),
  fileName: z.string().max(255).nullable().optional(),
});

// ---- Stories ----
export const createStorySchema = z.object({
  images: z.array(z.string().max(2048)).min(1).max(20),
});

// like = toggle; comment requires content
export const storyActionSchema = z.object({
  action: z.enum(["like", "comment"]),
  content: z.string().min(1).max(1000).optional(),
});

// ---- Profile (partial update: every field optional, "" usually clears) ----
export const updateProfileSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  username: z.union([z.literal(""), usernameField]).optional(),
  bio: z.string().max(500).nullable().optional(),
  department: z.string().max(100).nullable().optional(),
  batchYear: batchYearField,
  rollNumber: z.string().max(30).nullable().optional(),
  avatar: z.string().max(2048).nullable().optional(),
  coverPhoto: z.string().max(2048).nullable().optional(),
});

// ---- Validation helper ----
type ParseResult<T> = { ok: true; data: T } | { ok: false; response: NextResponse };

export async function parseBody<T extends z.ZodTypeAny>(
  req: Request,
  schema: T
): Promise<ParseResult<z.infer<T>>> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }),
    };
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    const issue = result.error.issues[0];
    const field = issue.path.join(".") || "body";
    return {
      ok: false,
      response: NextResponse.json(
        { error: `Invalid ${field}: ${issue.message}` },
        { status: 400 }
      ),
    };
  }
  return { ok: true, data: result.data };
}

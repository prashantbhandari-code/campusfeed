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

// ---- LMS ----
export const quizTakeSchema = z.object({
  answers: z.array(z.string().max(2000)).max(200).default([]),
});

export const markAttendanceSchema = z.object({
  studentId: id.optional(),
  status: z.enum(["present", "absent", "late", "excused"]).optional(),
  date: z.string().max(40).optional(),
  notes: z.string().max(500).nullable().optional(),
});

export const createCourseSchema = z.object({
  name: z.string().min(1).max(120),
  code: z.string().min(1).max(30),
  description: z.string().max(2000).nullable().optional(),
  department: z.string().max(100).nullable().optional(),
  semester: z.coerce.number().int().min(1).max(20).nullable().optional(),
  credits: z.coerce.number().int().min(0).max(30).optional(),
});

export const createModuleSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(2000).nullable().optional(),
});

export const createAssignmentSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).nullable().optional(),
  moduleId: id,
  dueDate: z.string().max(40).nullable().optional(),
  maxScore: z.coerce.number().int().min(0).max(1000).optional(),
  allowLate: z.boolean().optional(),
});

export const createForumPostSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(5000),
});

// The route still enforces non-empty AFTER sanitize strips markup
export const createForumReplySchema = z.object({
  content: z.string().max(5000).optional(),
});

// Same shape as createPostSchema — group/section posts previously accepted
// unbounded image arrays with no per-item length cap.
export const createGroupPostSchema = z.object({
  content: z.string().max(10000).optional(),
  images: z.array(z.string().max(2048)).max(10).optional(),
});

// ---- Events ----
export const createEventSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).nullable().optional(),
  location: z.string().max(200).nullable().optional(),
  startTime: z.string().min(1).max(40),
  endTime: z.string().max(40).nullable().optional(),
  type: z.string().max(30).optional(),
  imageUrl: z.string().max(2048).nullable().optional(),
});

// ---- Push subscriptions ----
export const pushSubscribeSchema = z.object({
  endpoint: z.string().url().max(2048),
  p256dh: z.string().min(1).max(512),
  auth: z.string().min(1).max(512),
});

export const pushUnsubscribeSchema = z.object({
  endpoint: z.string().min(1).max(2048),
});

// ---- Socket.IO REST relay ----
// Call-signal payloads (offer/answer/ICE) are forwarded verbatim inside
// `payload`, so unknown keys must survive — hence looseObject.
export const socketioSchema = z.looseObject({
  action: z.string().min(1).max(40),
  receiverId: id.optional(),
  senderName: z.string().max(80).optional(),
  callerId: id.optional(),
  otherUserId: id.optional(),
  targetUserId: id.optional(),
});

// ---- Admin ----
// User.role is a plain string column (student/teacher/admin comment) — the
// enum here is the only guard against writing arbitrary role strings.
export const adminRoleSchema = z.object({
  role: z.enum(["student", "teacher", "admin"]),
});

export const adminVerifySchema = z.object({
  verified: z.boolean(),
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

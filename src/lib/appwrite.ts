import { Client, Account, Databases, Storage, ID, Query, Role, Permission } from "appwrite";

const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "https://cloud.appwrite.io/v1";
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "";
const apiKey = process.env.APPWRITE_API_KEY || "";

// Client-side client (with session)
export const client = new Client()
  .setEndpoint(endpoint)
  .setProject(projectId);

// Client-side services
export const account = new Account(client);
export const clientDatabases = new Databases(client);
export const clientStorage = new Storage(client);

// Server-side REST API helpers (avoids setKey issue with JS SDK)
export const SERVER_ENDPOINT = endpoint;
export const SERVER_PROJECT_ID = projectId;
export const SERVER_API_KEY = apiKey;

export const DB_ID = "campusconnect";

export const COLLECTIONS = {
  users: "users",
  posts: "posts",
  comments: "comments",
  likes: "likes",
  saves: "saves",
  follows: "follows",
  blocks: "blocks",
  messages: "messages",
  notifications: "notifications",
  stories: "stories",
  courses: "courses",
  courseModules: "course_modules",
  assignments: "assignments",
  submissions: "submissions",
  quizzes: "quizzes",
  quizQuestions: "quiz_questions",
  quizAttempts: "quiz_attempts",
  enrollments: "enrollments",
  attendance: "attendance",
  forumPosts: "forum_posts",
  forumReplies: "forum_replies",
  grades: "grades",
  courseMaterials: "course_materials",
  groups: "groups",
  groupSections: "group_sections",
  groupPosts: "group_posts",
  events: "events",
} as const;

export const BUCKETS = {
  avatars: "avatars",
  posts: "posts",
  messages: "messages",
  materials: "materials",
} as const;

// Server-side REST API helper
async function serverApi(method: string, path: string, body?: any) {
  const res = await fetch(`${SERVER_ENDPOINT}${path}`, {
    method,
    headers: {
      "X-Appwrite-Project": SERVER_PROJECT_ID,
      "X-Appwrite-Key": SERVER_API_KEY,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

// Server-side CRUD helpers
export async function createDoc(collectionId: string, data: Record<string, any>) {
  return serverApi("POST", `/v1/databases/${DB_ID}/collections/${collectionId}/documents`, {
    documentId: ID.unique(),
    data,
    permissions: ["read(\"\")", "write(\"user:\")"],
  });
}

export async function getDoc(collectionId: string, documentId: string) {
  return serverApi("GET", `/v1/databases/${DB_ID}/collections/${collectionId}/documents/${documentId}`);
}

export async function updateDoc(collectionId: string, documentId: string, data: Record<string, any>) {
  return serverApi("PATCH", `/v1/databases/${DB_ID}/collections/${collectionId}/documents/${documentId}`, { data });
}

export async function deleteDoc(collectionId: string, documentId: string) {
  return serverApi("DELETE", `/v1/databases/${DB_ID}/collections/${collectionId}/documents/${documentId}`);
}

export async function listDocs(collectionId: string, queries: string[] = [], limit = 100, offset = 0) {
  const params = new URLSearchParams();
  params.set("limit", String(limit));
  params.set("offset", String(offset));
  queries.forEach((q, i) => params.set("queries[" + i + "]", q));
  return serverApi("GET", `/v1/databases/${DB_ID}/collections/${collectionId}/documents?${params.toString()}`);
}

export async function countDocs(collectionId: string, queries: string[] = []) {
  const params = new URLSearchParams();
  params.set("limit", "0");
  queries.forEach((q, i) => params.set("queries[" + i + "]", q));
  const res = await serverApi("GET", `/v1/databases/${DB_ID}/collections/${collectionId}/documents?${params.toString()}`);
  return res.sum || 0;
}

// Query builders
export const q = {
  equal: (field: string, value: any) => Query.equal(field, value),
  notEqual: (field: string, value: any) => Query.notEqual(field, value),
  greaterThan: (field: string, value: any) => Query.greaterThan(field, value),
  lessThan: (field: string, value: any) => Query.lessThan(field, value),
  orderAsc: (field: string) => Query.orderAsc(field),
  orderDesc: (field: string) => Query.orderDesc(field),
  limit: (limit: number) => Query.limit(limit),
  offset: (offset: number) => Query.offset(offset),
  search: (field: string, value: string) => Query.search(field, value),
  contains: (field: string, value: any) => Query.contains(field, value),
};

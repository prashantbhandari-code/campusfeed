import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/server-auth", () => ({
  getServerSession: vi.fn(),
}));
vi.mock("@/lib/security/rateLimit", () => ({
  withRateLimit: (handler: (...args: any[]) => unknown) => handler,
}));
vi.mock("@/lib/security/rate-limit", () => ({
  checkUserRateLimit: vi.fn().mockResolvedValue({ success: true }),
}));

import { getServerSession } from "@/lib/auth/server-auth";
import { POST } from "@/app/api/upload/route";

const getSession = getServerSession as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  getSession.mockResolvedValue({ user: { id: "user-12345678" } });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("POST /api/upload", () => {
  it("sends the required Appwrite read permission and returns an attachment URL", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ $id: "stored-file-1" }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const body = new FormData();
    body.append("file", new File(["hello"], "notes.txt", { type: "text/plain" }));
    const request = new Request("https://campusfeed.test/api/upload", {
      method: "POST",
      body,
    });

    const response = await POST(request);
    const result = await response.json();
    const uploadForm = fetchMock.mock.calls[0][1].body as FormData;

    expect(response.status).toBe(200);
    expect(uploadForm.getAll("permissions[]")).toEqual(['read("any")']);
    expect(result).toMatchObject({
      url: expect.stringContaining("/files/stored-file-1/view?"),
      fileId: "stored-file-1",
      fileName: "notes.txt",
      fileType: "document",
    });
  });

  it("rejects an unauthenticated upload before contacting Appwrite", async () => {
    getSession.mockResolvedValueOnce(null);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const body = new FormData();
    body.append("file", new File(["hello"], "notes.txt", { type: "text/plain" }));
    const request = new Request("https://campusfeed.test/api/upload", {
      method: "POST",
      body,
    });

    const response = await POST(request);

    expect(response.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

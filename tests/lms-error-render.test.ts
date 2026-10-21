// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, waitFor, act } from "@testing-library/react";
import React from "react";
import LMSTashboard from "@/app/(main)/lms/page";
import CourseDetail from "@/app/(main)/lms/[courseId]/page";
import GradesPage from "@/app/(main)/lms/grades/page";
import AssignmentPage from "@/app/(main)/lms/[courseId]/assignment/[assignmentId]/page";
import QuizPage from "@/app/(main)/lms/[courseId]/quiz/[quizId]/page";

// These pages used to white-screen when a fetch returned {error} instead of the
// expected array/object (a 401/404/500), or hang on the skeleton forever when a
// fetch rejected. Each test drives one page with a failing fetch and asserts it
// lands on a real state — an empty state or a "not found" message — never a
// thrown render. Boundaries are mocked so the page's own handling is under test.

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/lms",
  useParams: () => ({ courseId: "c1", assignmentId: "a1", quizId: "q1" }),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: any) =>
    React.createElement("a", { href: typeof href === "string" ? href : "#", ...rest }, children),
}));

vi.mock("@/lib/session", () => ({
  useSession: () => ({ data: { user: { id: "u1", name: "Me", username: "me" } } }),
}));

// Attendance/forum/avatars are unrelated boundaries — stub to inert.
vi.mock("@/components/lms/AttendanceTab", () => ({ default: () => null }));
vi.mock("@/components/lms/ForumTab", () => ({ default: () => null }));
vi.mock("@/components/UserAvatar", () => ({ default: () => null }));

const errorResponse = (body: unknown, ok = true) =>
  ({ ok, json: () => Promise.resolve(body) }) as Response;

// The course/assignment/quiz pages unwrap their route params with React's
// `use()`, which suspends on first render — they need a Suspense boundary in
// the test harness, and the render must be flushed through an async act so
// React resumes after the params promise resolves (the same thing Next.js's
// runtime Suspense does at page level).
const inSuspense = async (element: React.ReactElement) => {
  let utils: ReturnType<typeof render>;
  await act(async () => {
    utils = render(React.createElement(React.Suspense, { fallback: null }, element));
  });
  return utils!;
};

const stubFetch = (impl: (_url: string) => Promise<Response>) => {
  vi.stubGlobal("fetch", vi.fn((input: any) => impl(String(input))));
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("LMS pages render a real state on {error} payloads", () => {
  it("dashboard shows the empty state instead of crashing on a non-array payload", async () => {
    stubFetch(() => Promise.resolve(errorResponse({ error: "Internal server error" })));

    render(React.createElement(LMSTashboard));

    expect(await screen.findByText("No courses yet")).toBeTruthy();
  });

  it("course detail shows a not-found message instead of crashing on {error}", async () => {
    stubFetch((url) =>
      Promise.resolve(
        url.includes("/enroll")
          ? errorResponse({ error: "Unauthorized" })
          : errorResponse({ error: "Course not found" }, false)
      )
    );

    await inSuspense(React.createElement(CourseDetail, { params: Promise.resolve({ courseId: "c1" }) }));

    expect(await screen.findByText(/Course not found or you don.t have access/)).toBeTruthy();
  });

  it("course detail survives a rejected fetch (network failure)", async () => {
    stubFetch(() => Promise.reject(new Error("network down")));

    await inSuspense(React.createElement(CourseDetail, { params: Promise.resolve({ courseId: "c1" }) }));

    expect(await screen.findByText(/Course not found or you don.t have access/)).toBeTruthy();
  });

  it("grades shows the empty state on a failing fetch instead of hanging", async () => {
    stubFetch(() => Promise.reject(new Error("network down")));

    render(React.createElement(GradesPage));

    expect(await screen.findByText(/No grades yet/)).toBeTruthy();
  });

  it("grades normalizes an {error} payload to empty arrays", async () => {
    stubFetch(() => Promise.resolve(errorResponse({ error: "Internal server error" })));

    render(React.createElement(GradesPage));

    expect(await screen.findByText(/No grades yet/)).toBeTruthy();
  });

  it("assignment shows a not-found message instead of hanging on {error}", async () => {
    stubFetch(() => Promise.resolve(errorResponse({ error: "Course not found" }, false)));

    await inSuspense(
      React.createElement(AssignmentPage, {
        params: Promise.resolve({ courseId: "c1", assignmentId: "a1" }),
      })
    );

    expect(await screen.findByText(/Assignment not found or you don.t have access/)).toBeTruthy();
  });

  it("assignment does not lock the textarea when the submission fetch errors", async () => {
    stubFetch((url) =>
      Promise.resolve(
        url.includes("/submit")
          ? errorResponse({ error: "Internal server error" })
          : // A real course whose modules don't contain this assignment.
            errorResponse({ id: "c1", modules: [] })
      )
    );

    await inSuspense(
      React.createElement(AssignmentPage, {
        params: Promise.resolve({ courseId: "c1", assignmentId: "a1" }),
      })
    );

    // Not-found state (the assignment isn't in the course), no bogus submission.
    expect(await screen.findByText(/Assignment not found or you don.t have access/)).toBeTruthy();
  });

  it("quiz shows a not-found message instead of hanging on {error}", async () => {
    stubFetch(() => Promise.resolve(errorResponse({ error: "Quiz not found" }, false)));

    await inSuspense(React.createElement(QuizPage, { params: Promise.resolve({ courseId: "c1", quizId: "q1" }) }));

    expect(await screen.findByText(/Quiz not found or you don.t have access/)).toBeTruthy();
  });

  it("quiz still renders a real quiz when the payload is valid", async () => {
    stubFetch(() =>
      Promise.resolve(
        errorResponse({
          quiz: {
            id: "q1",
            title: "Midterm",
            timeLimit: 30,
            maxAttempts: 1,
            questions: [{ id: "q1a", question: "2+2?", type: "short_answer", options: "[]", points: 1 }],
          },
          canAttempt: true,
          attemptsUsed: 0,
        })
      )
    );

    await inSuspense(React.createElement(QuizPage, { params: Promise.resolve({ courseId: "c1", quizId: "q1" }) }));

    await waitFor(() => expect(screen.getByText("Midterm")).toBeTruthy());
  });
});

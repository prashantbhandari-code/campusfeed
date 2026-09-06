import prisma from "./prisma";
import { getUserIdFromCookieHeader } from "./session-token";

const APPWRITE_ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "https://cloud.appwrite.io/v1";
const APPWRITE_PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "";

export interface AppwriteServerSession {
  user: {
    id: string;
    name: string;
    email: string;
    username: string;
    avatar: string | null;
    department: string | null;
    batchYear: number | null;
    rollNumber: string | null;
    collegeEmail: string | null;
  };
}

/**
 * Drop-in replacement for getServerSession(authOptions) from next-auth.
 * Reads the Appwrite session from cookies and verifies it against the Appwrite API,
 * then looks up the user profile from the Prisma database.
 */
export async function getAppwriteSession(req?: Request): Promise<AppwriteServerSession | null> {
  try {
    // Extract session cookie from request
    const cookieHeader = req?.headers?.get("cookie") || "";
    const cookies = parseCookies(cookieHeader);

    // Appwrite stores session as `a_session_{projectId}` cookie
    const projectSuffix = APPWRITE_PROJECT_ID.slice(-8);
    const sessionCookie = cookies[`a_session_${projectSuffix}`] ||
                          cookies[`a_session_${APPWRITE_PROJECT_ID}`];

    // Fallback: check our signed cc_session cookie (set server-side after migration).
    // Value is an HMAC-signed token — a raw/forged user ID is rejected here.
    const ccUserId = getUserIdFromCookieHeader(cookieHeader);

    if (!sessionCookie && ccUserId) {
      // cc_session contains our PostgreSQL user ID
      const user = await prisma.user.findUnique({
        where: { id: ccUserId },
        select: {
          id: true, name: true, email: true, username: true,
          avatar: true, department: true, batchYear: true,
          rollNumber: true, collegeEmail: true,
        },
      });
      if (user) {
        return { user };
      }
    }

    if (!sessionCookie) {
      return null;
    }

    // Verify session against Appwrite API
    const response = await fetch(`${APPWRITE_ENDPOINT}/account`, {
      headers: {
        "X-Appwrite-Project": APPWRITE_PROJECT_ID,
        "Cookie": `a_session_${projectSuffix}=${sessionCookie}`,
      },
    });

    if (!response.ok) {
      // The Appwrite cookie exists but is stale/invalid — don't give up if a
      // valid signed cc_session cookie is also present (e.g. set by a recent
      // email login while an old Appwrite session lingers).
      if (ccUserId) {
        const user = await prisma.user.findUnique({
          where: { id: ccUserId },
          select: {
            id: true, name: true, email: true, username: true,
            avatar: true, department: true, batchYear: true,
            rollNumber: true, collegeEmail: true,
          },
        });
        if (user) {
          return { user };
        }
      }
      return null;
    }

    const appwriteUser = await response.json();

    // Look up user in our database by Appwrite ID
    let user = await prisma.user.findFirst({
      where: { appwriteId: appwriteUser.$id },
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        avatar: true,
        department: true,
        batchYear: true,
        rollNumber: true,
        collegeEmail: true,
      },
    });

    // Fallback: if no appwriteId match, try by email
    if (!user) {
      user = await prisma.user.findFirst({
        where: { email: appwriteUser.email },
        select: {
          id: true,
          name: true,
          email: true,
          username: true,
          avatar: true,
          department: true,
          batchYear: true,
          rollNumber: true,
          collegeEmail: true,
        },
      });

      // Link the accounts
      if (user) {
        await prisma.user.update({
          where: { id: user.id },
          data: { appwriteId: appwriteUser.$id },
        });
      }
    }

    if (!user) {
      return null;
    }

    return { user };
  } catch (error) {
    console.error("Appwrite session verification failed:", error);
    return null;
  }
}

/**
 * Parse raw cookie header string into key-value pairs.
 */
function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  cookieHeader.split(";").forEach((cookie) => {
    const [name, ...rest] = cookie.split("=");
    if (name && rest.length) {
      cookies[name.trim()] = rest.join("=").trim();
    }
  });
  return cookies;
}

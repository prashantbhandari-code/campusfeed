import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

const PORTAL_URL = "https://kiitportal.kiituniversity.net";

async function loginToPortal(username: string, password: string) {
  // Step 1: Get login page and CSRF token
  const loginPage = await fetch(PORTAL_URL + "/irj/portal/", {
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
  });
  const html = await loginPage.text();
  const saltMatch = html.match(/name="j_salt"s+value="([^"]+)"/);
  const salt = saltMatch ? saltMatch[1] : "";
  const cookies = loginPage.headers.getSetCookie();
  const cookieStr = cookies.map(c => c.split(";")[0]).join("; ");

  // Step 2: Submit login
  const formData = new URLSearchParams();
  formData.append("login_submit", "on");
  formData.append("login_do_redirect", "1");
  formData.append("j_salt", salt);
  formData.append("j_username", username);
  formData.append("j_password", password);
  formData.append("uidPasswordLogon", "Log On");

  const loginRes = await fetch(PORTAL_URL + "/irj/portal/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "Cookie": cookieStr, "User-Agent": "Mozilla/5.0" },
    body: formData.toString(),
    redirect: "manual",
  });
  const loginCookies = loginRes.headers.getSetCookie();
  return [...cookies, ...loginCookies].map(c => c.split(";")[0]).join("; ");
}

async function fetchPortalPage(cookies: string, path: string) {
  const res = await fetch(PORTAL_URL + path, {
    headers: { "Cookie": cookies, "User-Agent": "Mozilla/5.0" },
  });
  return await res.text();
}

function parsePortalData(html: string) {
  const data: any = { courses: [], attendance: [], grades: [], schedule: [] };
  // Extract percentage values
  const pcts = html.match(/d+.?d*s*%/g) || [];
  data.attendance = pcts.map(p => parseFloat(p));
  // Extract text content between tags
  const textContent = html.replace(/<[^>]+>/g, " ").replace(/s+/g, " ").trim();
  data.rawText = textContent.substring(0, 5000);
  return data;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!(session?.user as any)?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { username, password } = await req.json();
  if (!username || !password) return NextResponse.json({ error: "Username and password required" }, { status: 400 });

  try {
    const cookies = await loginToPortal(username, password);
    const portalHtml = await fetchPortalPage(cookies, "/irj/portal/");
    const loggedIn = !portalHtml.includes("j_password") || portalHtml.includes("Log Off");
    if (!loggedIn) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    const data = parsePortalData(portalHtml);
    return NextResponse.json({ success: true, data, raw: portalHtml.substring(0, 10000) });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed: " + error.message }, { status: 500 });
  }
}
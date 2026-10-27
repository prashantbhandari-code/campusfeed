export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/server-auth";
import { countUnreadGroupMessages } from "@/lib/notifications/groupUnread";

// GET /api/groups/unread — total unread group messages, for the Groups badge.
//
// A static segment, so it takes precedence over /api/groups/[id] for this
// exact path. The client reads it once on mount; after that the realtime loop
// publishes absolute counts ("groups-unread") whenever they change.
export async function GET(req: Request) {
  try {
    const session = await getServerSession(req);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const unread = await countUnreadGroupMessages(session.user.id);
    return NextResponse.json({ unread });
  } catch (error) {
    console.error("Group unread error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

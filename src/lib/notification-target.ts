// Where a notification row should take you when tapped. Kept as a pure
// function so the mapping is testable without rendering the page.
//
// `postId` is a loose id slot on the Notification model — for blog_comment it
// holds the blog id, for group_post the group id, and for like/comment the
// post id. Rows written before a target existed simply fall back to the
// section's index page rather than dead-ending.
export interface NotificationLike {
  type: string;
  postId?: string | null;
  fromUser?: { username?: string | null } | null;
}

// A `fromUser` given only as a bare username string (the shape the push
// senders hold) is accepted too, so push URLs come from this one mapping.
type PushTarget = {
  type: string;
  postId?: string | null;
  username?: string | null;
};

export function pushTarget(target: PushTarget): string | null {
  return notificationTarget({
    type: target.type,
    postId: target.postId,
    fromUser: { username: target.username ?? null },
  });
}

export function notificationTarget(notification: NotificationLike): string | null {
  const target = notification.postId;
  switch (notification.type) {
    case "blog_comment":
      return target ? `/blogs/${target}` : "/blogs";
    case "group_post":
      // Groups live inside the Messages inbox, and the inbox opens the
      // conversation itself — no redirect to the group page.
      return target ? `/messages?tab=groups&group=${target}` : "/messages?tab=groups";
    case "like":
    case "comment":
      // No post-detail page exists; the feed highlights the post instead.
      return target ? `/feed?post=${target}` : "/feed";
    case "follow":
      return notification.fromUser?.username
        ? `/profile/${notification.fromUser.username}`
        : null;
    default:
      return null;
  }
}

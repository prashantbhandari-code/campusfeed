// Collapses runs of consecutive rows from the same user of the same kind so the
// bell reads "· 3×" instead of three near-identical lines. Rows are now LINKS,
// so a group may only merge rows that open the SAME destination — merging
// different targets would advertise a count the single link can't honor.
// Pure and array-safe: a non-array (an API error payload) yields an empty list
// rather than a crash.
export function groupNotifications(notifs: unknown): any[] {
  if (!Array.isArray(notifs)) return [];

  const grouped: any[] = [];
  let i = 0;
  while (i < notifs.length) {
    const current = notifs[i];
    let count = 1;
    // Look ahead for consecutive same-user, same-type, same-target rows.
    while (
      i + count < notifs.length &&
      notifs[i + count].fromUserId === current.fromUserId &&
      notifs[i + count].type === current.type &&
      (notifs[i + count].postId ?? null) === (current.postId ?? null)
    ) {
      count++;
    }
    grouped.push(count > 1 ? { ...current, count } : current);
    i += count;
  }
  return grouped;
}

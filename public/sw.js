// Service Worker for Push Notifications
self.addEventListener("push", function(event) {
  const data = event.data ? event.data.json() : {};
  const title = data.title || "CampusFeed";
  const options = {
    body: data.body || "You have a new notification",
    icon: data.icon || "/icon-192x192.png",
    badge: data.badge || "/badge-72x72.png",
    data: data.url || "/feed",
    actions: data.actions || [],
    vibrate: [100, 50, 100],
    tag: data.tag || "campusfeed",
    renotify: true,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", function(event) {
  event.notification.close();
  const url = event.notification.data || "/feed";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(function(clientList) {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});

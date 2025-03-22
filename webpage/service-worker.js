self.addEventListener("push", (event) => {
    event.waitUntil((async () => {
        const json = event.data.json();
        const windows = await clients.matchAll({ includeUncontrolled: true, type: "window" });
        for (let i = 0; i < windows.length; i++)
            if (windows[i].focused && (windows[i].url == url)) return;
        self.registration.showNotification(json.header, {
            body: json.body,
            icon: "/favicon.ico"
        });
    })());
});
const url = "https://mocs.campbellsimpson.com/index.html";
self.addEventListener("notificationclick", (event) => {
    // open new window if needed
    event.waitUntil((async () => {
        event.notification.close();
        const windows = await clients.matchAll({ includeUncontrolled: true, type: "window" });
        for (let i = 0; i < windows.length; i++) {
            if (windows[i].url == url) {
                windows[i].focus();
                return;
            }
        }
        clients.openWindow("/");
        return;
    })());
});
const data = (new Date()).toLocaleTimeString();
caches.open("deep-trust");
self.addEventListener("fetch", async (event) => {
    if (event.request.method !== "GET") return;
    event.respondWith(new Promise(async (resolve) => {
        const url = event.request.url.replace(self.location.origin, "");
        const cache = await caches.open("deep-trust");
        const cachedResponse = await cache.match(url);
        if (cachedResponse) {
            // console.log(url, "already cached");
            event.waitUntil(new Promise(async (resolve2) => {
                const res = await fetch(event.request);
                if (res.ok) cache.put(url, res.clone());
                // console.log("    re-fetched:", url);
                resolve2();
            }));
            resolve(cachedResponse);
        } else {
            event.waitUntil(new Promise(async (resolve2) => {
                // console.log(url, "not yet chached");
                const res = await fetch(event.request);
                if (!res.ok) { console.log("test"); throw new Error("Failed to fetch file."); }
                // console.log("    fetched:", url);
                cache.put(url, res.clone());
                resolve(res);
                resolve2();
            }));
        }
    }));
});
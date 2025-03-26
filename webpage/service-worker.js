importScripts("/hashLib.js");
self.addEventListener("activate", () => {
    clients.claim();
});
const url = self.location.origin + "/index.html";
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
self.addEventListener("notificationclick", (event) => {
    event.waitUntil((async () => {
        event.notification.close();
        const windows = await clients.matchAll({ includeUncontrolled: true, type: "window" });
        for (let i = 0; i < windows.length; i++) {
            if (windows[i].url == url) {
                windows[i].focus();
                return;
            }
        }
        // open new window only if needed
        clients.openWindow("/");
        return;
    })());
});
self.addEventListener("fetch", (event) => {
    if (event.request.method !== "GET") return;
    if (event.request.referrer.replace(self.location.origin, "") != "/index.html") return;
    event.respondWith(new Promise(async (resolve) => {
        const url = event.request.url.replace(self.location.origin, "");
        console.log(url);
        const cache = await caches.open("deep-trust");
        const cachedResponse = await cache.match(url);
        if (url === "/key.txt") {
            if (cachedResponse) resolve(cachedResponse);
            else {
                const key = generateHotpKey();
                resolve(new Response(JSON.stringify({ key, changed: true }), { status: 200, statusText: "OK" }));
                event.waitUntil(cache.put("/key.txt", new Response(JSON.stringify({ key, changed: false }), { status: 200, statusText: "OK" })));
            }
            return;
        }
        if (cachedResponse) {
            resolve(cachedResponse);
            event.waitUntil((async () => {
                const res = await fetch(event.request);
                if (res.ok) await cache.put(url, res.clone());
            })());
        } else {
            event.waitUntil(new Promise(async (resolve2) => {
                const res = await fetch(event.request);
                if (!res.ok) { throw new Error("Failed to fetch file."); }
                cache.put(url, res.clone());
                resolve(res);
                resolve2();
            }));
        }
    }));
});
addEventListener("message", (event) => {
    event.waitUntil(new Promise(async (resolve) => {
        console.log("received message:", event.data);
        resolve();
    }));
});
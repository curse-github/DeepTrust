importScripts("/hashLib.js");
self.addEventListener("activate", () => {
    clients.claim();
});
const url = self.location.origin + "/index.html";
self.addEventListener("push", (event) => {
    event.waitUntil((async () => {
        const json = event.data.json();
        if (json.type == "notification") {
            const windows = await clients.matchAll({ includeUncontrolled: true, type: "window" });
            for (let i = 0; i < windows.length; i++)
                if (windows[i].focused && (windows[i].url == url)) return;
            self.registration.showNotification(json.data.header, {
                body: json.data.body,
                icon: "/favicon.ico"
            });
        } else if (json.type == "request") {
            // console.log(json.data);
            // create new key
            const forUsername = json.data.for;
            const totpKey = generateHotpKey();
            const cache = await caches.open("deep-trust");
            cache.put("/key_for_" + forUsername, new Response(JSON.stringify({ key: totpKey }), { status: 200, statusText: "OK" }));
            cache.put("/has_key_for_" + forUsername, new Response("true", { status: 200, statusText: "OK" }));
            // send key to server
            fetch("/give_key_for", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ for: forUsername, totpKey })
            });
            const tabs = await clients.matchAll({ includeUncontrolled: true, type: "window" });
            for (let i = 0; i < tabs.length; i++)
                if (tabs[i].url == url)
                    tabs[i].postMessage("reload");
        } else if (json.type == "submission") {
            // console.log(json.data);
            const fromUsername = json.data.from;
            const key = json.data.totpKey;
            const cache = await caches.open("deep-trust");
            await cache.put("/key_from_" + fromUsername, new Response(JSON.stringify({ key }), { status: 200, statusText: "OK" }));
            await cache.put("/has_key_from_" + fromUsername, new Response("true", { status: 200, statusText: "OK" }));
            const tabs = await clients.matchAll({ includeUncontrolled: true, type: "window" });
            for (let i = 0; i < tabs.length; i++)
                if (tabs[i].url == url)
                    tabs[i].postMessage("reload");
        } else if (json.type == "reload") {
            const tabs = await clients.matchAll({ includeUncontrolled: true, type: "window" });
            for (let i = 0; i < tabs.length; i++)
                if (tabs[i].url == url)
                    tabs[i].postMessage("reload");
        } else if (json.type == "ping") {
            for (let i = 0; i < tabs.length; i++) {
                if (tabs[i].focused && (tabs[i].url == url)) {
                    fetch("/pong", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        }
                    });
                    return;
                }
            }
        }
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
    const url = event.request.url.replace(self.location.origin, "").split("?")[0];
    if ((event.request.referrer.replace(self.location.origin, "") != "/index.html")) return;
    // const queryString = event.request.url.split("?")[1] || "";
    // const query = (queryString.length > 0) ? Object.fromEntries(queryString.split("&").map((str) => str.split("=").map(decodeURIComponent))) : {};

    // console.log(url);
    if ((url == "/getUserData")) return;
    event.respondWith(new Promise(async (resolve) => {
        const cache = await caches.open("deep-trust");
        const cachedResponse = await cache.match(url);
        if (cachedResponse && !url.startsWith("/generate_key_for_") && !url.startsWith("/set_key_from_") && !url.startsWith("/clear_keys")) { // should not be cached ever, it is just a signal to the service worker
            resolve(cachedResponse);
            if (
                url.startsWith("/has_key_for_") || url.startsWith("/key_for_")
                || url.startsWith("/has_key_from_") || url.startsWith("/key_from_")
                || url.startsWith("/auth_start") || url.startsWith("/auth_from_user")
                || url.startsWith("/auth_to_user") || url.startsWith("/auth_end")
            ) return;
            event.waitUntil((async () => {
                const res = await fetch(event.request);
                if (res.ok) await cache.put(url, res.clone());
            })());
        } else {
            if (url.startsWith("/has_key_for_") || url.startsWith("/has_key_from_")) {
                resolve(new Response("false", { status: 200, statusText: "OK" }));
            } else if (url.startsWith("/has_key_from_") || url.startsWith("/has_key_from_")) {
                resolve(new Response("false", { status: 200, statusText: "OK" }));
            } else if (url.startsWith("/key_for_")) {
                resolve(new Response(JSON.stringify({ key: undefined }), { status: 404, statusText: "MISSING" }));
            } else if (url.startsWith("/key_from_")) {
                resolve(new Response(JSON.stringify({ key: undefined }), { status: 404, statusText: "MISSING" }));
            } else if (url.startsWith("/clear_keys_with_")) {
                const name = url.replace("/clear_keys_with_", "");
                event.waitUntil(Promise.all([
                    cache.delete("/has_key_for_" + name),
                    cache.delete("/key_for_" + name),
                    cache.delete("/has_key_from_" + name),
                    cache.delete("/key_from_" + name)
                ]));
                resolve(new Response("true", { status: 200, statusText: "OK" }));
            } else {
                event.waitUntil((async () => {
                    const res = await fetch(event.request);
                    if (!res.ok) { throw new Error("Failed to fetch file."); }
                    cache.put(url, res.clone());
                    resolve(res);
                })());
            }
        }
    }));
});
addEventListener("message", (event) => {
    event.waitUntil(new Promise(async (resolve) => {
        console.log("received message:", event.data);
        resolve();
    }));
});
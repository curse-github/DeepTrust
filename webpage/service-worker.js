self.addEventListener("install", (event) => {
    self.skipWaiting();
});
self.addEventListener("activate", (event) => {
    event.waitUntil(clients.claim());
});
importScripts("/ShaTotpAesEcc.js");
const url = self.location.origin + "/pwa.html";
const myLog = async (...message) => {
    try {
        console.log(...message);
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 1000);
        await fetch("/log", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ message }),
            signal: controller.signal
        }).catch((err) => {});
        clearTimeout(timeout);
    } catch (err) {
        console.log("\x1b[31m", err, "\x1b[0m");
        // await myLog("\x1b[31m", err, "\x1b[0m");
    }
};
self.addEventListener("unhandledrejection", (event) => {
    event.preventDefault();
    // console.error("Global unhandled rejection:", event.reason);
});
self.addEventListener("push", (event) => {
    let json = { type: "" };
    try {
        json = event.data.json();
    } catch (err) {
        myLog("\x1b[31m", err, "\x1b[0m");
        return;
    }
    if (json.type == "notification") {
        event.waitUntil((async () => {
            const windows = await clients.matchAll({ includeUncontrolled: true, type: "window" });
            for (let i = 0; i < windows.length; i++)
                if (windows[i].focused && (windows[i].url == url)) return;
            self.registration.showNotification(json.data.header, {
                body: json.data.body,
                icon: "/favicon.ico"
            });
        })());
    } else if (json.type == "request") {
        /*
        old way: userA requesting seed from userB
            userA: post(/req_seed_from, { from: "userB" })

            server: notif("userB", { type: "request", data: { for: "userA" }})
            userB: ciphertext = AES.encrypt("seed", "aaaaaaaaaaaaaaaa")
            userB: post(/give_seed_for, { for: "userA", totpSeed: ciphertext })

            server: notif("userA", { type: "submission", data: { from: "userB", totpSeed: ciphertext }})
            userA: plaintext = AES.decrypt(ciphertext, "aaaaaaaaaaaaaaaa") = "seed"
        new way: userA requesting seed from userB
            userA: a = genkey(); A = a * G
            userA: post(/req_seed_from, { from: "userB", public: A })

            server: notif("userB", { type: "request", data: { for: "userA", public: A }})
            userB: b = genkey(); B = b * G
            userB: S = b * A; ciphertext = AES.encrypt("seed", S)
            userA: post(/give_seed_for, { for: "userA", public: B, totpSeed: ciphertext })

            server: notif("userA", { type: "submission", data: { from: "userB", public: B, totpSeed: ciphertext }})
            userA: S = a * B
            userA: plaintext = AES.decrypt(ciphertext, S) = "seed"
        */
        event.waitUntil((async () => {
            const forUsername = json.data.for;
            const theirPublic = json.data.public;
            const totpSeed = generateBase32Num(64);
            const cache = await caches.open("deep-trust");
            await cache.put("/seed_for_" + forUsername, new Response(JSON.stringify({ seed: totpSeed }), { status: 200, statusText: "OK" }));
            const tabs = await clients.matchAll({ includeUncontrolled: true, type: "window" });
            for (let i = 0; i < tabs.length; i++)
                if (tabs[i].url == url)
                    tabs[i].postMessage({ type: "request", for: forUsername, public: theirPublic, totpSeed });
        })());
    } else if (json.type == "submission") {
        event.waitUntil((async () => {
            const fromUsername = json.data.from;
            const theirPublic = json.data.public;
            const totpSeedEnc = json.data.totpSeed;
            const tabs = await clients.matchAll({ includeUncontrolled: true, type: "window" });
            for (let i = 0; i < tabs.length; i++)
                if (tabs[i].url == url)
                    tabs[i].postMessage({ type: "submission", from: fromUsername, public: theirPublic, totpSeed: totpSeedEnc });
        })());
    } else if (json.type == "reload") {
        event.waitUntil((async () => {
            const tabs = await clients.matchAll({ includeUncontrolled: true, type: "window" });
            for (let i = 0; i < tabs.length; i++)
                if (tabs[i].url == url)
                    tabs[i].postMessage("reload");
        })());
    } else return;
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
    // if (event.request.method !== "GET") return;
    const url = event.request.url.replace(self.location.origin, "").split("?")[0];
    // myLog("2:", event.request.referrer.replace(self.location.origin, "") + "\n");
    if ((event.request.referrer.replace(self.location.origin, "") != "/pwa.html")) return;
    const queryString = event.request.url.split("?")[1] || "";
    const query = (queryString.length > 0) ? Object.fromEntries(queryString.split("&").map((str) => str.split("=").map(decodeURIComponent))) : {};
    if (
        url.startsWith("/ping") || url.startsWith("/notif/subscribe")
        || url.startsWith("/req_seed_from") || url.startsWith("/give_seed_for")
        || url.startsWith("/log")
        || url.startsWith("/auth_start") || url.startsWith("/auth_from_user")
        || url.startsWith("/auth_to_user") || url.startsWith("/auth_end")
    ) return;
    if (url.startsWith("/get_seeds_state")) {
        event.respondWith(new Promise(async (resolve) => {
            const cache = await caches.open("deep-trust");
            let cachedUserDataRes = await cache.match("/getUserData");
            if (!cachedUserDataRes) { resolve(new Response(JSON.stringify({}), { status: 404, statusText: "OK" })); return; }
            const json = await cachedUserDataRes.json();
            if (json == undefined) { resolve(new Response(JSON.stringify({}), { status: 404, statusText: "OK" })); return; }
            const { friends_list } = json;
            const map = {};
            for (let i = 0; i < friends_list.length; i++) {
                const friend = friends_list[i];
                map[friend] = [];
                // for
                const seedForRes = await cache.match("/seed_for_" + friend);
                if (!seedForRes)
                    map[friend].push("");
                else
                    map[friend].push(sha256(await seedForRes.text()));
                // from
                const seedFromRes = await cache.match("/seed_from_" + friend);
                if (!seedFromRes)
                    map[friend].push("");
                else
                    map[friend].push(sha256(await seedFromRes.text()));
            }
            const controller = new AbortController();
            const timeoutId = setTimeout(() => { controller.abort("timeout"); }, 1000);
            await fetch("/get_seeds_state", {
                signal: controller.signal,
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ map })
            }).then((res) => {
                clearTimeout(timeoutId);
                cache.put("/get_seeds_state", res.clone());
                resolve(res);
                return;
            }).catch(async () => {
                clearTimeout(timeoutId);
                console.log("using cached data");
                let cachedResponse = await cache.match("/get_seeds_state");
                if (!cachedResponse)
                    resolve(new Response(JSON.stringify({}), { status: 200, statusText: "OK" }));
                else
                    resolve(cachedResponse);
                return;
            });
        }));
        return;
    }
    event.respondWith(new Promise(async (resolve) => {
        const cache = await caches.open("deep-trust");
        let cachedResponse = await cache.match(url);
        if (cachedResponse && !(
            url.startsWith("/getUserData") || url.startsWith("/clear_seeds_with_") || url.startsWith("/set_seed_from_")
        )) { // should not be cached ever, it is just a signal to the service worker
            resolve(cachedResponse);
            if (url.startsWith("/seed_for_") || url.startsWith("/seed_from_") || url.startsWith("/set_seed_from_") || url.startsWith("/key_with_")) return;
            const controller = new AbortController();
            const timeoutId = setTimeout(() => { controller.abort("timeout"); }, 1000);
            await fetch(event.request, {
                signal: controller.signal
            }).then(async (res) => {
                clearTimeout(timeoutId);
                cache.put(url, res.clone());
            }).catch(() => {
                clearTimeout(timeoutId);
            });
        } else {
            if (url.startsWith("/getUserData")) {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => { controller.abort("timeout"); }, 1000);
                await fetch(event.request, {
                    signal: controller.signal
                }).then(async (res) => {
                    clearTimeout(timeoutId);
                    const json = await res.clone().json().then((json) => { return json; }).catch((err) => { return {}; });
                    json.online = false;
                    cache.put("/getUserData", new Response(JSON.stringify(json), { status: 200, statusText: "OK" }));
                    resolve(res);
                }).catch(() => {
                    clearTimeout(timeoutId);
                    if (cachedResponse)
                        resolve(cachedResponse);
                    else
                        resolve(new Response("", { status: 404, statusText: "" }));
                });
            } else if (url.startsWith("/set_seed_from_")) {
                cache.put(url.replace("set_", ""), new Response(JSON.stringify({ seed: query.seed }), { status: 200, statusText: "OK" }));
                resolve(new Response(JSON.stringify({}), { status: 201, statusText: "OK" }));
            } else if (url.startsWith("/seed_for_")) {
                resolve(new Response(JSON.stringify({ seed: undefined }), { status: 404, statusText: "MISSING" }));
            } else if (url.startsWith("/seed_from_")) {
                resolve(new Response(JSON.stringify({ seed: undefined }), { status: 404, statusText: "MISSING" }));
            } else if (url.startsWith("/key_with_")) {
                const res = new Response(JSON.stringify({
                    key: generateBase16Num(48)
                }), { status: 200, statusText: "OK" });
                cache.put(url, res.clone());
                resolve(res);
            } else if (url.startsWith("/clear_seeds_with_")) {
                const name = url.replace("/clear_seeds_with_", "");
                event.waitUntil(Promise.all([
                    cache.delete("/has_seed_for_" + name),
                    cache.delete("/seed_for_" + name),
                    cache.delete("/has_seed_from_" + name),
                    cache.delete("/seed_from_" + name),
                    cache.delete("/key_for_" + name)
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
        myLog("received message:", event.data);
        resolve();
    }));
});
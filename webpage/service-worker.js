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
    let json = event.data.json();
    event.waitUntil((async () => {
        if (json.type == "notification") {
            const windows = await clients.matchAll({ includeUncontrolled: true, type: "window" });
            for (let i = 0; i < windows.length; i++)
                if (windows[i].focused && (windows[i].url == url)) return;
            self.registration.showNotification(json.data.header, {
                body: json.data.body,
                icon: "/favicon.ico"
            });
        } else if (json.type == "reload") {
            const tabs = await clients.matchAll({ includeUncontrolled: true, type: "window" });
            for (let i = 0; i < tabs.length; i++)
                if (tabs[i].url == url)
                    tabs[i].postMessage("reload");
        } else return;
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
    // if (event.request.method !== "GET") return;
    const url = event.request.url.replace(self.location.origin, "").split("?")[0];
    // myLog("2:", event.request.referrer.replace(self.location.origin, "") + "\n");
    if ((event.request.referrer.replace(self.location.origin, "").split("?")[0] != "/pwa.html") && (!event.request.referrer.replace(self.location.origin, "").startsWith("/messages/"))) return;
    const queryString = event.request.url.split("?")[1] || "";
    const query = (queryString.length > 0) ? Object.fromEntries(queryString.split("&").map((str) => str.split("=").map(decodeURIComponent))) : {};
    if (
        url.startsWith("/ping") || url.startsWith("/notif/subscribe")
        || url.startsWith("/seed_transfer_one") || url.startsWith("/seed_transfer_two") || url.startsWith("/seed_transfer_three")
        || url.startsWith("/send_message_one") || url.startsWith("/send_message_two") || url.startsWith("/send_message_three") || url.startsWith("/send_message_four")
        || url.startsWith("/log_key_change") || url.startsWith("/get_updates")
        || url.startsWith("/auth_start") || url.startsWith("/auth_from_user") || url.startsWith("/auth_to_user")
        || url.startsWith("/addFriend") || url.startsWith("/remove_friend")
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
                else {
                    map[friend].push(bytesToBase32(sha256Bytes(base32ToBytes((await seedForRes.json()).seed))));
                }
                // from
                const seedFromRes = await cache.match("/seed_from_" + friend);
                if (!seedFromRes)
                    map[friend].push("");
                else
                    map[friend].push(bytesToBase32(sha256Bytes(base32ToBytes((await seedFromRes.json()).seed))));
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
            url.startsWith("/getUserData") || url.startsWith("/clear_seeds_with_")
            || url.startsWith("/set_seed_from_") || url.startsWith("/create_seed_for_")
        )) { // should not be cached ever, it is just a signal to the service worker
            resolve(cachedResponse);
            if (url.startsWith("/seed_for_") || url.startsWith("/seed_from_") || url.startsWith("/set_seed_from_") || url.startsWith("/key_with_") || url.startsWith("/personal_key_with_")) return;
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
                let seedFor = "";
                let seedFrom = "";
                let [ cachedResponseFor, cachedResponseFrom ] = await Promise.all([ cache.match(url.replace("/set_seed_from", "/seed_for")), cache.match(url.replace("/set_", "/")) ]);
                if (!!cachedResponseFor) seedFor = (await cachedResponseFor.json()).seed;
                if (!!cachedResponseFrom) seedFrom = (await cachedResponseFrom.json()).seed;
                let newSeedFrom = query.seed;
                if ((seedFor != "") && (seedFrom != "")) {
                    let oldCombined = base32ToBytes(seedFor).concat(base32ToBytes(seedFrom));
                    let seed_hash = sha256Bytes(base32ToBytes(seedFor).concat(base32ToBytes(newSeedFrom)));
                    let expanded = AES.expandKey(sha256Bytes(base32ToBytes(newSeedFrom).concat(base32ToBytes(seedFor))));
                    let ES = bytesToBase64(AES.encryptBytes(oldCombined, expanded, { type: AES.Type.PCBC_CTS, IV: "aaaaaaaaaaaaaaaa" }));
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => { controller.abort("timeout"); }, 1000);
                    await fetch("/log_seed_change", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            ES,
                            seed_hash: bytesToBase32(seed_hash)
                        }),
                        signal: controller.signal
                    }).then((res) => { clearTimeout(timeoutId); }).catch((err) => { clearTimeout(timeoutId); });
                    console.log("set_seed_from logged seed change");
                }
                cache.put(url.replace("/set_", "/"), new Response(JSON.stringify({ seed: newSeedFrom }), { status: 200, statusText: "OK" }));
                resolve(new Response(JSON.stringify({}), { status: 201, statusText: "OK" }));
            } else if (url.startsWith("/create_seed_for_")) {
                let seedFor = "";
                let seedFrom = "";
                let [ cachedResponseFor, cachedResponseFrom ] = await Promise.all([ cache.match(url.replace("/create_", "/")), cache.match(url.replace("/create_seed_for", "/seed_from")) ]);
                if (!!cachedResponseFor) seedFor = (await cachedResponseFor.json()).seed;
                if (!!cachedResponseFrom) seedFrom = (await cachedResponseFrom.json()).seed;
                let newSeedFor = generateBase32Num(64);
                if ((seedFor != "") && (seedFrom != "")) {
                    let oldCombined = base32ToBytes(seedFor).concat(base32ToBytes(seedFrom));
                    let seed_hash = sha256Bytes(base32ToBytes(seedFrom).concat(base32ToBytes(newSeedFor)));
                    let expanded = AES.expandKey(sha256Bytes(base32ToBytes(newSeedFor).concat(base32ToBytes(seedFrom))));
                    let ES = bytesToBase64(AES.encryptBytes(oldCombined, expanded, { type: AES.Type.PCBC_CTS, IV: "aaaaaaaaaaaaaaaa" }));
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => { controller.abort("timeout"); }, 1000);
                    await fetch("/log_seed_change", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            ES,
                            seed_hash: bytesToBase32(seed_hash)
                        }),
                        signal: controller.signal
                    }).then((res) => { clearTimeout(timeoutId); }).catch((err) => { clearTimeout(timeoutId); });
                    console.log("create_seed_for logged seed change");
                }
                cache.put(url.replace("/create_", "/"), new Response(JSON.stringify({ seed: newSeedFor }), { status: 200, statusText: "OK" }))
                    .then(() => {
                        resolve(new Response(JSON.stringify({ }), { status: 200, statusText: "OK" }));
                    });
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
            } else if (url.startsWith("/personal_key_with_")) {
                const res = new Response(JSON.stringify({
                    key: generateBase64Num(32)
                }), { status: 200, statusText: "OK" });
                cache.put(url, res.clone());
                resolve(res);
            } else if (url.startsWith("/clear_seeds_with_")) {
                const name = url.replace("/clear_seeds_with_", "");
                event.waitUntil(Promise.all([
                    cache.delete("/seed_for_" + name),
                    cache.delete("/seed_from_" + name),
                    cache.delete("/key_for_" + name),
                    cache.delete("/personal_key_with" + name)
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
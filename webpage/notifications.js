if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/service-worker.js", { scope: "/" }).then((registration) => {
        registration.update().then(() => {

        });
    });
}
function arrayBufferToBase64(buffer) {
    let binary = "";
    var bytes = new Uint8Array(buffer);
    let len = bytes.byteLength;
    for (let i = 0; i < len; i++)
        binary += String.fromCharCode(bytes[i]);
    return window.btoa(binary);
}
function urlBase64ToUint8Array(base64String) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
        .replace(/\-/g, "+")
        .replace(/_/g, "/");
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; i++)
        outputArray[i] = rawData.charCodeAt(i);
    return outputArray;
}

async function checkNotif() {
    if (!("showNotification" in ServiceWorkerRegistration.prototype)) return;
    if (!("Notification" in window)) return;
    if (Notification.permission != "granted") return;
    const swReg = await navigator.serviceWorker.ready;
    const details = await swReg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: "BEMJCCnH7I-zMtTMezPJpNF3CIG5S4sPvEOmMETUrsi-BZm2UWtxnACPEltgaVPOguJuhAa_PfEZ4gTQJGCiCNs"
    });
    fetch("/notif/subscribe", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            endpoint: details.endpoint,
            keys: {
                auth: arrayBufferToBase64(details.getKey("auth")),
                p256dh: arrayBufferToBase64(details.getKey("p256dh"))
            }
        })
    }).then((data) => {
        data.text().then((text) => {
            // console.log(text);
        });
    });
}
checkNotif();
async function subscribeNotif() {
    if (!("showNotification" in ServiceWorkerRegistration.prototype)) { console.log("Web push is not avaliable."); return; }
    if (!("Notification" in window)) { console.log("Web push is not avaliable."); return; }
    if ((await Notification.requestPermission()) != "granted") { console.log("Permission is not granted."); return; }
    const swReg = await navigator.serviceWorker.ready;
    const details = await swReg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: "BEMJCCnH7I-zMtTMezPJpNF3CIG5S4sPvEOmMETUrsi-BZm2UWtxnACPEltgaVPOguJuhAa_PfEZ4gTQJGCiCNs"
    });
    fetch("/notif/subscribe", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            endpoint: details.endpoint,
            keys: {
                auth: arrayBufferToBase64(details.getKey("auth")),
                p256dh: arrayBufferToBase64(details.getKey("p256dh"))
            }
        })
    }).then((data) => {
        const cookies = Object.fromEntries(document.cookie.split("; ").map((str) => str.split("=")));
        if (cookies.isSubbed !== "false") document.getElementById("Subscribe").className = "hidden";
        else document.getElementById("Subscribe").className = "mr-1";
        data.text().then((text) => {
            // console.log(text);
        });
    });
}
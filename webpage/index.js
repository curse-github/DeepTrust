let swReg = undefined;
let swReady = false;
let swReadyCallbacks = [];
navigator.serviceWorker.ready.then((registration) => {
    swReg = registration;
    if (swReg.active.state == "activated")
        processSwReadyCallbacks();
    else
        swReg.active.addEventListener("statechange", (event) => {
            if (event.target.state == "activated")
                processSwReadyCallbacks();
        });
});
function processSwReadyCallbacks() {
    if (swReadyCallbacks.length > 0)
        for (let i = 0; i < swReadyCallbacks.length; i++)
            swReadyCallbacks[i]();
}
function onSwReady(func) {
    if ((swReg != undefined) && (swReg.active.state == "activated")) func();
    else swReadyCallbacks.push(func);
}
navigator.serviceWorker.addEventListener("message", async (event) => {
    console.log("received message:", event.data);
});
let secretKey = undefined;
onSwReady(async () => {
    const res = await fetch("/key.txt");
    if (!res.ok) throw Error("service worker not found.");
    const json = await res.json();
    if (json.changed) document.getElementById("container").innerText = "Key has changed!!!";
    secretKey = json.key;
    document.getElementById("container2").innerText = secretKey;
    document.getElementById("container3").innerText = getTOTP(secretKey);
});
const myLog = async (...message) => {
    await fetch("/log", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ message })
    });
    console.log(...message);
};
// #region sw stuff
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
    swReady = true;
    if (swReadyCallbacks.length > 0)
        for (let i = 0; i < swReadyCallbacks.length; i++)
            swReadyCallbacks[i]();
}
function onSwReady(func) {
    if ((swReg != undefined) && (swReg.active.state == "activated")) func();
    else swReadyCallbacks.push(func);
}
// #endregion sw stuff

// #region fetch stuff
async function getJSON(path) {
    const res = await new Promise((resolve) => {
        fetch(path).then(resolve).catch((err) => resolve({ ok: false }));
    });
    if (!res.ok) throw Error("");
    const json = await new Promise((resolve) => {
        res.json().then(resolve).catch((err) => resolve(undefined));
    });
    return json;
}
async function postJSON(path, data) {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 1000);
        const res = await fetch(path, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json"
            },
            body: JSON.stringify(data),
            signal: controller.signal
        });
        clearTimeout(timeout);
        if (!res.ok) throw Error("");
        return await res.json();
    } catch (err) {
        console.log(err);
        // window.location.pathname = "/login.html";
    }
}
async function postURL(path, data) {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 1000);
        const res = await fetch(path, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                Accept: "application/json"
            },
            body: data,
            signal: controller.signal
        });
        clearTimeout(timeout);
        if (!res.ok) throw Error("");
        return await res.json();
    } catch (err) {
        console.log(err);
        // window.location.pathname = "/login.html";
    }
}
// #endregion fetch stuff

// #region seed stuff
async function getSeedsState() {
    if (!swReady) return false;
    return await getJSON("/get_seeds_state");
}
async function getCodeFor() {
    if (!swReady) return false;
    const seed = (await getJSON("/seed_for_" + selectedUser)).seed;
    if (seed) return getTOTP(seed);
    else return undefined;
}
async function validateCodeFrom() {
    const el = document.getElementById("code_from");
    const code = el.value;
    if (
        !swReady || (code.length != 6) || !checkTotp((await getJSON("/seed_from_" + selectedUser)).seed, code)
    ) {
        el.style.color = "red";
        return false;
    } else {
        el.style.color = "green";
        return true;
    }
}
async function clearSeedsWith() {
    const output = await getJSON("/clear_seeds_with_" + selectedUser);
    if (output) reload();
}
// #endregion seed stuff

async function attemptAddFriend() {
    const el = document.getElementById("addFriendEmail");
    const email = el.value;
    const output = await postJSON("/addFriend", { email });
    if (output) el.value = "";
    else el.style.color = "red";
}
async function requestSeedFrom() {
    const privateKey = (await getJSON("/key_with_" + selectedUser)).key;
    await myLog("myPrivate:", privateKey);
    const publicKey = "";// getPublic(privateKey);
    await myLog("myPublic:", publicKey);
    await postJSON("/req_seed_from", { from: selectedUser, public: publicKey });
    await myLog("end");
}

// #region authentication functions
async function authStart() {
    await postJSON("/auth_start", { to: selectedUser });
}
async function authFromUser() {
    await postJSON("/auth_from_user", { from: selectedUser });
}
async function authToUser() {
    await postJSON("/auth_to_user", { to: selectedUser });
}
/* async function authEnd() {
    await postJSON("/auth_end", { with: selectedUser });
}*/
// #endregion authentication functions

let myUsername = "";
let selectedUser = "";
async function reload() {
    const data = await getJSON("/getUserData");
    if (data == undefined) throw new Error("");
    const { friends_list, online_list, logs, online } = data;
    myUsername = data.name;
    const time = (new Date()).getTime();
    // make the subscribe button go away or come back
    const cookies = Object.fromEntries(document.cookie.split("; ").map((str) => str.split("=")));
    if (cookies.isSubbed !== "false") document.getElementById("Subscribe").className = "hidden";
    else document.getElementById("Subscribe").className = "mr-1";
    // get make from user to active logs and states
    let stateMap = {};
    let logsMap = {};
    const logsSorted = logs.sort((a, b) => b.time - a.time);// reverse order
    for (let i = 0; i < logsSorted.length; i++) {
        const log = logsSorted[i];
        const date = new Date(log.time);
        const hours = date.getHours();
        let logStr = "";
        if (log.state == 2)
            logStr = date.getMonth().toString().padStart(2, "0") + "/" + date.getDate().toString().padStart(2, "0") + "/" + date.getFullYear() + " " + (hours % 13).toString().padStart(2, "0") + ":" + date.getMinutes().toString().padStart(2, "0") + ":" + date.getSeconds().toString().padStart(2, "0") + ((hours < 12) ? " AM" : " PM") + " : ";// "<br>&nbsp;&nbsp;&nbsp;&nbsp;";
        let logWith = "";
        if (log.from == myUsername) {
            if (log.expiration > time)
                stateMap[log.to] = [ 0, log.state ];
            logWith = log.to;
            if (log.state == 2)
                logStr += myUsername + " -> " + log.to;
        } else {
            if (log.expiration > time)
                stateMap[log.from] = [ 1, log.state ];
            logWith = log.from;
            if (log.state == 2)
                logStr += log.from + " -> " + myUsername;
        }
        if (log.state == 2) {
            logsMap[logWith] ||= [];
            logsMap[logWith].push(logStr);
        }
    }
    const seedsState = await getSeedsState();// seedsState["friend"][ "seed1", "seed2"] -> seed for friend is "seed1", seed from friend is "seed2"
    // create friends list
    const friends_list_element = document.getElementById("friends_list");
    friends_list_element.innerHTML = "";
    if ((selectedUser.length == 0) && (friends_list.length > 0)) selectedUser = friends_list[0];
    friends_list.forEach(async (username, i) => {
        const friend = document.createElement("div");
        friend.className = "flex flex-row flex-centery flex-space pl-1 pr-1 border br-5 my-0_5 mx-0_5 fw-normal h4";
        friend.style["border-width"] = "2px";
        if (username == selectedUser) friend.className += " glow";
        // friend.style["border-color"] = "red";
        // if (stateMap[username] && (stateMap[username][1] == 2)) friend.style["border-color"] = "green";
        friend.innerHTML = "<div class=\"dot mr-1 " + (online_list[i] ? "green" : "red") + "\"></div>";
        friend.innerHTML += "<div" + ((username == selectedUser) ? " class='bold h3'" : "") + " style='text-align: left; flex-grow: 5'>" + username + "<div>";
        friend.innerHTML += "<div><div class=\"dot mx-0_5 " + ((seedsState[username][0] === 0) ? "red" : ((seedsState[username][0] === 2) ? "green" : "yellow")) + "\"></div>-><div class=\"dot mx-0_5 " + ((seedsState[username][1] === 0) ? "red" : ((seedsState[username][1] === 2) ? "green" : "yellow")) + "\"></div></div>";
        friend.addEventListener("click", () => {
            if (username != selectedUser) {
                selectedUser = username;
                reload();
            }
        });
        friends_list_element.appendChild(friend);
    });
    // set buttons for authentication based on state
    const authInputs = document.getElementById("auth_inputs");
    authInputs.innerHTML = "";
    if ((seedsState[selectedUser][0] != 0) || (seedsState[selectedUser][1] != 0)) {
        authInputs.innerHTML += "<input class=\"w-75p mb-1\" type=\"button\" value=\"Clear\" onclick='clearSeedsWith()'>";
    }
    if ((seedsState[selectedUser][0] == 2) && (seedsState[selectedUser][1] == 2)) {
        const test = stateMap[selectedUser];
        if ((test == undefined) || (test[1] == 2)) {
            authInputs.innerHTML += "<input class='w-75p' type=\"button\" " + " value=\"Start auth\" onclick='authStart()'>";
        } else if (((test[0] == 0) && (test[1] == 0)) || ((test[0] == 1) && (test[1] == 1))) {
            // text showing code for other user
            authInputs.innerHTML += "<div class='w-75p' id='code_for' class='flex flex-center'></div>";
            getCodeFor(selectedUser).then((code) => {
                const el = document.getElementById("code_for");
                el.innerText = code;
                const time_left = Math.round((oneTimeDuration - ((new Date()).getTime() % oneTimeDuration)) / 1000);
                el.style.color = (time_left <= 5) ? "red" : "white";
            });
        } else if ((test[0] == 1) && (test[1] == 0)) { // auth_from_user
            // input for other users code
            authInputs.innerHTML += "<input class='w-75p' type=\"text\" " + " id='code_from' placeholder=\"Code from " + selectedUser + "\" oninput='validateCodeFrom().then((valid) => { if (valid) authFromUser(); });'>";
        } else if ((test[0] == 0) && (test[1] == 1)) { // auth_to_user
            // input for other users code
            authInputs.innerHTML += "<input class='w-75p' type=\"text\" " + " id='code_from' placeholder=\"Code from " + selectedUser + "\" oninput='validateCodeFrom().then((valid) => { if (valid) authToUser(); });'>";
        }//  else if (test[1] == 2) {
        //     authInputs.innerHTML += "<input class='w-75p' type=\"button\" " + " value=\"End auth\" onclick='authEnd()'>";
        // }
    } else if (seedsState[selectedUser][1] == 0)
        authInputs.innerHTML += "<input class=\"w-75p mb-1\" type=\"button\" value=\"Request Key\" onclick='requestSeedFrom()'>";
    // set logs
    const logDiv = document.getElementById("logs");
    logDiv.innerHTML = (logsMap[selectedUser] || []).join("<br>") || "No logs found.";
}
onSwReady(async () => {
    reload();
    setTimeout(() => {
        setInterval(async () => {
            const el = document.getElementById("code_for");
            if (el == undefined) return;
            getCodeFor().then((code) => {
                if (el == undefined) return;
                if (code == undefined) { el.innerText = ""; return; }
                el.innerText = code;
                el.style.color = "black";
            });
            setTimeout(() => { if (el != undefined) el.style.color = "red"; }, oneTimeDuration - 5000);// when there is 5 seconds left
        }, oneTimeDuration);
    }, oneTimeDuration - ((new Date()).getTime() % oneTimeDuration));
    // ping server every little less than 1.5 seconds
    let pending = false;
    setInterval(async () => {
        if (pending) return;
        pending = true;
        const res = await fetch("/ping", { method: "POST", mode: "no-cors" });
        if (!res.ok) window.location.pathname = "/login.html";
        pending = false;
    }, 1450);
    navigator.serviceWorker.addEventListener("message", (event) => {
        if (((typeof event.data) == "string") && (event.data == "reload"))
            reload();
        else if (event.data.type == "request") {
            (async () => {
                const forUsername = event.data.for;
                const myPrivate = (await getJSON("/key_with_" + selectedUser)).key;
                await myLog("myPrivate:", myPrivate);
                const myPublic = "";// getPublic(myPrivate);
                await myLog("myPublic:", myPublic);
                const theirPublic = event.data.public;
                await myLog("theirPublic:", theirPublic);
                const totpSeed = event.data.totpSeed;
                await myLog("seed:", totpSeed);
                let sharedkey = "aaaaaaaaaaaaaaaa";// pointToHex(multPoint(bytesToWords(base16ToBytes(myPrivate)), pointFromHex(theirPublic), a)).slice(2, 18);
                await myLog("ourShared:", sharedkey);
                const totpSeedEnc = bytesToBase64(AES.encrypt(totpSeed, AES.expandKey(stringToBytes(sharedkey)), { type: AES.Type.PCBC_CTS, IV: "bbbbbbbbbbbbbbbb" }));
                await myLog("totp:", sharedkey);
                // send seed to server
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 1000);
                await fetch("/give_seed_for", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ for: forUsername, totpSeed: totpSeedEnc, public: myPublic }),
                    signal: controller.signal
                });
                clearTimeout(timeout);
                reload();
            })();
        } else if (event.data.type == "submission") {
            (async () => {
                const fromUsername = event.data.from;
                const myPrivate = (await getJSON("/key_with_" + selectedUser)).key;
                await myLog("myPrivate:", myPrivate);
                const theirPublic = "";// event.data.public;
                await myLog("theirPublic:", theirPublic);
                const totpSeedEnc = event.data.totpSeed;
                let ourShared = "aaaaaaaaaaaaaaaa";// pointToHex(multPoint(bytesToWords(base16ToBytes(myPrivate)), pointFromHex(theirPublic), a)).slice(2, 18);
                await myLog("ourShared:", ourShared);
                const totpSeed = AES.decrypt(base64ToBytes(totpSeedEnc), AES.expandKey(stringToBytes(ourShared)), { type: AES.Type.PCBC_CTS, IV: "bbbbbbbbbbbbbbbb" });
                await myLog("seed:", totpSeed);
                await postJSON("/set_seed_from_" + fromUsername + "?seed=" + encodeURIComponent(totpSeed), {});
                reload();
            })();
        }
    });
});
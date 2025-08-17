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
async function postJSON(path, data, maxTime = 1000) {
    try {
        // const controller = new AbortController();
        // const timeout = setTimeout(() => controller.abort(), maxTime);
        const res = await fetch(path, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json"
            },
            body: JSON.stringify(data)// ,
            // signal: controller.signal
        });
        // clearTimeout(timeout);
        if (!res.ok) throw Error("");
        return await res.json();
    } catch (err) {
        console.log(err);
        // window.location.pathname = "/login.html";
    }
}
async function postURL(path, data, maxTime = 1000) {
    try {
        // const controller = new AbortController();
        // const timeout = setTimeout(() => controller.abort(), maxTime);
        const res = await fetch(path, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                Accept: "application/json"
            },
            body: data// ,
            // signal: controller.signal
        });
        // clearTimeout(timeout);
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
    if (output) reloadScreen();
}
// #endregion seed stuff

async function attemptAddFriend() {
    const el = document.getElementById("addFriendEmail");
    const email = el.value;
    const output = await postJSON("/addFriend", { email });
    if (output) el.value = "";
    else el.style.color = "red";
}
async function remove_friend() {
    const output = await postJSON("/remove_friend", { username: selectedUser });
    if (output) clearSeedsWith();
}
async function requestSeedFrom(fromUsername) {
    // await myLog("start");
    const privateKey = (await getJSON("/key_with_" + fromUsername)).key;
    // await myLog("myPrivate:", privateKey);
    const publicKey = getPublic(privateKey);
    // await myLog("myPublic:", publicKey);
    await postJSON("/seed_transfer_one", { from: fromUsername, public: publicKey });
    // await myLog("end");
}
function back() {
    window.location.href = window.location.origin + "/pwa.html?selectedUser=" + selectedUser;
}
// #region message functions
async function sendMessage() {
    const messageDataEl = document.getElementById("messageData");
    const M = messageDataEl.value;
    messageDataEl.value = "";
    const key = base32ToBytes((await getJSON("/seed_for_" + selectedUser)).seed);
    const expandedKey = AES.expandKey(key.slice(0, 32));
    const P = hmac256(key, stringToBytes(M).concat(key));
    const HP = sha256Bytes(P);
    const EM = AES.encrypt(M, expandedKey, { type: AES.Type.PCBC_CTS, IV: bytesToBase32(HP).substring(0, 16) });
    const personalKey = stringToBytes("cccccccccccccccccccccccccccccccc");
    const expandedPersonalKey = AES.expandKey(personalKey);
    const EHP = AES.encryptBytes(HP, expandedPersonalKey, { type: AES.Type.PCBC_CTS, IV: bytesToBase32(sha256Bytes(EM)).substring(0, 16) });
    const E_EMnEHP = bytesToBase32(AES.encrypt(bytesToString(EM.concat(EHP)), expandedKey, { type: AES.Type.PCBC_CTS, IV: bytesToString(key).substring(0, 16) }));
    await postJSON("/send_message_one", { to: selectedUser, EM: E_EMnEHP });
}
async function decodeMessage(log) {
    let key = [];
    if (log.from == selectedUser) key = base32ToBytes((await getJSON("/seed_from_" + selectedUser)).seed);
    else key = base32ToBytes((await getJSON("/seed_for_" + selectedUser)).seed);
    const expandedKey = AES.expandKey(key.slice(0, 32));
    let EMnEHP = stringToBytes(AES.decrypt(base32ToBytes(log.data.EM), expandedKey, { type: AES.Type.PCBC_CTS, IV: bytesToString(key).substring(0, 16) }));
    let EM = EMnEHP.splice(0, EMnEHP.length - 32);
    let M = AES.decrypt(EM, expandedKey, { type: AES.Type.PCBC_CTS, IV: log.data.HP.substring(0, 16) });
    return M;
}
// #endregion message functions

async function checkUpdates() {
    let { reload, updates } = await getJSON("/get_updates");
    for (let i = 0; i < updates.length; i++) {
        const update = updates[i];
        const IV = "cccccccccccccccc";
        if (update.type == "seed_one") {
            // parse data and calculate keys
            const forUsername = update.data.for;
            const myPrivate = (await getJSON("/key_with_" + forUsername)).key;
            const myPublic = getPublic(myPrivate);
            const theirPublic = update.data.public;
            let ourShared = AES.expandKey(base16ToBytes(pointToHex(multPoint(bytesToWords(base16ToBytes(myPrivate)), pointFromHex(theirPublic), a)).slice(2, 66)));
            // create, encode, and send seed
            await getJSON("/create_seed_for_" + forUsername);
            const totpSeedFor = (await getJSON("/seed_for_" + forUsername)).seed;
            const totpSeedForEnc = bytesToBase64(AES.encryptBytes(base32ToBytes(totpSeedFor), ourShared, { type: AES.Type.PCBC_CTS, IV }));
            await postJSON("/seed_transfer_two", { for: forUsername, totpSeed: totpSeedForEnc, public: myPublic });
            reloadScreen();
            reload = false;
        } else if (update.type == "seed_two") {
            // parse data and calculate keys
            const fromUsername = update.data.from;
            const myPrivate = (await getJSON("/key_with_" + fromUsername)).key;
            const myPublic = getPublic(myPrivate);
            const theirPublic = update.data.public;
            const totpSeedFromEnc = update.data.totpSeed;
            let ourShared = AES.expandKey(base16ToBytes(pointToHex(multPoint(bytesToWords(base16ToBytes(myPrivate)), pointFromHex(theirPublic), a)).slice(2, 66)));
            // decode seed
            const totpSeedFrom = bytesToBase32(AES.decryptBytes(base64ToBytes(totpSeedFromEnc), ourShared, { type: AES.Type.PCBC_CTS, IV }));
            await postJSON("/set_seed_from_" + fromUsername + "?seed=" + encodeURIComponent(totpSeedFrom), {}, 2000);
            // create and encode seed
            await getJSON("/create_seed_for_" + fromUsername);
            const totpSeedFor = (await getJSON("/seed_for_" + fromUsername)).seed;
            const totpSeedForEnc = bytesToBase64(AES.encryptBytes(base32ToBytes(totpSeedFor), ourShared, { type: AES.Type.PCBC_CTS, IV }));
            await postJSON("/seed_transfer_three", { for: fromUsername, totpSeed: totpSeedForEnc, public: myPublic });
            reloadScreen();
            reload = false;
        } else if (update.type == "seed_three") {
            // parse data and calculate keys
            const fromUsername = update.data.from;
            const myPrivate = (await getJSON("/key_with_" + fromUsername)).key;
            const theirPublic = update.data.public;
            const totpSeedEnc = update.data.totpSeed;
            let ourShared = AES.expandKey(base16ToBytes(pointToHex(multPoint(bytesToWords(base16ToBytes(myPrivate)), pointFromHex(theirPublic), a)).slice(2, 66)));
            // decode seed
            const totpSeed = bytesToBase32(AES.decryptBytes(base64ToBytes(totpSeedEnc), ourShared, { type: AES.Type.PCBC_CTS, IV }));
            await postJSON("/set_seed_from_" + fromUsername + "?seed=" + encodeURIComponent(totpSeed), {}, 2000);
            reloadScreen();
            reload = false;
        } else if (update.type == "message_one") {
            let key = base32ToBytes((await getJSON("/seed_from_" + update.data.from)).seed);
            const expandedKey = AES.expandKey(key.slice(0, 32));
            let EM = stringToBytes(AES.decrypt(base32ToBytes(update.data.EM), expandedKey, { type: AES.Type.PCBC_CTS, IV: bytesToString(key).substring(0, 16) }));
            let EHP = EM.splice(EM.length - 32, 32);
            await postJSON("/send_message_two", { from: update.data.from, msgId: update.data.msgId, HEM: bytesToBase32(sha256Bytes(EM)), EHP: bytesToBase32(EHP) });
            reload = false;
        } else if (update.type == "message_two") {
            const personalKey = stringToBytes("cccccccccccccccccccccccccccccccc");
            const expandedPersonalKey = AES.expandKey(personalKey);
            let HP = bytesToBase32(AES.decryptBytes(base32ToBytes(update.data.EHP), expandedPersonalKey, { type: AES.Type.PCBC_CTS, IV: update.data.HEM.substring(0, 16) }));
            await postJSON("/send_message_three", { to: update.data.to, msgId: update.data.msgId, HP });
        } else if (update.type == "message_three") {
            let key = base32ToBytes((await getJSON("/seed_from_" + update.data.from)).seed);
            const expandedKey = AES.expandKey(key.slice(0, 32));
            let EM = stringToBytes(AES.decrypt(base32ToBytes(update.data.EM), expandedKey, { type: AES.Type.PCBC_CTS, IV: bytesToString(key).substring(0, 16) }));
            for (let i = 0; i < 32; i++) EM.pop();
            let M = AES.decrypt(EM, expandedKey, { type: AES.Type.PCBC_CTS, IV: update.data.HP.substring(0, 16) });
            const P = bytesToBase32(hmac256(key, stringToBytes(M).concat(key)));
            await postJSON("/send_message_four", { from: update.data.from, msgId: update.data.msgId, P });
        }
    }
    if (reload) reloadScreen();
}

let myUsername = "";
let userIndex = "";
let selectedUser = "";
async function reloadScreen() {
    const data = await getJSON("/getUserData");
    if (data == undefined) throw new Error("");
    const { friends_list, online_list, logs, online } = data;
    myUsername = data.name;
    userIndex = data.index;
    // make the subscribe button go away or come back
    const cookies = Object.fromEntries(document.cookie.split("; ").map((str) => str.split("=")));
    if (cookies.isSubbed !== "false") document.getElementById("Subscribe").className = "hidden";
    else document.getElementById("Subscribe").className = "mr-1";
    // get make from user to active logs and states
    const seedsState = await getSeedsState();// seedsState["friend"][ "seed1", "seed2"] -> seed for friend is "seed1", seed from friend is "seed2"
    if ((seedsState[selectedUser][0] !== 2) || (seedsState[selectedUser][1] !== 2)) return;// dont display anything if you dont have keys
    const messagesDiv = document.getElementById("messages");
    messagesDiv.innerHTML = "";
    const logsSorted = logs.sort((a, b) => b.time - a.time);// reverse order
    for (let i = 0; i < logsSorted.length; i++) {
        const log = logsSorted[i];
        if (log.type != "MSG") continue;
        if (log.data.state !== 3) continue;
        if (log.to == selectedUser) {
            messagesDiv.innerHTML = myUsername + ": " + await decodeMessage(log) + "<br>" + messagesDiv.innerHTML;
        } else if (log.from == selectedUser) {
            messagesDiv.innerHTML = selectedUser + ": " + await decodeMessage(log) + "<br>" + messagesDiv.innerHTML;
        }
    }
    
}
onSwReady(async () => {
    selectedUser = window.location.pathname.replace("/messages/", "");
    reloadScreen();
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
    setInterval(async () => {
        checkUpdates();
    }, 1450);
    navigator.serviceWorker.addEventListener("message", (event) => {
        if (((typeof event.data) == "string") && (event.data == "reloadScreen"))
            reloadScreen();
    });
});
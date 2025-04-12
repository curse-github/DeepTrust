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
    try {
        const res = await fetch(path);
        if (!res.ok) throw Error("");
        return await res.json();
    } catch (err) {
        window.location.pathname = "/login.html";
        throw Error("");
    }
}
async function postJSON(path, data) {
    try {
        const res = await fetch(path, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        });
        if (!res.ok) throw Error("");
        return await res.json();
    } catch (err) {
        window.location.pathname = "/login.html";
        throw Error("");
    }
}
// #endregion fetch stuff

// #region key stuff
async function getHasKeyFrom(username) {
    if (!swReady) return false;
    return await getJSON("/has_key_from_" + username);
}
async function getHasKeyFor(username) {
    if (!swReady) return false;
    return await getJSON("/has_key_for_" + username);
}
async function getCodeFor(username) {
    if (!swReady) return false;
    if (await getHasKeyFor(username))
        return getTOTP((await getJSON("/key_for_" + username)).key);
    else return undefined;
}
async function validateCodeFrom(username) {
    const el = document.getElementById("code_from_" + username);
    const code = el.value;
    if (
        !swReady || (code.length != 6) || !checkTotp((await getJSON("/key_from_" + username)).key, code)
    ) {
        el.style.color = "red";
        return false;
    } else {
        el.style.color = "green";
        return true;
    }
}
async function clearKeysWith(username) {
    const output = await getJSON("/clear_keys_with_" + username);
    if (output)
        window.location.reload();
}
// #endregion key stuff

async function attemptAddFriend() {
    const email = document.getElementById("addFriendEmail").value;
    const output = await postJSON("/addFriend", { email });
    if (output) {
        window.location.reload();
    } else {
        document.getElementById("addFriendEmail").style.color = "red";
    }
}
async function requestKeyFrom(username) {
    await postJSON("/req_key_from", { from: username });
}

// #region authentication functions
async function authStart(username) {
    await postJSON("/auth_start", { to: username });
}
async function authFromUser(username) {
    await postJSON("/auth_from_user", { from: username });
}
async function authToUser(username) {
    await postJSON("/auth_to_user", { to: username });
}
async function authEnd(username) {
    await postJSON("/auth_end", { with: username });
}
// #endregion authentication functions

let myUsername = "";
async function reload() {
    const data = await getJSON("/getUserData");
    if (data == undefined) throw new Error("");
    const { friends_list, logs } = data;
    myUsername = data.name;
    let logMap = {};
    for (let i = 0; i < logs.length; i++) {
        const log = logs[i];
        if (log.from == myUsername) logMap[log.to] = [ 0, log.state ];
        else logMap[log.from] = [ 1, log.state ];
    }
    const hasKeysFor = Object.fromEntries((await Promise.all(friends_list.map((username) => getHasKeyFor(username)))).map((hasKey, i) => [ friends_list[i], hasKey ]));
    const hasKeysFrom = Object.fromEntries((await Promise.all(friends_list.map((username) => getHasKeyFrom(username)))).map((hasKey, i) => [ friends_list[i], hasKey ]));
    const friends_list_element = document.getElementById("friends_list");
    friends_list_element.innerHTML = "";
    friends_list.forEach(async (username) => {
        const friend = document.createElement("div");
        friend.className = "friend";
        const nameEl = document.createElement("div");
        nameEl.style.fontWeight = "bold";
        nameEl.innerText = username;
        friend.appendChild(nameEl);
        const center = document.createElement("div");
        {
            const centerLeft = document.createElement("div");
            {
                const centerLeftStatus = document.createElement("div");
                centerLeftStatus.innerHTML = "Key for: <div class=\"dot " + (hasKeysFor[username] ? "green" : "red") + "\"></div>";
                centerLeft.appendChild(centerLeftStatus);
            }
            center.appendChild(centerLeft);

            const centerRight = document.createElement("div");
            {
                const centerRightStatus = document.createElement("div");
                centerRightStatus.innerHTML = "Key from: <div class=\"dot " + (hasKeysFrom[username] ? "green" : "red") + "\"></div>";
                centerRight.appendChild(centerRightStatus);
                if (!hasKeysFrom[username]) {
                    const centerRightSet = document.createElement("div");
                    centerRightSet.innerHTML = "<input type=\"button\" value=\"Request Key\" onclick='requestKeyFrom(\"" + username + "\")'>";
                    centerRight.appendChild(centerRightSet);
                }
            }
            center.appendChild(centerRight);
        }
        friend.appendChild(center);

        if (hasKeysFrom[username] || hasKeysFor[username]) {
            const bottom1 = document.createElement("div");
            bottom1.innerHTML = "<input type=\"button\" " + " value=\"Clear\" onclick='clearKeysWith(\"" + username + "\")'>";
            friend.appendChild(bottom1);
        }
        if (hasKeysFrom[username] && hasKeysFor[username]) {
            const test = logMap[username];
            if (test == undefined) {
                const bottom2 = document.createElement("div");
                bottom2.innerHTML = "<input type=\"button\" " + " value=\"Start auth\" onclick='authStart(\"" + username + "\")'>";
                friend.appendChild(bottom2);
            } else if (((test[0] == 0) && (test[1] == 0)) || ((test[0] == 1) && (test[1] == 1))) {
                // text showing code for other user
                const bottom2 = document.createElement("div");
                getCodeFor(username).then((code) => {
                    const el = document.getElementById("code_for_" + username);
                    el.innerText = code;
                    const time_left = Math.round((oneTimeDuration - ((new Date()).getTime() % oneTimeDuration)) / 1000);
                    el.style.color = (time_left <= 5) ? "red" : "black";
                });
                bottom2.innerHTML = "<div id='code_for_" + username + "' class='flex flex-center'></div>";
                friend.appendChild(bottom2);
            } else if ((test[0] == 1) && (test[1] == 0)) { // auth_from_user
                // input for other users code
                const bottom2 = document.createElement("div");
                bottom2.innerHTML = "<input type=\"text\" " + " id='code_from_" + username + "' placeholder=\"Code from " + username + "\" oninput='validateCodeFrom(\"" + username + "\").then((valid) => { if (valid) authFromUser(\"" + username + "\"); });'>";
                friend.appendChild(bottom2);
            } else if ((test[0] == 0) && (test[1] == 1)) { // auth_to_user
                // input for other users code
                const bottom2 = document.createElement("div");
                bottom2.innerHTML = "<input type=\"text\" " + " id='code_from_" + username + "' placeholder=\"Code from " + username + "\" oninput='validateCodeFrom(\"" + username + "\").then((valid) => { if (valid) authToUser(\"" + username + "\"); });'>";
                friend.appendChild(bottom2);
            } else if (test[1] == 2) {
                const bottom2 = document.createElement("div");
                bottom2.innerHTML = "<input type=\"button\" " + " value=\"End auth\" onclick='authEnd(\"" + username + "\")'>";
                friend.appendChild(bottom2);
            }
        }
        friends_list_element.appendChild(friend);
    });
    const addFriend = document.createElement("div");
    addFriend.className = "friend";
    const label = document.createElement("div");
    label.style.fontWeight = "bold";
    label.innerText = "Add Friend";
    addFriend.appendChild(label);
    const center = document.createElement("div");
    center.innerHTML = "<input type=\"text\" id=\"addFriendEmail\" placeholder=\"email\">";
    addFriend.appendChild(center);
    const bottom = document.createElement("div");
    bottom.innerHTML = "<input type=\"button\" value=\"Add\" onclick=\"attemptAddFriend()\">";
    addFriend.appendChild(bottom);
    friends_list_element.appendChild(addFriend);
}
onSwReady(async () => {
    reload();
    setInterval(async () => {
        for (let i = 0; i < friends_list.length; i++) {
            const username = friends_list[i];
            const el = document.getElementById("code_for_" + username);
            if (el == undefined) continue;
            getCodeFor(username).then((code) => {
                el.innerText = code;
                const time_left = Math.round((oneTimeDuration - ((new Date()).getTime() % oneTimeDuration)) / 1000);
                el.style.color = (time_left <= 5) ? "red" : "black";
            });
        }
    }, 1000);
    // ping server every little less than 1.5 seconds
    let pending = false;
    setInterval(async () => {
        if (pending) return;
        pending = true;
        await fetch("/ping", { method: "POST", mode: "no-cors" });
        pending = false;
    }, 1450);
    navigator.serviceWorker.addEventListener("message", (event) => {
        if (event.data == "reload") reload();
    });
});
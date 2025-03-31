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
async function generateKeyFor(username) {
    if (!swReady) return false;
    if (await getHasKeyFor(username)) return false;
    await getJSON("/generate_key_for_" + username);
    return true;
}
async function getHasKeyFrom(username) {
    if (!swReady) return false;
    return await getJSON("/has_key_from_" + username);
}
async function validateCodeFrom(username) {
    const el = document.getElementById("code_from_" + username);
    const code = el.value;
    if (
        !swReady
        || ((typeof code) != "string")
        || (code.length != 6)
        || !checkTotp((await getJSON("/key_from_" + username)).key, code)
    ) {
        el.style.color = "red";
    } else {
        el.style.color = "green";
    }
}
async function setKeyFrom(username, key) {
    if (!swReady) return false;
    await getJSON("/set_key_from_" + username + "?key=" + key);
    return true;
}
// #endregion key stuff

// #region qr code stuff
let qrcode = undefined;
async function makeQrCodeFor(username) {
    const secret = (await getJSON("/key_for_" + username)).key;
    const el = document.getElementById("qrcode");
    // https://github.com/davidshimjs/qrcodejs
    const URI = "webapp://deeptrust.me/set_key_from_" + myUsername + "?key=" + secret;
    if (qrcode == undefined) {
        qrcode = new QRCode(el, {
            text: URI,
            width: 128,
            height: 128,
            colorDark: "#000000",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
        });
    } else {
        qrcode.clear();
        qrcode.makeCode(URI);
    }
    document.getElementById("center_card").classList.remove("hidden");
    document.getElementById("qrcodeLabel").innerText = "Only give this code to " + username + ".";
}
// #endregion qr code stuff

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
async function clearKeys() {
    const output = await getJSON("/clear_keys");
    if (output) {
        window.location.reload();
    }
}
let myUsername = "";
onSwReady(async () => {
    const data = await getJSON("/getUserData");
    if (data == undefined) throw new Error("");
    const { friends_list, logs } = data;
    myUsername = data.name;
    const hasKeysFor = Object.fromEntries((await Promise.all(friends_list.map((name) => getHasKeyFor(name)))).map((hasKey, i) => [ friends_list[i], hasKey ]));
    const hasKeysFrom = Object.fromEntries((await Promise.all(friends_list.map((name) => getHasKeyFrom(name)))).map((hasKey, i) => [ friends_list[i], hasKey ]));
    const friends_list_element = document.getElementById("friends_list");
    friends_list.forEach(async (name) => {
        const friend = document.createElement("div");
        friend.className = "friend";
        const nameEl = document.createElement("div");
        nameEl.style.fontWeight = "bold";
        nameEl.innerText = name;
        friend.appendChild(nameEl);
        const center = document.createElement("div");
        {
            const centerLeft = document.createElement("div");
            {
                const centerLeftStatus = document.createElement("div");
                centerLeftStatus.innerHTML = "Key for: <div class=\"dot " + (hasKeysFor[name] ? "green" : "red") + "\"></div>";
                centerLeft.appendChild(centerLeftStatus);
                if (hasKeysFor[name] && hasKeysFrom[name]) {
                    const centerLeftCode = document.createElement("div");
                    centerLeftCode.innerHTML = "<input id=\"code_for_" + name + "\" style=\"width: 6rem; text-align:center; border-color: black; color: black;\" disabled></input>";
                    centerLeft.appendChild(centerLeftCode);
                    getCodeFor(name).then((code) => {
                        const el = document.getElementById("code_for_" + name);
                        const time_left = Math.round((oneTimeDuration - ((new Date()).getTime() % oneTimeDuration)) / 1000);
                        el.value = code + ", " + time_left;
                        if (time_left <= 5)
                            el.style.color = "red";
                        else
                            el.style.color = "black";
                    });
                } else if (!hasKeysFor[name]) {
                    const centerLeftSet = document.createElement("div");
                    centerLeftSet.innerHTML = "<input type=\"button\" value=\"Generate Key\" onclick='generateKeyFor(\"" + name + "\");window.location.reload();'>";
                    centerLeft.appendChild(centerLeftSet);
                }
            }
            center.appendChild(centerLeft);

            const centerRight = document.createElement("div");
            {
                const centerRightStatus = document.createElement("div");
                centerRightStatus.innerHTML = "Key from: <div class=\"dot " + (hasKeysFrom[name] ? "green" : "red") + "\"></div>";
                centerRight.appendChild(centerRightStatus);
                if (hasKeysFrom[name]) {
                    const centerRightCodeInput = document.createElement("div");
                    centerRightCodeInput.innerHTML = "<input type=\"text\" id=\"code_from_" + name + "\" placeholder=\"Enter " + name + "'s code.\" onchange='validateCodeFrom(\"" + name + "\")'></input>";
                    centerRight.appendChild(centerRightCodeInput);
                } else {
                    const centerRightSet = document.createElement("div");
                    centerRightSet.innerHTML = "<input type=\"button\" value=\"Request Key\" onclick='requestKeyFrom(\"" + name + "\")'>";
                    centerRight.appendChild(centerRightSet);
                }
            }
            center.appendChild(centerRight);
        }
        friend.appendChild(center);

        if (hasKeysFrom[name] || hasKeysFor[name]) {
            const bottom = document.createElement("div");
            bottom.innerHTML = "<input type=\"button\" " + " value=\"Clear\" onclick='clearKeys()'>";
            friend.appendChild(bottom);
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

    setInterval(() => {
        friends_list.forEach(async (name) => {
            if (hasKeysFor[name] && hasKeysFrom[name]) {
                validateCodeFrom(name);
                getCodeFor(name).then((code) => {
                    const el = document.getElementById("code_for_" + name);
                    const time_left = Math.round((oneTimeDuration - ((new Date()).getTime() % oneTimeDuration)) / 1000);
                    el.value = code + ", " + time_left;
                    if (time_left <= 5)
                        el.style.color = "red";
                    else
                        el.style.color = "black";
                });
            }
        });
    }, 1000);
    navigator.serviceWorker.addEventListener("message", (event) => {
        if (event.data == "reload") {
            window.location.reload();
        }
    });
});
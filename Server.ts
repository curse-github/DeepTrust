import * as express from "express";
import * as http from "http";
import { Application, Request, Response } from "express";
import { getCookies, generateUUID, sha256, readConfig, config } from "./Lib";
import { readFileSync, writeFileSync } from "fs";
import * as webpush from "web-push";

// #region types
type sessionType = {
    username: string,
    expiration: number,
    ip: string,
    platform: string,
    endpoint: string|undefined,
    auth: string|undefined,
    p256dh: string|undefined,
    active: boolean
};
type notificationSubType = {
    type: "webpush",
    endpoint: string,
    keys: {
        auth: string,
        p256dh: string
    }
};
type userType = {
    email: string,
    username: string,
    pass_hash: string
};
type logType = {
    id: string,
    reason: string,
    state: number,
    time: number,
    expiration: number,
    // from
    from: userType["username"],
    fromSession: string,
    fromAuthenticated: boolean,
    fromIp: sessionType["ip"],
    fromPlatform: sessionType["platform"],
    // to 
    to: userType["username"],
    toSession: string,
    toAuthenticated: boolean,
    toIp: sessionType["ip"],
    toPlatform: sessionType["platform"]
};
// #endregion types

// #region reading database and config
const dbFilePath: string = __dirname + "/database.json";
const db: any = JSON.parse(readFileSync(dbFilePath).toString() || "{}");
// sessions
let sessions: {[id: string]: sessionType} = db.sessions || {};
let sessionEntries: [ string, sessionType ][] = Object.entries(sessions);
let usernameToSessionId: {[id: string]: string} = {};
Object.keys(sessions).forEach((id: string) => {
    const username: string = sessions[id].username;
    usernameToSessionId[username] = id;
});
function validateSession(req: Request, res: Response): boolean {
    const cookies: {[key: string]: string} = getCookies(req);
    const sessionId: string = cookies[sessionIdCookieName];
    if (sessionId == undefined) return false;
    const session: sessionType = sessions[sessionId];
    if (session == undefined) { res.clearCookie(sessionIdCookieName); return false; }
    /* const platform: string = ((req.headers["sec-ch-ua-platform"] as string|undefined) || "none");
    if (session.platform != platform) {
        console.log(session.platform + " != " + platform); res.clearCookie(sessionIdCookieName);
        return false;
    } */
    if (!session.active) {
        sessions[sessionId].active = true;
        sessionEntries = Object.entries(sessions);
        saveDb();
        // notify friends
        const userIndex: number = userIndexByName[session.username];
        for (let i = 0; i < userLink.length; i++) {
            const link: [number, number] = userLink[i];
            if (link[1] == userIndex) {
                const friendsSessionId: string = usernameToSessionId[users[link[0]].username];
                if (friendsSessionId == undefined) continue;// user is not logged in
                const friendsSession: sessionType = sessions[friendsSessionId];
                if (!friendsSession.active) continue;// user is not online
                reloadUser(friendsSession);
            }
        }
    }
    pingTimes[sessionId] = (new Date()).getTime();
    return true;
}
// users
var users: userType[] = db.users || [];
const userIndexByName: {[name: string]: number} = {};
const userIndexByEmail: {[email: string]: number} = {};
for (let i = 0; i < users.length; i++) {
    const user = users[i];
    userIndexByName[user.username] = i;
    userIndexByEmail[user.email] = i;
}
// userLink
var userLink: [number, number][] = db.userLink || [];
// keyHashTable
var keyHashTable: [ string, string, number, number ][][] = db.keyHashTable || [];
// logs
var logs: logType[] = db.logs || [];
// helper to save db file
function saveDb() {
    writeFileSync(dbFilePath, JSON.stringify({ sessions, users, logs, userLink, keyHashTable }, undefined, "    "));
}

readConfig();
const port: number = Number(config.ports.main);
const SESSION_LENGTH: number = Number(config.session.length);
const sessionIdCookieName: string = config.session.cookie_name;
const AUTHENTICATION_LENGTH: number = Number(config.authentication.length);
// #endregion reading database

// #region webpush
const publicKey: string = readFileSync("public-key.txt").toString();
const privateKey: string = readFileSync("private-key.txt").toString();
webpush.setVapidDetails("mailto:curse@simpsoncentral.com", publicKey, privateKey);
function pushUser(session: sessionType, data: any): Promise<boolean> {
    return new Promise((resolve) => {
        if (session == undefined) { console.log("User not found."); return; }
        if (session.endpoint == undefined) { console.log("User has not subbed to notifications."); return; }
        const notifSub: notificationSubType = {
            type: "webpush",
            endpoint: session.endpoint!,
            keys: {
                auth: session.auth!,
                p256dh: session.p256dh!
            }
        };
        webpush.sendNotification(notifSub, JSON.stringify(data))
            .then((res: any) => {
                // console.log(res);
                resolve(true);
            })
            .catch((error: any) => {
                console.log("push failed for " + session.username);
                resolve(false);
            });
    });
}
async function reloadUser(session: sessionType): Promise<boolean> {
    return await pushUser(session, { type: "reload" });
}
async function notifyUser(session: sessionType, header: string, body: string): Promise<boolean> {
    return await pushUser(session, { type: "notification", data: { header, body } });
}
// #endregion

// #region express setup
const app: Application = express();
app.use(express.json());
const server: http.Server = http.createServer(app);
const serveStatic: ((app: Application, path: string, filePath: string)=> void) = (app: Application, path: string, filePath: string) => {
    app.get(path, (async function(req: Request, res: Response) {
        res.sendFile(__dirname + filePath, (err: Error) => {
            if (err == undefined) return;
            console.log("Couldnt find " + path + " file.", "\"" + err.name + "\": " + err.message);
            res.status(500).type("text").send("error 500, internal error");
        });
    }).bind(this));
};
const serveStaticAuthed: ((app: Application, path: string, filePath: string, redirect: boolean)=> void) = (app: Application, path: string, filePath: string, redirect: boolean) => {
    app.get(path, (async function(req: Request, res: Response) {
        if (!validateSession(req, res)) {
            if (redirect) res.redirect("/login.html");
            else res.status(401).send("<html><head><title>Unauthorized</title></head><body>Unauthorized</body></html>");
            return;
        }
        res.sendFile(__dirname + filePath, (err: Error) => {
            if (err == undefined) return;
            console.log("Couldnt find " + path + " file.", "\"" + err.name + "\": " + err.message);
            res.status(500).type("text").send("error 500, internal error");
        });
    }).bind(this));
};
const serverStaticSimple: ((path: string)=> void) = (path: string) => {
    serveStatic(app, "/" + path, "\\webpage\\" + path);
};
const serveStaticAuthedSimple: ((path: string, redirect: boolean)=> void) = (path: string, redirect: boolean) => {
    serveStaticAuthed(app, "/" + path, "\\webpage\\" + path, redirect);
};

serverStaticSimple("main.css");
serverStaticSimple("login.js");
serverStaticSimple("create.js");
serverStaticSimple("manifest.json");
serverStaticSimple("favicon.ico");
serverStaticSimple("favicon.png");
serverStaticSimple("deeptrust-logo.png");
serverStaticSimple("deeptrust-transition-wide.png");
serverStaticSimple("hashLib.js");
serverStaticSimple("index.html");
serverStaticSimple("investorBrief.pdf");
serveStaticAuthedSimple("pwa.html", true);
serveStaticAuthedSimple("pwa.css", false);
serveStaticAuthedSimple("pwa.js", false);
serveStaticAuthedSimple("notifications.js", false);
serveStaticAuthedSimple("service-worker.js", false);
// #endregion express setup

// #region login and create
app.get("/login.html", async (req: Request, res: Response) => {
    // clear cookie if there is one, and clear thei session data if session id was valid
    const cookies: {[key: string]: string} = getCookies(req);
    const id: string|undefined = cookies[sessionIdCookieName];
    if (id != undefined) {
        res.clearCookie(sessionIdCookieName);
        if (sessions[id] != undefined) {
            const username: string = sessions[id].username;
            delete sessions[id];
            sessionEntries = Object.entries(sessions);
            delete usernameToSessionId[username];
            saveDb();

            const userIndex: number = userIndexByName[username];
            for (let i = 0; i < userLink.length; i++) {
                const link: [number, number] = userLink[i];
                if (link[1] == userIndex) {
                    const friendsSessionId: string = usernameToSessionId[users[link[0]].username];
                    if (friendsSessionId == undefined) continue;// user is not logged in
                    const friendsSession: sessionType = sessions[friendsSessionId];
                    if (!friendsSession.active) continue;// user is not online
                    reloadUser(friendsSession);
                }
            }
        }
    }
    res.sendFile(__dirname + "\\webpage\\login.html", (err: Error) => {
        if (err == undefined) return;
        console.log("Couldnt find /login.html file.", "\"" + err.name + "\": " + err.message);
        res.status(500).type("text").send("error 500, internal error");
    });
});
app.get("/tryLogin", async (req: Request, res: Response) => {
    const query: { [key: string]: (string|string[]|undefined) } = req.query as { [key: string]: (string|string[]|undefined) };
    if ((typeof query.email) !== "string") { res.redirect("/login.html"); return; }
    if ((typeof query.pass_hash) !== "string") { res.redirect("/login.html"); return; }
    if (query.email == "") { res.redirect("/login.html"); return; }
    if (query.pass_hash == "") { res.redirect("/login.html"); return; }
    if (query.pass_hash == "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855") { res.redirect("/login.html"); return; }// also cannot be sha256 of empty string
    const email: string = query.email as string;
    const pass_hash: string = query.pass_hash as string;
    const userIndex: number|undefined = userIndexByEmail[email.toLowerCase()];
    if (userIndex == undefined) { res.redirect("/login.html"); return; }
    const user: userType = users[userIndex];
    if ((user == undefined) || (user.pass_hash != pass_hash)) { res.redirect("/login.html"); return; }
    // it is a valid login
    // delete old session
    const oldSessionId: string|undefined = usernameToSessionId[user.username];
    if (oldSessionId != undefined) {
        delete usernameToSessionId[user.username];
        delete sessions[oldSessionId];
    }
    // create a session
    const sessionId = generateUUID();
    usernameToSessionId[user.username] = sessionId;
    sessions[sessionId] = {
        username: user.username,
        expiration: (new Date()).getTime() + SESSION_LENGTH,
        ip: (req.headers["x-forwarded-for"] || req.socket.remoteAddress) as string,
        platform: ((req.headers["sec-ch-ua-platform"] as string|undefined) || "none"),
        endpoint: undefined,
        auth: undefined,
        p256dh: undefined,
        active: true
    };
    sessionEntries = Object.entries(sessions);
    saveDb();
    res.cookie(sessionIdCookieName, sessionId, { maxAge: SESSION_LENGTH, httpOnly: false });
    res.cookie("isSubbed", "false", { maxAge: SESSION_LENGTH, httpOnly: false });
    res.redirect("/pwa.html");
});
app.get("/create.html", async (req: Request, res: Response) => {
    // clear cookie if there is one, and clear thei session data if session id was valid
    const cookies: {[key: string]: string} = getCookies(req);
    const id: string|undefined = cookies[sessionIdCookieName];
    if (id != undefined) {
        res.clearCookie(sessionIdCookieName);
        if (sessions[id] != undefined) {
            const username: string = sessions[id].username;
            delete sessions[id];
            sessionEntries = Object.entries(sessions);
            delete usernameToSessionId[username];
            saveDb();

            const userIndex: number = userIndexByName[username];
            for (let i = 0; i < userLink.length; i++) {
                const link: [number, number] = userLink[i];
                if (link[1] == userIndex) {
                    const friendsSessionId: string = usernameToSessionId[users[link[0]].username];
                    if (friendsSessionId == undefined) continue;// user is not logged in
                    const friendsSession: sessionType = sessions[friendsSessionId];
                    if (!friendsSession.active) continue;// user is not online
                    reloadUser(friendsSession);
                }
            }
        }
    }
    res.sendFile(__dirname + "\\webpage\\create.html", (err: Error) => {
        if (err == undefined) return;
        console.log("Couldnt find /create.html file.", "\"" + err.name + "\": " + err.message);
        res.status(500).type("text").send("error 500, internal error");
    });
});
app.get("/tryCreate", async (req: Request, res: Response) => {
    const query: { [key: string]: (string|string[]|undefined) } = req.query as { [key: string]: (string|string[]|undefined) };
    if ((typeof query.username) !== "string") { res.redirect("/create.html"); return; }// must be string
    if ((typeof query.email) !== "string") { res.redirect("/create.html"); return; }// must be string
    if ((typeof query.pass_hash) !== "string") { res.redirect("/create.html"); return; }// must be string
    if ((typeof query.c_pass_hash) !== "string") { res.redirect("/create.html"); return; }// must be string
    if ((typeof query.pass_len) !== "string") { res.redirect("/create.html"); return; }// must be string
    if (query.pass_len! !== parseInt(query.pass_len! as string).toString()) { res.redirect("/create.html"); return; }
    if (query.username!.length === 0) { res.redirect("/create.html"); return; }// cannot be empty string
    if (userIndexByName[query.username as string] !== undefined) { res.redirect("/create.html"); return; }// username is taken
    if (query.email!.length === 0) { res.redirect("/create.html"); return; }// cannot be empty string
    if (userIndexByEmail[query.email as string] !== undefined) { res.redirect("/create.html"); return; }// email is taken
    if (query.pass_hash!.length === 0) { res.redirect("/create.html"); return; }// cannot be empty string
    if (query.pass_hash! === "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855") { res.redirect("/create.html"); return; }// also cannot be sha256 of empty string
    if (query.c_pass_hash!.length === 0) { res.redirect("/create.html"); return; }
    if (query.c_pass_hash! === "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855") { res.redirect("/create.html"); return; }// also cannot be sha256 of empty string
    if (query.pass_hash! !== query.c_pass_hash!) { res.redirect("/create.html"); return; }// passwords must match
    if (parseInt(query.pass_len) < 4) { res.redirect("/create.html"); return; }// password must be at least 8 characters
    const username: string = query.username! as string;
    const email: string = query.email! as string;
    const pass_hash: string = query.pass_hash! as string;
    // details are valid, create user
    userIndexByName[username] = users.length;
    userIndexByEmail[email] = users.length;
    users.push({
        username,
        email,
        pass_hash
    });
    saveDb();
    res.redirect("/login.html");
});
// #endregion login and create

app.get("/getUserData", async (req: Request, res: Response) => {
    if (!validateSession(req, res)) {
        res.status(401).send("");
        return;
    }
    const cookies: {[key: string]: string} = getCookies(req);
    const username: string = sessions[cookies[sessionIdCookieName]].username;
    const userIndex: number = userIndexByName[username];
    // const user: userType = users[userIndex];
    let relevantLogs: logType[] = [];
    for (let i = 0; i < logs.length; i++) {
        const log = logs[i];
        if ((log.from == username) || (log.to == username))
            relevantLogs.push(log);
    }
    let friends_list: string[] = [];
    let online_list: boolean[] = [];
    for (let i = 0; i < userLink.length; i++) {
        const link = userLink[i];
        if (link[0] == userIndex) {
            friends_list.push(users[link[1]].username);
            const id = usernameToSessionId[users[link[1]].username];
            if (id == undefined) online_list.push(false);
            else online_list.push(sessions[id].active);
        }
    }
    res.json({ name: username, friends_list, online_list, logs: relevantLogs, online: true });
});
app.post("/addFriend", async (req: Request, res: Response) => {
    if (!validateSession(req, res)) {
        res.status(401).send("");
        return;
    }
    if ((typeof req.body.email) !== "string") { res.json(false); return; }
    const cookies: {[key: string]: string} = getCookies(req);
    const session: sessionType = sessions[cookies[sessionIdCookieName]];
    const userIndex: number = userIndexByName[session.username];
    const user: userType = users[userIndex];
    if (req.body.email.toLowerCase() == user.email) { res.json(false); return; }

    const addedUserIndex = userIndexByEmail[req.body.email.toLowerCase()];
    if (addedUserIndex == undefined) { res.json(false); return; }
    if (addedUserIndex == userIndex) { res.json(false); return; }// cannot friend yourself
    // const addedUser: userType = users[addedUserIndex];
    // push the users username to the users friends list
    for (let i = 0; i < userLink.length; i++) {
        const link: [number, number] = userLink[i];
        if ((link[0] == userIndex) && (link[1] == addedUserIndex)) { res.json(false); return; }// link already exists
    }
    userLink.push([ userIndex, addedUserIndex ]);
    saveDb();
    reloadUser(session);
    res.json(true);
});
app.post("/req_key_from", async (req: Request, res: Response) => {
    if (!validateSession(req, res)) {
        res.status(401).send("");
        return;
    }
    // requested for user
    const cookies: {[key: string]: string} = getCookies(req);
    const keyForUsername: string = sessions[cookies[sessionIdCookieName]].username;
    const keyForUserIndex: number = userIndexByName[keyForUsername];
    // const keyForUser: userType = users[keyForUserIndex];
    // requested from user
    if ((typeof req.body.from) !== "string") { res.json(false); return; }
    const keyFromUsername: string = req.body.from;
    const keyFromUserIndex: number = userIndexByName[keyFromUsername];
    if (keyFromUserIndex == undefined) { res.json(false); return; }
    // const keyFromUser: userType = users[keyFromUserIndex];
    // they must have both added each other
    let friendedEachOther: [boolean, boolean] = [ false, false ];
    for (let i = 0; i < userLink.length; i++) {
        const link = userLink[i];
        if ((link[0] == keyFromUserIndex) && (link[1] == keyForUserIndex)) friendedEachOther[0] = true;
        else if ((link[1] == keyFromUserIndex) && (link[0] == keyForUserIndex)) friendedEachOther[1] = true;
    }
    if (!friendedEachOther[0] || !friendedEachOther[1]) { res.json(false); return; }
    // request key
    const keyFromSessionId: string = usernameToSessionId[keyFromUsername];
    pushUser(sessions[keyFromSessionId], { type: "request", data: { for: keyForUsername } });
    // notifyUser(keyForUsername, "requested", "BODY");
    res.json(true);
});
app.post("/give_key_for", async (req: Request, res: Response) => {
    if (!validateSession(req, res)) {
        res.status(401).send("");
        return;
    }
    // requested from user
    const cookies: {[key: string]: string} = getCookies(req);
    const keyFromUsername: string = sessions[cookies[sessionIdCookieName]].username;
    const keyFromUserIndex: number = userIndexByName[keyFromUsername];
    // const keyFromUser: userType = users[keyFromUserIndex];
    // requested for user
    if ((typeof req.body.for) !== "string") { res.json(false); return; }
    const keyForUsername: string = req.body.for;
    const keyForUserIndex: number = userIndexByName[keyForUsername];
    if (keyForUserIndex == undefined) { res.json(false); return; }
    // const keyForUser: userType = users[keyForUserIndex];
    // they must have both added each other
    let friendedEachOther: [boolean, boolean] = [ false, false ];
    for (let i = 0; i < userLink.length; i++) {
        const link = userLink[i];
        if ((link[0] == keyFromUserIndex) && (link[1] == keyForUserIndex)) friendedEachOther[0] = true;
        else if ((link[1] == keyFromUserIndex) && (link[0] == keyForUserIndex)) friendedEachOther[1] = true;
    }
    if (!friendedEachOther[0] || !friendedEachOther[1]) { res.json(false); return; }
    // key must exist
    if ((typeof req.body.totpKey) !== "string") { res.json(false); return; }
    // send key over
    const keyForSessionId: string = usernameToSessionId[keyForUsername];
    pushUser(sessions[keyForSessionId], { type: "submission", data: { from: keyFromUsername, totpKey: req.body.totpKey } });
    // notifyUser(keyForUsername, "received", "BODY");
    res.json(true);
});

app.post("/get_keys_state", async (req: Request, res: Response) => {
    if (!validateSession(req, res)) {
        res.status(401).send("");
        return;
    }
    // requested from user
    const cookies: {[key: string]: string} = getCookies(req);
    const username: string = sessions[cookies[sessionIdCookieName]].username;
    const userIndex: number = userIndexByName[username];
    // const user: userType = users[userIndex];
    
    if ((typeof req.body.map) !== "object") { res.json(false); return; }
    const entries: [ string, [ string, string ]][] = Object.entries(req.body.map);
    if (entries.length == 0) { res.json(false); return; }
    let returnValue: { [key: string]: [ number, number ]} = Object.fromEntries(entries.map(([ friendUsername, hashes ]: [ string, [ string, string ]]) => {
        const friendIndex: number = userIndexByName[friendUsername];
        if (friendIndex == undefined) return [ friendUsername, [ 0, 0 ] ];
        const inverseHashes: [ string, string, number, number ] = (keyHashTable[friendIndex] ?? [])[userIndex] ?? [ "", "" ];
        let status1: number = 0;
        let status2: number = 0;
        let friendStatus1: number = 0;
        let friendStatus2: number = 0;
        if ((hashes[0].length !== 0) && (hashes[0] === inverseHashes[1])) {
            status1 = 2;
            friendStatus2 = 2;
        } else {
            if (hashes[0].length === 0) status1 = 0;
            else status1 = 1;
            if (inverseHashes[1].length === 0) friendStatus2 = 0;
            else friendStatus2 = 1;
        }
        if ((hashes[1].length !== 0) && (hashes[1] === inverseHashes[0])) {
            status2 = 2;
            friendStatus1 = 2;
        } else {
            if (hashes[1].length === 0) status2 = 0;
            else status2 = 1;
            if (inverseHashes[0].length === 0) friendStatus1 = 0;
            else friendStatus1 = 1;
        }
        keyHashTable[userIndex] ??= [];
        keyHashTable[userIndex][friendIndex] = [ ...hashes, status1, status2 ];
        keyHashTable[friendIndex] ??= [];
        keyHashTable[friendIndex][userIndex] = [ inverseHashes[0], inverseHashes[1], friendStatus1, friendStatus2 ];
        if ((inverseHashes[2] != friendStatus1) || (inverseHashes[2] != friendStatus1)) reloadUser(sessions[usernameToSessionId[friendUsername]]);
        return [ friendUsername, [ status1, status2 ] ];
    }));
    res.json(returnValue);
    saveDb();
});

// #region auth functions
app.post("/auth_start", async (req: Request, res: Response) => {
    if (!validateSession(req, res)) {
        res.status(401).send("");
        return;
    }
    // auth from user
    const fromSessionId: string = getCookies(req)[sessionIdCookieName];
    const fromSession: sessionType = sessions[fromSessionId];
    const authFromUsername: string = fromSession.username;
    const authFromUserIndex: number = userIndexByName[authFromUsername];
    // const authFromUser: userType = users[authFromUserIndex];
    // auth to user
    if ((typeof req.body.to) !== "string") { res.json(false); return; }
    const authToUsername: string = req.body.to;
    const authToUserIndex: number = userIndexByName[authToUsername];
    if (authToUserIndex == undefined) { res.json(false); return; }
    // const authToUser: userType = users[authToUserIndex];
    // they must have both added each other
    let friendedEachOther: [boolean, boolean] = [ false, false ];
    for (let i = 0; i < userLink.length; i++) {
        const link = userLink[i];
        if ((link[0] == authFromUserIndex) && (link[1] == authToUserIndex)) friendedEachOther[0] = true;
        else if ((link[1] == authFromUserIndex) && (link[0] == authToUserIndex)) friendedEachOther[1] = true;
    }
    if (!friendedEachOther[0] || !friendedEachOther[1]) { res.json(false); return; }
    // create log
    const time: number = (new Date()).getTime();
    for (let i = 0; i < logs.length; i++) {
        const log = logs[i];
        if (log.from !== authFromUsername) continue;// log isnt for the intended users
        if (log.to !== authToUsername) continue;// log isnt for the intended users
        if (log.expiration <= time) continue;// log has expired
        // found log for those users already opened
        reloadUser(fromSession);
        res.json(false);
        return;
    }
    logs.push({
        id: generateUUID(),
        reason: "",
        state: 0,
        time: time,
        expiration: time + AUTHENTICATION_LENGTH,
        from: authFromUsername,
        fromSession: fromSessionId,
        fromAuthenticated: false,
        fromIp: fromSession.ip,
        fromPlatform: fromSession.platform,
        to: authToUsername,
        toSession: "",
        toAuthenticated: false,
        toIp: "",
        toPlatform: ""
    });
    saveDb();
    res.json(true);
    reloadUser(fromSession);
    reloadUser(sessions[usernameToSessionId[authToUsername]]);// tell "to" user to reload
});
app.post("/auth_from_user", async (req: Request, res: Response) => {
    if (!validateSession(req, res)) {
        res.status(401).send("");
        return;
    }
    // auth from user
    const toSessionId: string = getCookies(req)[sessionIdCookieName];
    const toSession: sessionType = sessions[toSessionId];
    const authToUsername: string = toSession.username;
    const authToUserIndex: number = userIndexByName[authToUsername];
    // const authToUser: userType = users[authToUserIndex];
    // auth to user
    if ((typeof req.body.from) !== "string") { res.json(false); return; }
    const authFromUsername: string = req.body.from;
    const authFromUserIndex: number = userIndexByName[authFromUsername];
    if (authFromUserIndex == undefined) { res.json(false); return; }
    // const authFromUser: userType = users[authFromUserIndex];
    // they must have both added each other
    let friendedEachOther: [boolean, boolean] = [ false, false ];
    for (let i = 0; i < userLink.length; i++) {
        const link = userLink[i];
        if ((link[0] == authFromUserIndex) && (link[1] == authToUserIndex)) friendedEachOther[0] = true;
        else if ((link[1] == authFromUserIndex) && (link[0] == authToUserIndex)) friendedEachOther[1] = true;
    }
    if (!friendedEachOther[0] || !friendedEachOther[1]) { res.json(false); return; }
    // find log
    const time: number = (new Date()).getTime();
    for (let i = 0; i < logs.length; i++) {
        const log = logs[i];
        if (log.from !== authFromUsername) continue;// log isnt for the intended users
        if (log.to !== authToUsername) continue;// log isnt for the intended users
        if (log.expiration <= time) continue;// log has expired
        if (log.state !== 0) break;// log is in the wrong state
        // update log
        logs[i].state = 1;
        logs[i].fromAuthenticated = true;
        logs[i].toSession = toSessionId;
        logs[i].toIp = toSession.ip;
        logs[i].toPlatform = toSession.platform;
        saveDb();
        res.json(true);
        reloadUser(sessions[usernameToSessionId[authFromUsername]]);// tell "from" user to reload
        reloadUser(toSession);
        return;
    }
    // it failed for some reason
    reloadUser(toSession);
    res.json(false);
});
app.post("/auth_to_user", async (req: Request, res: Response) => {
    if (!validateSession(req, res)) {
        res.status(401).send("");
        return;
    }
    // auth from user
    const fromSessionId: string = getCookies(req)[sessionIdCookieName];
    const fromSession: sessionType = sessions[fromSessionId];
    const authFromUsername: string = fromSession.username;
    const authFromUserIndex: number = userIndexByName[authFromUsername];
    // const authFromUser: userType = users[authFromUserIndex];
    // auth to user
    if ((typeof req.body.to) !== "string") { res.json(false); return; }
    const authToUsername: string = req.body.to;
    const authToUserIndex: number = userIndexByName[authToUsername];
    if (authToUserIndex == undefined) { res.json(false); return; }
    // const authToUser: userType = users[authToUserIndex];
    // they must have both added each other
    let friendedEachOther: [boolean, boolean] = [ false, false ];
    for (let i = 0; i < userLink.length; i++) {
        const link = userLink[i];
        if ((link[0] == authFromUserIndex) && (link[1] == authToUserIndex)) friendedEachOther[0] = true;
        else if ((link[1] == authFromUserIndex) && (link[0] == authToUserIndex)) friendedEachOther[1] = true;
    }
    if (!friendedEachOther[0] || !friendedEachOther[1]) { res.json(false); return; }
    // create log
    const time: number = (new Date()).getTime();
    for (let i = 0; i < logs.length; i++) {
        const log = logs[i];
        if (log.from !== authFromUsername) continue;// log isnt for the intended users
        if (log.to !== authToUsername) continue;// log isnt for the intended users
        if (log.expiration <= time) continue;// log has expired
        if (log.state !== 1) break;// log is in the wrong state
        logs[i].state = 2;
        logs[i].toAuthenticated = true;
        logs[i].expiration = (new Date()).getTime() - 1000;
        saveDb();
        res.json(true);
        reloadUser(fromSession);
        reloadUser(sessions[usernameToSessionId[authToUsername]]);// tell "to" user to reload
        return;
    }
    reloadUser(fromSession);
    res.json(false);
});
app.post("/auth_end", async (req: Request, res: Response) => {
    if (!validateSession(req, res)) {
        res.status(401).send("");
        return;
    }
    // auth from user
    const sessionId: string = getCookies(req)[sessionIdCookieName];
    const session: sessionType = sessions[sessionId];
    const username: string = session.username;
    const userIndex: number = userIndexByName[username];
    // const user: userType = users[userIndex];
    // auth to user
    if ((typeof req.body.with) !== "string") { res.json(false); return; }
    const withUsername: string = req.body.with;
    const withUserIndex: number = userIndexByName[withUsername];
    if (withUserIndex == undefined) { res.json(false); return; }
    // const withUser: userType = users[withUserIndex];
    // they must have both added each other
    let friendedEachOther: [boolean, boolean] = [ false, false ];
    for (let i = 0; i < userLink.length; i++) {
        const link = userLink[i];
        if ((link[0] == userIndex) && (link[1] == withUserIndex)) friendedEachOther[0] = true;
        else if ((link[1] == userIndex) && (link[0] == withUserIndex)) friendedEachOther[1] = true;
    }
    if (!friendedEachOther[0] || !friendedEachOther[1]) { res.json(false); return; }
    // create log
    const time: number = (new Date()).getTime();
    for (let i = 0; i < logs.length; i++) {
        const log = logs[i];
        if ((log.expiration <= time) || (log.state !== 2) || !(
            ((log.from === username) && (log.to === withUsername))
            || ((log.from === withUsername) && (log.to === username))
        )) continue;
        logs[i].expiration = time;
        saveDb();
        res.json(true);
        reloadUser(session);
        reloadUser(sessions[usernameToSessionId[withUsername]]);// tell "with" user to reload
        return;
    }
    reloadUser(session);
    res.json(false);
});
// #endregion auth functions

app.post("/ping", async (req: Request, res: Response) => {
    if (!validateSession(req, res)) {
        console.log("pong failed to validate");
        res.status(401).send("");
        return;
    }
    res.json(true);
});
app.post("/notif/subscribe", (async (req: Request, res: Response) => {
    if (!validateSession(req, res)) {
        res.status(401).send("<html><head><title>Unauthorized</title></head><body>Unauthorized</body></html>");
        return;
    }
    const { endpoint, keys } = req.body;
    // console.log(session.username + " subscribed.");
    if (
        ((typeof endpoint) !== "string")
        || ((typeof keys) !== "object")
        || ((typeof keys.auth) !== "string")
        || ((typeof keys.p256dh) !== "string")
    ) {
        res.status(401).send("<html><head><title>Unauthorized</title></head><body>Unauthorized</body></html>");
        return;
    }
    const cookies: {[key: string]: string} = getCookies(req);
    const sessionId = cookies[sessionIdCookieName];
    sessions[sessionId].endpoint = endpoint;
    sessions[sessionId].auth = keys.auth;
    sessions[sessionId].p256dh = keys.p256dh;
    sessionEntries = Object.entries(sessions);
    saveDb();
    res.clearCookie("isSubbed");
    res.json(true);
}).bind(this));

app.get("*", (req: Request, res: Response) => {
    res.redirect("/index.html");
});
let pingTimes: {[id: string]: number} = {};
async function ping() {
    const time: number = (new Date()).getTime();
    let changed: boolean = false;
    for (let i = 0; i < sessionEntries.length; i++) {
        const [ id, session ]: [ string, sessionType ] = sessionEntries[i];
        if (session.active) {
            if ((time - pingTimes[id]) > 3000) {
                changed = true;
                session.active = false;
                const username: string = session.username;
                const userIndex: number = userIndexByName[username];
                for (let i = 0; i < userLink.length; i++) {
                    const link: [number, number] = userLink[i];
                    if (link[1] == userIndex) {
                        const friendsSessionId: string = usernameToSessionId[users[link[0]].username];
                        if (friendsSessionId == undefined) continue;// user is not logged in
                        const friendsSession: sessionType = sessions[friendsSessionId];
                        if (!friendsSession.active) continue;// user is not online
                        reloadUser(friendsSession);
                    }
                }
            }
        }
    }
    if (changed) {
        sessionEntries = Object.entries(sessions);
        saveDb();
    }
}
server.listen(port, function() {
    console.clear();
    console.log("Server started.");
    console.log("Https server on https://deeptrust.me.");
    console.log("Http server on http://localhost:" + port + ".");
    setInterval(ping, 1500);
});
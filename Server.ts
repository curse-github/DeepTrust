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
    type: "AUTH",
    from: number,
    to: number,
    time: number,
    data: {
        reason: string,
        state: number,
        expiration: number,
        fromIp: sessionType["ip"],
        toIp: sessionType["ip"]
    }
}|{
    id: string,
    type: "SC",
    from: number,
    to: number,
    time: number,
    data: {
        ES: string,
        seed_hash: string
    }
}|{
    id: string,
    type: "MSG",
    from: number,
    to: number,
    time: number,
    data: {
        state: number,
        EM: string,
        HP: string,
        P: string
    }
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
let test: boolean = false;
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
// seedHashTable
var seedHashTable: [ string, string, number, number ][][] = db.seedHashTable || [];
// logs
var logs: logType[] = db.logs || [];
// helper to save db file
function saveDb() {
    writeFileSync(dbFilePath, JSON.stringify({ sessions, users, logs, userLink, seedHashTable }, undefined, "    "));
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
    // return await pushUser(session, { type: "reload" });
    reloadStatuses[session.username] = true;
    return true;
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
serverStaticSimple("change.js");
serverStaticSimple("manifest.json");
serverStaticSimple("favicon.ico");
serverStaticSimple("favicon.png");
serverStaticSimple("deeptrust-logo.png");
serverStaticSimple("deeptrust-transition-wide.png");
serverStaticSimple("ShaTotpAesEcc.js");
serverStaticSimple("index.html");
serverStaticSimple("investorBrief.pdf");
serveStaticAuthedSimple("pwa.html", true);
serverStaticSimple("pwa.css");
serveStaticAuthedSimple("pwa.js", false);
serveStaticAuthedSimple("messages.js", false);
serveStaticAuthedSimple("notifications.js", false);
serveStaticAuthedSimple("service-worker.js", false);
// #endregion express setup

// #region login, create, and change
app.get("/login.html", async (req: Request, res: Response) => {
    // clear cookie if there is one, and clear their session data if session id was valid
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
    if (query.pass_hash == "E3B0C44298FC1C149AFBF4C8996FB92427AE41E4649B934CA495991B7852B855") { res.redirect("/login.html"); return; }// also cannot be sha256 of empty string
    const email: string = query.email as string;
    const pass_hash: string = query.pass_hash.toLowerCase() as string;
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
    // clear cookie if there is one, and clear their session data if session id was valid
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
    if (query.pass_hash! === "E3B0C44298FC1C149AFBF4C8996FB92427AE41E4649B934CA495991B7852B855") { res.redirect("/create.html"); return; }// also cannot be sha256 of empty string
    if (query.c_pass_hash!.length === 0) { res.redirect("/create.html"); return; }
    if (query.c_pass_hash! === "E3B0C44298FC1C149AFBF4C8996FB92427AE41E4649B934CA495991B7852B855") { res.redirect("/create.html"); return; }// also cannot be sha256 of empty string
    if (query.pass_hash! !== query.c_pass_hash!) { res.redirect("/create.html"); return; }// passwords must match
    if (parseInt(query.pass_len) < 4) { res.redirect("/create.html"); return; }// password must be at least 8 characters
    const username: string = query.username! as string;
    const email: string = (query.email! as string).toLowerCase();
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
app.get("/change.html", async (req: Request, res: Response) => {
    // clear cookie if there is one, and clear their session data if session id was valid
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
    res.sendFile(__dirname + "\\webpage\\change.html", (err: Error) => {
        if (err == undefined) return;
        console.log("Couldnt find /change.html file.", "\"" + err.name + "\": " + err.message);
        res.status(500).type("text").send("error 500, internal error");
    });
});
app.get("/tryChange", async (req: Request, res: Response) => {
    const query: { [key: string]: (string|string[]|undefined) } = req.query as { [key: string]: (string|string[]|undefined) };
    if ((typeof query.email) !== "string") { res.redirect("/change.html"); return; }// must be string
    if ((typeof query.o_pass_hash) !== "string") { res.redirect("/change.html"); return; }// must be string
    if ((typeof query.pass_hash) !== "string") { res.redirect("/change.html"); return; }// must be string
    if ((typeof query.c_pass_hash) !== "string") { res.redirect("/change.html"); return; }// must be string
    if ((typeof query.pass_len) !== "string") { res.redirect("/change.html"); return; }// must be string
    if (query.pass_len! !== parseInt(query.pass_len! as string).toString()) { res.redirect("/change.html"); return; }
    if (query.email!.length === 0) { res.redirect("/change.html"); return; }// cannot be empty string
    if (userIndexByEmail[query.email as string] === undefined) { res.redirect("/change.html"); return; }// email is invalid
    if (query.o_pass_hash!.length === 0) { res.redirect("/change.html"); return; }// cannot be empty string
    if (query.o_pass_hash! === "E3B0C44298FC1C149AFBF4C8996FB92427AE41E4649B934CA495991B7852B855") { res.redirect("/create.html"); return; }// also cannot be sha256 of empty string
    if (query.pass_hash!.length === 0) { res.redirect("/change.html"); return; }// cannot be empty string
    if (query.pass_hash! === "E3B0C44298FC1C149AFBF4C8996FB92427AE41E4649B934CA495991B7852B855") { res.redirect("/create.html"); return; }// also cannot be sha256 of empty string
    if (query.c_pass_hash!.length === 0) { res.redirect("/change.html"); return; }
    if (query.c_pass_hash! === "E3B0C44298FC1C149AFBF4C8996FB92427AE41E4649B934CA495991B7852B855") { res.redirect("/create.html"); return; }// also cannot be sha256 of empty string
    if (query.pass_hash! !== query.c_pass_hash!) { res.redirect("/change.html"); return; }// passwords must match
    if (parseInt(query.pass_len) < 4) { res.redirect("/change.html"); return; }// password must be at least 8 characters
    const email: string = query.email! as string;
    const index: number = userIndexByEmail[email];
    const o_pass_hash: string = query.o_pass_hash! as string;
    if (users[index].pass_hash != o_pass_hash.toLowerCase()) { res.redirect("/change.html"); return; }
    // details are valid, change users password
    const pass_hash: string = (query.pass_hash! as string).toLowerCase();
    users[index].pass_hash = pass_hash;
    saveDb();
    res.redirect("/login.html");
});
// #endregion login, create, and change

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
    // if (req.body.email.toLowerCase() == user.email) { res.json(false); return; }

    const addedUserIndex = userIndexByEmail[req.body.email.toLowerCase()];
    if (addedUserIndex == undefined) { res.json(false); return; }
    const addedUser: userType = users[addedUserIndex];
    // push the users username to the users friends list
    let addReciprocated: boolean = false;
    for (let i = 0; i < userLink.length; i++) {
        const link: [number, number] = userLink[i];
        if ((link[0] == userIndex) && (link[1] == addedUserIndex)) { res.json(false); return; }// link already exists
        if ((link[1] == userIndex) && (link[0] == addedUserIndex)) addReciprocated = true;// they already had you added
    }
    userLink.push([ userIndex, addedUserIndex ]);
    saveDb();
    reloadUser(session);
    if (!addReciprocated) notifyUser(sessions[usernameToSessionId[addedUser.username]], user.username + " added you!", "Add them back at " + user.email);
    else reloadUser(sessions[usernameToSessionId[addedUser.username]]);
    res.json(true);
});
app.post("/remove_friend", async (req: Request, res: Response) => {
    if (!validateSession(req, res)) {
        res.status(401).send("");
        return;
    }
    if ((typeof req.body.username) !== "string") { res.json(false); return; }
    const cookies: {[key: string]: string} = getCookies(req);
    const session: sessionType = sessions[cookies[sessionIdCookieName]];
    const userIndex: number = userIndexByName[session.username];
    // const user: userType = users[userIndex];
    // if (req.body.email.toLowerCase() == user.email) { res.json(false); return; }

    const addedUserIndex = userIndexByName[req.body.username];
    if (addedUserIndex == undefined) { res.json(false); return; }
    // const addedUser: userType = users[addedUserIndex];
    // push the users username to the users friends list
    let removed: boolean = false;
    for (let i = 0; i < userLink.length; i++) {
        const link: [number, number] = userLink[i];
        if ((link[0] == userIndex) && (link[1] == addedUserIndex)) {
            userLink = userLink.filter((_, j: number) => (j != i));
            removed = true;
            break;
        }
    }
    if (!removed) { res.json(false); return; }
    saveDb();
    reloadUser(session);
    reloadUser(sessions[usernameToSessionId[req.body.username]]);
    res.json(true);
});

// #region seed transfer
const updates: {[user: string]: { type: string, data: { [key: string]: any } }[] } = {};
const reloadStatuses: {[user: string]: boolean} = {};
app.post("/seed_transfer_one", async (req: Request, res: Response) => {
    if (!validateSession(req, res)) {
        res.status(401).send("");
        return;
    }
    // requested for user
    const cookies: {[key: string]: string} = getCookies(req);
    const seedForUsername: string = sessions[cookies[sessionIdCookieName]].username;
    const seedForUserIndex: number = userIndexByName[seedForUsername];
    // requested from user
    if ((typeof req.body.from) !== "string") { res.json(false); return; }
    const seedFromUsername: string = req.body.from;
    const seedFromUserIndex: number = userIndexByName[seedFromUsername];
    if (seedFromUserIndex == undefined) { res.json(false); return; }
    // they must have both added each other
    let friendedEachOther: [boolean, boolean] = [ false, false ];
    for (let i = 0; i < userLink.length; i++) {
        const link = userLink[i];
        if ((link[0] == seedFromUserIndex) && (link[1] == seedForUserIndex)) friendedEachOther[0] = true;
        if ((link[1] == seedFromUserIndex) && (link[0] == seedForUserIndex)) friendedEachOther[1] = true;
    }
    if (!friendedEachOther[0] || !friendedEachOther[1]) { res.json(false); return; }
    // public seed must exist and have correct length
    if ((typeof req.body.public) !== "string") { res.json(false); return; }
    if (req.body.public.length !== 194) { res.json(false); return; }
    // request seed
    updates[seedFromUsername] ??= [];
    updates[seedFromUsername].push({ type: "seed_one", data: { for: seedForUsername, public: req.body.public } });
    res.json(true);
});
app.post("/seed_transfer_two", async (req: Request, res: Response) => {
    if (!validateSession(req, res)) {
        res.status(401).send("");
        return;
    }
    // requested from user
    const cookies: {[seed: string]: string} = getCookies(req);
    const seedFromUsername: string = sessions[cookies[sessionIdCookieName]].username;
    const seedFromUserIndex: number = userIndexByName[seedFromUsername];
    // requested for user
    if ((typeof req.body.for) !== "string") { res.json(false); return; }
    const seedForUsername: string = req.body.for;
    const seedForUserIndex: number = userIndexByName[seedForUsername];
    if (seedForUserIndex == undefined) { res.json(false); return; }
    // they must have both added each other
    let friendedEachOther: [boolean, boolean] = [ false, false ];
    for (let i = 0; i < userLink.length; i++) {
        const link = userLink[i];
        if ((link[0] == seedFromUserIndex) && (link[1] == seedForUserIndex)) friendedEachOther[0] = true;
        if ((link[1] == seedFromUserIndex) && (link[0] == seedForUserIndex)) friendedEachOther[1] = true;
    }
    if (!friendedEachOther[0] || !friendedEachOther[1]) { res.json(false); return; }
    // totp seed must exist
    if ((typeof req.body.totpSeed) !== "string") { res.json(false); return; }
    // public seed must exist and have correct length
    if ((typeof req.body.public) !== "string") { res.json(false); return; }
    if (req.body.public.length !== 194) { res.json(false); return; }
    // send seed
    updates[seedForUsername] ??= [];
    updates[seedForUsername].push({ type: "seed_two", data: { from: seedFromUsername, totpSeed: req.body.totpSeed, public: req.body.public } });
    res.json(true);
});
app.post("/seed_transfer_three", async (req: Request, res: Response) => {
    if (!validateSession(req, res)) {
        res.status(401).send("");
        return;
    }
    // requested from user
    const cookies: {[seed: string]: string} = getCookies(req);
    const seedFromUsername: string = sessions[cookies[sessionIdCookieName]].username;
    const seedFromUserIndex: number = userIndexByName[seedFromUsername];
    // requested for user
    if ((typeof req.body.for) !== "string") { res.json(false); return; }
    const seedForUsername: string = req.body.for;
    const seedForUserIndex: number = userIndexByName[seedForUsername];
    if (seedForUserIndex == undefined) { res.json(false); return; }
    // they must have both added each other
    let friendedEachOther: [boolean, boolean] = [ false, false ];
    for (let i = 0; i < userLink.length; i++) {
        const link = userLink[i];
        if ((link[0] == seedFromUserIndex) && (link[1] == seedForUserIndex)) friendedEachOther[0] = true;
        if ((link[1] == seedFromUserIndex) && (link[0] == seedForUserIndex)) friendedEachOther[1] = true;
    }
    if (!friendedEachOther[0] || !friendedEachOther[1]) { res.json(false); return; }
    // totp seed must exist
    if ((typeof req.body.totpSeed) !== "string") { res.json(false); return; }
    // public seed must exist and have correct length
    if ((typeof req.body.public) !== "string") { res.json(false); return; }
    if (req.body.public.length !== 194) { res.json(false); return; }
    // send seed again
    updates[seedForUsername] ??= [];
    updates[seedForUsername].push({ type: "seed_three", data: { from: seedFromUsername, totpSeed: req.body.totpSeed, public: req.body.public } });
    res.json(true);
});
app.get("/get_updates", async (req: Request, res: Response) => {
    if (!validateSession(req, res)) {
        res.status(401).send("");
        return;
    }
    // requested from user
    const cookies: {[seed: string]: string} = getCookies(req);
    const username: string = sessions[cookies[sessionIdCookieName]].username;
    res.json({ reload: (reloadStatuses[username] ?? true), updates: (updates[username] ?? []) });
    updates[username] = [];
    reloadStatuses[username] = false;
});
// #endregion seed transfer

// #region messages
app.get("/messages/*", async (req: Request, res: Response) => {
    if (!validateSession(req, res)) {
        res.status(401).send("");
        return;
    }
    const cookies: {[key: string]: string} = getCookies(req);
    const username: string = sessions[cookies[sessionIdCookieName]].username;
    const userIndex: number = userIndexByName[username];
    const otherUsername: string = req.params[0];
    const otherUserIndex: number = userIndexByName[otherUsername];
    // const user: userType = users[userIndex];
    let areFriends: number = 0;
    userLink.forEach((link: [number, number]) => {
        if ((link[0] === userIndex) && (link[1] === otherUserIndex))
            areFriends |= 1;
        if ((link[1] === userIndex) && (link[0] === otherUserIndex))
            areFriends |= 2;
    });
    if (areFriends !== 3) {
        res.status(401).send("");
        return;
    }
    res.sendFile(__dirname + "\\webpage\\messages.html", (err: Error) => {
        if (err == undefined) return;
        console.log("Couldnt find /messages.html file.", "\"" + err.name + "\": " + err.message);
        res.status(500).type("text").send("error 500, internal error");
    });
});
app.post("/send_message_one", async (req: Request, res: Response) => {
    if (!validateSession(req, res)) {
        res.status(401).json(false);
        return;
    }
    const cookies: {[key: string]: string} = getCookies(req);
    const username: string = sessions[cookies[sessionIdCookieName]].username;
    const userIndex: number = userIndexByName[username];
    // validate data
    if (typeof req.body.to !== "string") { res.status(401).json(false); return; }
    const otherUsername: string = req.body.to;
    const otherUserIndex: number = userIndexByName[otherUsername];
    let areFriends: number = 0;
    userLink.forEach((link: [number, number]) => {
        if ((link[0] === userIndex) && (link[1] === otherUserIndex))
            areFriends |= 1;
        if ((link[1] === userIndex) && (link[0] === otherUserIndex))
            areFriends |= 2;
    });
    if (areFriends !== 3) { res.status(401).json(false); return; }
    if (typeof req.body.EM !== "string") { res.status(401).json(false); return; }
    const time: number = (new Date()).getTime();
    const msgId: string = generateUUID();
    // create log
    logs.push({
        id: msgId,
        type: "MSG",
        from: userIndex,
        to: otherUserIndex,
        time,
        data: {
            state: 0,
            EM: req.body.EM,
            HP: "",
            P: ""
        }
    });
    saveDb();
    updates[otherUsername] ??= [];
    updates[otherUsername].push({ type: "message_one", data: { msgId, from: username, EM: req.body.EM } });
    res.json(true);
});
app.post("/send_message_two", async (req: Request, res: Response) => {
    if (!validateSession(req, res)) {
        res.status(401).json(false);
        return;
    }
    const cookies: {[key: string]: string} = getCookies(req);
    const username: string = sessions[cookies[sessionIdCookieName]].username;
    const userIndex: number = userIndexByName[username];
    // validate data
    if (typeof req.body.from !== "string") { res.status(401).json(false); return; }
    const otherUsername: string = req.body.from;
    const otherUserIndex: number = userIndexByName[otherUsername];
    let areFriends: number = 0;
    userLink.forEach((link: [number, number]) => {
        if ((link[0] === userIndex) && (link[1] === otherUserIndex))
            areFriends |= 1;
        if ((link[1] === userIndex) && (link[0] === otherUserIndex))
            areFriends |= 2;
    });
    if (areFriends !== 3) { res.status(401).json(false); return; }
    if (typeof req.body.HEM !== "string") { res.status(401).json(false); return; }
    if (typeof req.body.EHP !== "string") { res.status(401).json(false); return; }
    if (typeof req.body.msgId !== "string") { res.status(401).json(false); return; }
    // update log
    for (let i = 0; i < logs.length; i++) {
        const log = logs[i];
        if (log.type !== "MSG") continue;
        if (log.id !== req.body.msgId) continue;
        if (log.data.state !== 0) break;// log is in the wrong state
        // update log
        (logs[i].data as { state: number, EM: string, HP: string, P: string }).state = 1;
        saveDb();
        updates[otherUsername] ??= [];
        updates[otherUsername].push({ type: "message_two", data: { msgId: req.body.msgId, to: username, HEM: req.body.HEM, EHP: req.body.EHP } });
        res.json(true);
        return;
    }
    // finding log failed
    res.status(401).json(false);
});
app.post("/send_message_three", async (req: Request, res: Response) => {
    if (!validateSession(req, res)) {
        res.status(401).json(false);
        return;
    }
    const cookies: {[key: string]: string} = getCookies(req);
    const username: string = sessions[cookies[sessionIdCookieName]].username;
    const userIndex: number = userIndexByName[username];
    // validate data
    if (typeof req.body.to !== "string") { res.status(401).json(false); return; }
    const otherUsername: string = req.body.to;
    const otherUserIndex: number = userIndexByName[otherUsername];
    let areFriends: number = 0;
    userLink.forEach((link: [number, number]) => {
        if ((link[0] === userIndex) && (link[1] === otherUserIndex))
            areFriends |= 1;
        if ((link[1] === userIndex) && (link[0] === otherUserIndex))
            areFriends |= 2;
    });
    if (areFriends !== 3) { res.status(401).json(false); return; }
    if (typeof req.body.HP !== "string") { res.status(401).json(false); return; }
    if (typeof req.body.msgId !== "string") { res.status(401).json(false); return; }
    // update log
    for (let i = 0; i < logs.length; i++) {
        const log = logs[i];
        if (log.type !== "MSG") continue;
        if (log.id !== req.body.msgId) continue;
        if (log.data.state !== 1) break;// log is in the wrong state
        (logs[i].data as { state: number, EM: string, HP: string, P: string }).state = 2;
        (logs[i].data as { state: number, EM: string, HP: string, P: string }).HP = req.body.HP;
        saveDb();
        updates[otherUsername] ??= [];
        updates[otherUsername].push({ type: "message_three", data: { msgId: req.body.msgId, from: username, EM: (logs[i].data as { state: number, EM: string, HP: string, P: string }).EM, HP: req.body.HP } });
        res.json(true);
        return;
    }
    // finding log failed
    res.status(401).json(false);
});
app.post("/send_message_four", async (req: Request, res: Response) => {
    if (!validateSession(req, res)) {
        res.status(401).json(false);
        return;
    }
    const cookies: {[key: string]: string} = getCookies(req);
    const session: sessionType = sessions[cookies[sessionIdCookieName]];
    const username: string = session.username;
    const userIndex: number = userIndexByName[username];
    // validate data
    if (typeof req.body.from !== "string") { res.status(401).json(false); return; }
    const otherUsername: string = req.body.from;
    const otherUserIndex: number = userIndexByName[otherUsername];
    // const user: userType = users[userIndex];
    let areFriends: number = 0;
    userLink.forEach((link: [number, number]) => {
        if ((link[0] === userIndex) && (link[1] === otherUserIndex))
            areFriends |= 1;
        if ((link[1] === userIndex) && (link[0] === otherUserIndex))
            areFriends |= 2;
    });
    if (areFriends !== 3) { res.status(401).json(false); return; }
    if (typeof req.body.P !== "string") { res.status(401).json(false); return; }
    if (typeof req.body.msgId !== "string") { res.status(401).json(false); return; }
    // update log
    for (let i = 0; i < logs.length; i++) {
        const log = logs[i];
        if (log.type !== "MSG") continue;
        if (log.id !== req.body.msgId) continue;
        if (log.data.state !== 2) break;// log is in the wrong state
        (logs[i].data as { state: number, EM: string, HP: string, P: string }).state = 3;
        (logs[i].data as { state: number, EM: string, HP: string, P: string }).P = req.body.P;
        saveDb();
        reloadUser(session);
        reloadUser(sessions[usernameToSessionId[otherUsername]]);// tell "from" user to reload
        res.json(true);
        return;
    }
    // finding log failed
    res.status(401).json(false);
});
// #endregion messages

app.get("/getUserData", async (req: Request, res: Response) => {
    if (!validateSession(req, res)) {
        res.status(401).send("");
        return;
    }
    const cookies: {[key: string]: string} = getCookies(req);
    const username: string = sessions[cookies[sessionIdCookieName]].username;
    const userIndex: number = userIndexByName[username];
    // const user: userType = users[userIndex];
    let relevantLogs: any[] = [];
    for (let i = 0; i < logs.length; i++) {
        const log = logs[i];
        if ((log.from === userIndex) || (log.to === userIndex))
            relevantLogs.push({ ...log, from: users[log.from].username, to: users[log.to].username });
    }
    let friends_list_ids: number[] = [];
    userLink.forEach((link: [number, number]) => {
        if (link[0] === userIndex)
            friends_list_ids[link[1]] = (friends_list_ids[link[1]] ?? 0) | 1;
        if (link[1] === userIndex)
            friends_list_ids[link[0]] = (friends_list_ids[link[0]] ?? 0) | 2;
    });
    let friends_list: string[] = [];
    let online_list: (boolean|undefined)[] = [];
    friends_list_ids.forEach((state: number, friendId: number) => {
        if (state === undefined) return;
        friends_list.push(users[friendId].username);
        if (state === 3) {
            const id = usernameToSessionId[users[friendId].username];
            if (id == undefined) online_list.push(false);
            else online_list.push(sessions[id].active);
        } else online_list.push(undefined);
    });
    res.json({ name: username, index: userIndex, friends_list, online_list, logs: relevantLogs, online: true });
});
app.post("/get_seeds_state", async (req: Request, res: Response) => {
    if (!validateSession(req, res)) {
        res.status(401).send("");
        return;
    }
    // requested from user
    const cookies: {[key: string]: string} = getCookies(req);
    const username: string = sessions[cookies[sessionIdCookieName]].username;
    const userIndex: number = userIndexByName[username];
    
    if ((typeof req.body.map) !== "object") { res.json(false); return; }
    const entries: [ string, [ string, string ]][] = Object.entries(req.body.map);
    if (entries.length == 0) { res.json(false); return; }
    let returnValue: { [key: string]: [ number, number ]} = Object.fromEntries(entries.map(([ friendUsername, hashes ]: [ string, [ string, string ]]) => {
        const friendIndex: number = userIndexByName[friendUsername];
        if (friendIndex == undefined) return [ friendUsername, [ 0, 0 ] ];

        let friendedEachOther: [boolean, boolean] = [ false, false ];
        for (let i = 0; i < userLink.length; i++) {
            const link = userLink[i];
            if ((link[0] == userIndex) && (link[1] == friendIndex)) friendedEachOther[0] = true;
            if ((link[1] == userIndex) && (link[0] == friendIndex)) friendedEachOther[1] = true;
        }
        
        var inverseHashes: [ string, string, number, number ] = (seedHashTable[friendIndex] ?? [])[userIndex] ?? [ "", "" ];
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
        seedHashTable[userIndex] ??= [];
        seedHashTable[friendIndex] ??= [];
        seedHashTable[userIndex][friendIndex] = [ ...hashes, status1, status2 ];
        inverseHashes = (seedHashTable[friendIndex] ?? [])[userIndex] ?? [ "", "" ];
        seedHashTable[friendIndex][userIndex] = [ inverseHashes[0], inverseHashes[1], friendStatus1, friendStatus2 ];
        if ((inverseHashes[2] != friendStatus1) || (inverseHashes[2] != friendStatus1)) reloadUser(sessions[usernameToSessionId[friendUsername]]);
        if ((friendedEachOther[0] && friendedEachOther[1]) === true)
            return [ friendUsername, [ status1, status2 ] ];
        else
            return [ friendUsername, [ friendedEachOther[0]! ? 0 : -1, friendedEachOther[1]! ? 0 : -1 ] ];
    }));
    res.json(returnValue);
    saveDb();
});

/*
let lastLog: string = "";
app.post("/log", async (req: Request, res: Response) => {
    if (!validateSession(req, res)) {
        res.status(401).send("");
        console.log("ERROR");
        return;
    }
    // requested from user
    const cookies: {[key: string]: string} = getCookies(req);
    const username: string = sessions[cookies[sessionIdCookieName]].username;
    if (lastLog !== username) { lastLog = username; console.log(username + ":"); }
    console.log("   ", ...req.body.message);
    res.json({});
    saveDb();
});*/

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
        if (log.type !== "AUTH") continue;// log isnt for the intended users
        if (log.data.expiration <= time) continue;// log has expired
        if (log.from !== authFromUserIndex) continue;// log isnt for the intended users
        if (log.to !== authToUserIndex) continue;// log isnt for the intended users
        // found log for those users already opened
        reloadUser(fromSession);
        res.json(false);
        return;
    }
    logs.push({
        id: generateUUID(),
        type: "AUTH",
        from: authFromUserIndex,
        to: authToUserIndex,
        time,
        data: {
            reason: "",
            state: 0,
            expiration: time + AUTHENTICATION_LENGTH,
            fromIp: fromSession.ip,
            toIp: ""
        }
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
        if (log.type !== "AUTH") continue;// log isnt for the intended users
        if (log.data.expiration <= time) continue;// log has expired
        if (log.from !== authFromUserIndex) continue;// log isnt for the intended users
        if (log.to !== authToUserIndex) continue;// log isnt for the intended users
        if (log.data.state !== 0) break;// log is in the wrong state
        // update log
        (logs[i].data as { reason: string, state: number, expiration: number, fromIp: string, toIp: string }).state = 1;
        (logs[i].data as { reason: string, state: number, expiration: number, fromIp: string, toIp: string }).toIp = toSession.ip;
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
    // modify log
    const time: number = (new Date()).getTime();
    for (let i = 0; i < logs.length; i++) {
        const log = logs[i];
        if (log.type !== "AUTH") continue;// log isnt for the intended users
        if (log.data.expiration <= time) continue;// log has expired
        if (log.from !== authFromUserIndex) continue;// log isnt for the intended users
        if (log.to !== authToUserIndex) continue;// log isnt for the intended users
        if (log.data.state !== 1) break;// log is in the wrong state
        (logs[i].data as { reason: string, state: number, expiration: number, fromIp: string, toIp: string }).state = 2;
        (logs[i].data as { reason: string, state: number, expiration: number, fromIp: string, toIp: string }).expiration = (new Date()).getTime() - 1000;
        saveDb();
        res.json(true);
        reloadUser(fromSession);
        reloadUser(sessions[usernameToSessionId[authToUsername]]);// tell "to" user to reload
        return;
    }
    reloadUser(fromSession);
    res.json(false);
});
// #endregion auth functions
app.post("/log_seed_change", async (req: Request, res: Response) => {
    if (!validateSession(req, res)) {
        res.status(401).send("");
        return;
    }
    if ((typeof req.body.ES) !== "string") { res.json(false); return; }
    if ((typeof req.body.seed_hash) !== "string") { res.json(false); return; }
    // requested from user
    const cookies: {[seed: string]: string} = getCookies(req);
    const username: string = sessions[cookies[sessionIdCookieName]].username;
    const userIndex: number = userIndexByName[username];
    const time: number = (new Date()).getTime();
    logs.push({
        id: generateUUID(),
        type: "SC",
        from: userIndex,
        to: userIndex,
        time,
        data: {
            ES: req.body.ES,
            seed_hash: req.body.seed_hash
        }
    });
    saveDb();
    res.json(true);
    updates[username] = [];
    reloadStatuses[username] = false;
});

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
import * as express from "express";
import * as http from "http";
import { Application, Request, Response } from "express";
import { getCookies, generateUUID, sha256, readConfig, config } from "./Lib";
import { readFileSync, writeFileSync } from "fs";
import * as webpush from "web-push";

// #region types
type sessionMap = {[id: string]: sessionType};
type sessionType = {
    username: string,
    expiration: number,
    ip: string,
    platform: string
};
type notificationSubType = {
    endpoint: "webpush",
    keys: {
        auth: string,
        p256dh: string
    }
};
type userType = {
    email: string,
    username: string,
    pass_hash: string,
    notif_sub: notificationSubType
};
type logType = {
    reason: string,
    time: number,
    // from
    from: userType["username"],
    fromSession: keyof sessionMap,
    fromAuthenticated: boolean,
    fromIp: sessionType["ip"],
    fromPlatform: sessionType["platform"],
    // to 
    to: userType["username"],
    toSession: keyof sessionMap,
    toAuthenticated: boolean,
    toIp: sessionType["ip"],
    toPlatform: sessionType["platform"]
};
// #endregion types

// #region reading database and config
var dbFilePath: string = __dirname + "/database.json";
const db: any = JSON.parse(readFileSync(dbFilePath).toString() || "{}");
// sessions
var sessions: sessionMap = db.sessions || {};
let sessionIdToUsername: {[id: string]: string} = {};
let usernameToSessionId: {[id: string]: string} = {};
const sessionIds: string[] = Object.keys(sessions);
for (let i = 0; i < sessionIds.length; i++) {
    const id: string = sessionIds[i];
    const username: string = sessions[id].username;
    sessionIdToUsername[id] = username;
    usernameToSessionId[username] = id;
}
function validateSession(req: Request, res: Response): boolean {
    const cookies: {[key: string]: string} = getCookies(req);
    if (cookies[sessionIdCookieName] == undefined) return false;
    if (sessions[cookies[sessionIdCookieName]] != undefined) return true;
    res.clearCookie(sessionIdCookieName);
    // console.log("invalid token, ", cookies[sessionIdCookieName]);
    return false;
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
// logs
var logs: logType[] = db.logs || [];
// helper to save db file
function saveDb() {
    writeFileSync(dbFilePath, JSON.stringify({ sessions, users, logs }, undefined, "    "));
}

readConfig();
const port: number = Number(config.ports.main);
const SESSION_LENGTH: number = Number(config.session.length);
const sessionIdCookieName: string = config.session.cookie_name;
// #endregion reading database

// setup webpush stuff
const publicKey: string = readFileSync("public-key.txt").toString();
const privateKey: string = readFileSync("private-key.txt").toString();
webpush.setVapidDetails("mailto:curse@simpsoncentral.com", publicKey, privateKey);
function notifyUser(username: string, header: string, body: string, important: boolean) {
    const index: number|undefined = userIndexByName[username.toLowerCase()];
    if (index == undefined) { console.log("User not found."); return; }
    const user: userType = users[index];
    if (user == undefined) { console.log("User not found."); return; }
    if (user.notif_sub == undefined) { console.log("User has not subbed to notifications."); return; }
    webpush.sendNotification(user.notif_sub, JSON.stringify({ header, body, important }))
        .then((res: any) => {
            console.log(res);
        })
        .catch((error: any) => {
            console.log("Notification push to user \"" + username + "\" failed.", error);
        });
}

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
app.get("/login.html", async (req: Request, res: Response) => {
    res.clearCookie(sessionIdCookieName);
    const cookies: {[key: string]: string} = getCookies(req);
    const id: string|undefined = cookies[sessionIdCookieName];
    if ((id != undefined) && (sessions[id] != undefined)) {
        delete usernameToSessionId[sessionIdToUsername[id]];
        delete sessionIdToUsername[id];
        delete sessions[id];
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
        delete sessionIdToUsername[oldSessionId];
        delete sessions[oldSessionId];
    }
    // create a session
    const sessionId = generateUUID();
    sessionIdToUsername[sessionId] = user.username;
    usernameToSessionId[user.username] = sessionId;
    sessions[sessionId] = {
        username: user.username,
        expiration: (new Date()).getTime() + SESSION_LENGTH,
        ip: (req.headers["x-forwarded-for"] || req.socket.remoteAddress) as string,
        platform: (req.headers["sec-ch-ua-platform"] as string|undefined) || "none"
    };
    saveDb();
    res.cookie(sessionIdCookieName, sessionId, { maxAge: SESSION_LENGTH, httpOnly: false });
    res.redirect("/index.html");
});
serverStaticSimple("login.js");
serverStaticSimple("main.css");
serverStaticSimple("login.css");
serverStaticSimple("hashLib.js");
serverStaticSimple("manifest.json");
serverStaticSimple("favicon.ico");
serverStaticSimple("favicon.png");
serveStaticAuthedSimple("index.html", true);
serveStaticAuthedSimple("index.css", false);
serveStaticAuthedSimple("index.js", false);
serveStaticAuthedSimple("notifications.js", false);
serveStaticAuthedSimple("service-worker.js", false);

app.get("*", (req: Request, res: Response) => {
    res.redirect("/index.html");
});
server.listen(port, function() {
    // console.clear();
    console.log("Server started.");
    console.log("Https server on http://localhost:" + port + ".");
});
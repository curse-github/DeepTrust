import * as express from "express";
import * as http from "http";
import { Application, Request, Response } from "express";
import { generateUUID, sha256, readConfig, config } from "./Lib";
const serveStatic: ((app: Application, path: string, filePath: string)=> void) = (app: Application, path: string, filePath: string) => {
    app.get(path, (async function(req: Request, res: Response) {
        res.sendFile(__dirname + filePath, (err: Error) => {
            if (err == undefined) return;
            console.log("Couldnt find " + path + " file.", "\"" + err.name + "\": " + err.message);
            res.status(500).type("text").send("error 500, internal error");
        });
    }).bind(this));
};
const serverStaticSimple: ((path: string)=> void) = (path: string) => {
    serveStatic(app, "/" + path, "/webpage/" + path);
};

readConfig();
const port: number = Number(config.sec.port);

const app: Application = express();
app.use(express.json());
const server: http.Server = http.createServer(app);
serverStaticSimple("index.html");
serverStaticSimple("main.css");
serverStaticSimple("index.css");
serverStaticSimple("index.js");
serverStaticSimple("notifications.js");
serverStaticSimple("service-worker.js");
serverStaticSimple("manifest.json");
serverStaticSimple("favicon.ico");
serverStaticSimple("favicon.png");

app.get("*", (req: Request, res: Response) => {
    res.status(404).send("<html><body>404 Page Not Found</body></html>");
});
server.listen(port, function() {
    console.clear();
    console.log("Server started.");
    console.log("Https server on http://localhost:" + port + ".");
});
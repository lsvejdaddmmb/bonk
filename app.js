const http = require("http");
const fs = require("fs");
const url = require("url");
const uniqid = require("uniqid");

let hraci = new Array();

function main(req, res) {
    if (req.url == "/") {
        res.writeHead(200, {"Content-type": "text/html"});
        res.end(fs.readFileSync("index.html"));
    } else if (req.url.startsWith("/novyhrac")) {
        let q = url.parse(req.url, true);
        let obj = {};
        obj.uid = uniqid();
        res.writeHead(200, {"Content-type":"application/json"});
        res.end(JSON.stringify(obj));
        let hrac = {};
        hrac.uid = obj.uid;
        hrac.x = 100;
        hrac.y = 100;
        hrac.r = 10;
        console.log(q.query);
        hrac.jmeno = q.query.j;
        hrac.barva = "#" + q.query.b;
        hraci.push(hrac);
    } else {
        res.writeHead(404);
        res.end();
    }
}

let srv = http.createServer(main);
srv.listen(8080);

console.log("Bezi na http://localhost:8080");

//websockety...
const WebSocket = require('ws');
const wss = new WebSocket.Server({ server: srv });

wss.on('connection', ws => {
    ws.on('message', message => { //prijem zprav
        console.log(`Přijatá zpráva: ${message}`);
    });
});

let counter = 0;
function broadcast() {
    counter++;
    //odeslani zpravy vsem pripojenym klientum
    wss.clients.forEach(function each(client) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(counter);
        }
    });
}
setInterval(broadcast, 1000);

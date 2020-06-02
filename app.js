const http = require("http");
const fs = require("fs");
const url = require("url");
const uniqid = require("uniqid");

let hraci = new Array();

function vzdalenostBodu(bod1, bod2) {
    let xRozd = Math.abs(bod1.x - bod2.x);
    let yRozd = Math.abs(bod1.y - bod2.y);
    let vzdal = Math.sqrt(xRozd*xRozd + yRozd*yRozd);
    return vzdal;
}

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
        hrac.x = 100 + 50*hraci.length;
        hrac.y = 100;
        hrac.r = 10;
        hrac.baba = (hraci.length == 0);
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
        //console.log(`Přijatá zpráva: ${message}`);
        let posunuti = JSON.parse(message);
        for (let hrac of hraci) {
            if (posunuti.uid == hrac.uid) { //vyhleda prislusneho hrace
                if (posunuti.left) {
                    hrac.x = hrac.x - 1;
                }
                if (posunuti.right) {
                    hrac.x = hrac.x + 1;
                }
                if (posunuti.up) {
                    hrac.y = hrac.y - 1;
                }
                if (posunuti.down) {
                    hrac.y = hrac.y + 1;
                }
                //TODO kontrola predani baby s vyuzitim fce vzdalenostBodu
                break;
            }
        }

    });
});

function broadcast() {
    let json = JSON.stringify(hraci);
    //odeslani zpravy vsem pripojenym klientum
    wss.clients.forEach(function each(client) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(json);
        }
    });
}
setInterval(broadcast, 10);

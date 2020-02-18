const http = require("http");
const fs = require("fs");

function main(req, res) {
    if (req.url == "/") {
        res.writeHead(200, {"Content-type": "text/html"});
        res.end(fs.readFileSync("index.html"));
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
const http = require("http");
const fs = require("fs");
const url = require("url");
const uniqid = require("uniqid");

let hraci = new Array();
let hracBaba = undefined;

function vzdalenostBodu(bod1, bod2) {
    let xRozd = Math.abs(bod1.x - bod2.x);
    let yRozd = Math.abs(bod1.y - bod2.y);
    let vzdal = Math.sqrt(xRozd*xRozd + yRozd*yRozd); //Pythagorova veta
    return vzdal;
}

let casImunity = 0;
function aktCasMs() {
    let dt = new Date();
    return dt.getTime();
}
function nastavImunitu() {
    casImunity = aktCasMs() + 2000; //2s imunita
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
        hrac.casBaby = 0;
        hrac.poslPosun = aktCasMs();
        console.log(q.query);
        hrac.jmeno = q.query.j;
        hrac.barva = "#" + q.query.b;
        hraci.push(hrac);
        if (hrac.baba) {
            hracBaba = hrac;
        }
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
                hrac.poslPosun = aktCasMs();
                let v = 1;
                if (hrac.baba) {
                    v = 1.2;
                }
                if (posunuti.left) {
                    hrac.x = hrac.x - v;
                }
                if (posunuti.right) {
                    hrac.x = hrac.x + v;
                }
                if (posunuti.up) {
                    hrac.y = hrac.y - v;
                }
                if (posunuti.down) {
                    hrac.y = hrac.y + v;
                }
                //kontrola okraju
                if (hrac.x < hrac.r) {
                    hrac.x = hrac.r;
                }
                if (hrac.x > 800 - hrac.r) {
                    hrac.x = 800 - hrac.r;
                }
                if (hrac.y < hrac.r) {
                    hrac.y = hrac.r;
                }
                if (hrac.y > 600 - hrac.r) {
                    hrac.y = 600 - hrac.r;
                }
                //pokud je baba v imunite, tak se kontrola predani baby nedela
                if (aktCasMs() < casImunity) {
                    break;
                }
                //kontrola predani baby s vyuzitim fce vzdalenostBodu
                if (hrac.baba) {
                    for (let h of hraci) { //kontroluju proti vsem hracum
                        if (h.uid != hrac.uid) { //nesmim kontrolovat proti stejnemu hraci
                            let d = vzdalenostBodu(hrac, h);
                            if (d <= hrac.r + h.r) {
                                hrac.baba = false; //hrac, se kterym jsem posunul, mel babu, takze ji nebude mit
                                h.baba = true; //a bude ji mit tento hrac
                                hracBaba = h; //...proto ho nastavim do promenne hracBaba
                                nastavImunitu();
                            }
                        }
                    }
                } else {
                    let d = vzdalenostBodu(hrac, hracBaba);
                    if (d <= hrac.r + hracBaba.r) {
                        hracBaba.baba = false;
                        hrac.baba = true;
                        hracBaba = hrac;
                        nastavImunitu();
                    }
                }
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

function prictiCasBaby() {
    if (hracBaba) {
        hracBaba.casBaby++;
    }
}
setInterval(prictiCasBaby, 1000);


function vyradNeaktivniHrace() {
    let predejBabu = false;
    for (let i = hraci.length-1; i >= 0; i--) { //od posledniho hrace v seznamu k prvnimu, abych mohl hrace v cyklu ze seznamu vyradit
        let hrac = hraci[i];
        if (aktCasMs() - hrac.poslPosun > 30000) {
            if (hrac.baba) {
                predejBabu = true; //pokud ma neaktivni hrac babu, musim ji predat aktivnimu
            }
            hraci.splice(i, 1); //vyrazeni prvku s indexem i ze seznamu
        }
    }
    if (predejBabu && hraci.length > 0) { //predani baby, pokud je aspon jeden hrac aktivni
        hraci[0].baba = true;
        hracBaba = hraci[0];
    }
}
setInterval(vyradNeaktivniHrace, 10000);

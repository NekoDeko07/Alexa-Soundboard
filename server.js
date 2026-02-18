const WebSocket = require('ws');
const player = require('play-sound')();

const wss = new WebSocket.Server({ port: 3000 });

console.log("WebSocket Server läuft auf Port 3000");

wss.on('connection', ws => {
    console.log("Alexa verbunden");

    ws.on('message', message => {
        try {
            const data = JSON.parse(message);

            if (data.sound) {
                const file = `./sounds/${data.sound}.mp3`;
                console.log("Spiele:", file);

                player.play(file, err => {
                    if (err) console.error("Fehler:", err);
                });
            }
        } catch (e) {
            console.error("Ungültige Nachricht");
        }
    });
});

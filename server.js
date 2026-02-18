const WebSocket = require("ws");
const player = require("play-sound")();
const path = require("path");

const wss = new WebSocket.Server({ port: 3000 });
console.log("WebSocket Server läuft auf Port 3000");

wss.on("connection", (ws) => {
  console.log("Alexa verbunden");

  ws.on("message", (message) => {
    try {
      const data = JSON.parse(message);

      if (!data.sound) return;

      let name = String(data.sound).trim();

      // Sicherheit + verhindert Pfad-Tricks
      name = name.replace(/\\/g, "/").split("/").pop();

      // verhindert ".mp3.mp3"
      name = name.replace(/\.mp3$/i, "");

      const file = path.join(__dirname, "sounds", name + ".mp3");
      console.log("Spiele:", file);

      player.play(file, (err) => {
        if (err) console.error("Fehler:", err);
      });
    } catch (e) {
      console.error("Ungültige Nachricht:", e.message);
    }
  });
});

const WebSocket = require("ws");
const player = require("play-sound")();
const path = require("path");

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const wss = new WebSocket.Server({ port });

wss.on("listening", () => {
  console.log(`WebSocket Server läuft auf Port ${port}`);
});

wss.on("error", (err) => {
  if (err && err.code === "EADDRINUSE") {
    console.error(`Fehler: Port ${port} bereits in Verwendung. Bitte Port freigeben oder andere PORT-Umgebungsvariable setzen.`);
    process.exit(1);
  } else {
    console.error("WebSocket-Fehler:", err);
  }
});

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

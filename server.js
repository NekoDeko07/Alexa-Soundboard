const WebSocket = require("ws");
const player = require("play-sound")();
const path = require("path");
const { execSync, spawn } = require("child_process");
const fs = require("fs");
const os = require("os");

let ffplayPath = null;
// 1) try system PATH
try {
  const out = execSync("where ffplay", { encoding: "utf8" }).trim();
  if (out) ffplayPath = out.split(/\r?\n/)[0];
} catch (e) {
  // not in PATH
}

// 2) try common user install folder (from our installer script)
if (!ffplayPath) {
  const home = os.homedir();
  const possibleRoot = path.join(home, "ffmpeg");

  function findFfplay(dir) {
    try {
      const items = fs.readdirSync(dir, { withFileTypes: true });
      for (const it of items) {
        const p = path.join(dir, it.name);
        if (it.isFile() && it.name.toLowerCase() === "ffplay.exe") return p;
        if (it.isDirectory()) {
          const found = findFfplay(p);
          if (found) return found;
        }
      }
    } catch (e) {
      return null;
    }
    return null;
  }

  if (fs.existsSync(possibleRoot)) {
    const found = findFfplay(possibleRoot);
    if (found) ffplayPath = found;
  }
}

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

      if (ffplayPath) {
        const p = spawn(ffplayPath, ["-nodisp", "-autoexit", file], { stdio: 'ignore' });
        p.on('error', (err) => console.error('Fehler (ffplay spawn):', err));
      } else {
        player.play(file, (err) => {
          if (err) console.error("Fehler:", err);
        });
      }
    } catch (e) {
      console.error("Ungültige Nachricht:", e.message);
    }
  });
});

const WebSocket = require("ws");
const player = require("play-sound")();
const path = require("path");
const { execSync, spawn } = require("child_process");
const fs = require("fs");
const os = require("os");

function findExeOnPath(exeName) {
  try {
    const out = execSync(`where ${exeName}`, { encoding: "utf8" }).trim();
    if (out) return out.split(/\r?\n/)[0];
  } catch (_) {}
  return null;
}

function findExeRecursive(rootDir, exeLower) {
  function walk(dir) {
    try {
      const items = fs.readdirSync(dir, { withFileTypes: true });
      for (const it of items) {
        const p = path.join(dir, it.name);
        if (it.isFile() && it.name.toLowerCase() === exeLower) return p;
        if (it.isDirectory()) {
          const found = walk(p);
          if (found) return found;
        }
      }
    } catch (_) {
      return null;
    }
    return null;
  }
  return walk(rootDir);
}

// --- Locate ffplay (your existing logic, slightly wrapped) ---
let ffplayPath = findExeOnPath("ffplay");
if (!ffplayPath) {
  const home = os.homedir();
  const possibleRoot = path.join(home, "ffmpeg");
  if (fs.existsSync(possibleRoot)) {
    const found = findExeRecursive(possibleRoot, "ffplay.exe");
    if (found) ffplayPath = found;
  }
}

// --- Locate mpv (preferred) ---
let mpvPath = findExeOnPath("mpv");
if (!mpvPath) {
  // common places people drop mpv
  const home = os.homedir();
  const candidates = [
    path.join(home, "mpv"),
    path.join(home, "tools", "mpv"),
    path.join("C:\\", "tools", "mpv"),
    path.join("C:\\", "Program Files", "mpv"),
    path.join("C:\\", "Program Files (x86)", "mpv"),
  ];

  for (const dir of candidates) {
    if (fs.existsSync(dir)) {
      const found = findExeRecursive(dir, "mpv.exe");
      if (found) {
        mpvPath = found;
        break;
      }
    }
  }
}

function safeSoundName(input) {
  let name = String(input ?? "").trim();
  name = name.replace(/\\/g, "/").split("/").pop(); // no paths
  name = name.replace(/\.mp3$/i, "");              // prevent mp3.mp3
  return name;
}

function playFile(file) {
  // Prefer mpv: shows up reliably in Windows volume mixer as its own session
  if (mpvPath) {
    const p = spawn(
      mpvPath,
      [
        "--no-video",
        "--really-quiet",
        "--force-window=no",
        "--audio-display=no",
        "--keep-open=no",
        file,
      ],
      { stdio: "ignore", windowsHide: true }
    );
    p.on("error", (err) => console.error("Fehler (mpv spawn):", err));
    return;
  }

  // Fallback to ffplay
  if (ffplayPath) {
    const p = spawn(
      ffplayPath,
      ["-nodisp", "-autoexit", "-hide_banner", "-loglevel", "error", file],
      { stdio: "ignore", windowsHide: true }
    );
    p.on("error", (err) => console.error("Fehler (ffplay spawn):", err));
    return;
  }

  // Final fallback
  player.play(file, (err) => {
    if (err) console.error("Fehler (play-sound):", err);
  });
}

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const wss = new WebSocket.Server({ port });

wss.on("listening", () => {
  console.log(`WebSocket Server läuft auf Port ${port}`);
  console.log("Player:", mpvPath ? `mpv (${mpvPath})` : ffplayPath ? `ffplay (${ffplayPath})` : "play-sound fallback");
});

wss.on("error", (err) => {
  if (err && err.code === "EADDRINUSE") {
    console.error(`Fehler: Port ${port} bereits in Verwendung. Bitte Port freigeben oder PORT-Umgebungsvariable setzen.`);
    process.exit(1);
  } else {
    console.error("WebSocket-Fehler:", err);
  }
});

wss.on("connection", (ws) => {
  console.log("Client verbunden");

  ws.on("message", (message) => {
    try {
      const data = JSON.parse(message);
      if (!data.sound) return;

      const name = safeSoundName(data.sound);
      const file = path.join(__dirname, "sounds", name + ".mp3");
      console.log("Spiele:", file);

      if (!fs.existsSync(file)) {
        console.error("Datei nicht gefunden:", file);
        return;
      }

      playFile(file);
    } catch (e) {
      console.error("Ungültige Nachricht:", e.message);
    }
  });
});

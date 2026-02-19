const WebSocket = require("ws");
const player = require("play-sound")();
const path = require("path");
const { execSync, spawn } = require("child_process");
const fs = require("fs");
const os = require("os");

// ---------- Helpers ----------
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

function safeSoundName(input) {
  let name = String(input ?? "").trim();
  name = name.replace(/\\/g, "/").split("/").pop(); // prevent paths
  name = name.replace(/\.mp3$/i, "");               // prevent .mp3.mp3
  return name;
}

// ---------- Locate ffplay ----------
let ffplayPath = findExeOnPath("ffplay");
if (!ffplayPath) {
  const home = os.homedir();
  const possibleRoot = path.join(home, "ffmpeg"); // your existing folder style
  if (fs.existsSync(possibleRoot)) {
    const found = findExeRecursive(possibleRoot, "ffplay.exe");
    if (found) ffplayPath = found;
  }
}

// Keep a reference so we can stop previous playback if needed
let currentProc = null;

function stopCurrent() {
  if (currentProc && !currentProc.killed) {
    try {
      currentProc.kill("SIGKILL");
    } catch (_) {}
  }
  currentProc = null;
}

function playWithFfplay(file) {
  // Stop previous clip so button-mashing doesn't overlap
  stopCurrent();

  // IMPORTANT:
  // - no -autoexit here, so ffplay stays visible in Windows volume mixer
  //   -> set it once to "Voicemeeter AUX Input" in the mixer
  // After Windows remembers it, you can add "-autoexit" back if you want.
  const args = [
    "-nodisp",
    "-hide_banner",
    "-loglevel",
    "error",
    "-volume",
    "100",
    file,
  ];

  currentProc = spawn(ffplayPath, args, {
    stdio: "ignore",
    windowsHide: true,
    // Try to encourage WASAPI backend (sometimes helps with routing stability)
    env: { ...process.env, SDL_AUDIODRIVER: "wasapi" },
  });

  currentProc.on("error", (err) => console.error("Fehler (ffplay spawn):", err));
  currentProc.on("exit", () => {
    currentProc = null;
  });
}

function playFile(file) {
  if (ffplayPath) {
    playWithFfplay(file);
    return;
  }

  // fallback if ffplay missing
  player.play(file, (err) => {
    if (err) console.error("Fehler (play-sound):", err);
  });
}

// ---------- WebSocket Server ----------
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const wss = new WebSocket.Server({ port });

wss.on("listening", () => {
  console.log(`WebSocket Server läuft auf Port ${port}`);
  console.log("Player:", ffplayPath ? `ffplay (${ffplayPath})` : "play-sound fallback");
});

wss.on("error", (err) => {
  if (err && err.code === "EADDRINUSE") {
    console.error(
      `Fehler: Port ${port} bereits in Verwendung. Bitte Port freigeben oder PORT-Umgebungsvariable setzen.`
    );
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

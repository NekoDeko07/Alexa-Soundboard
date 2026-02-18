const WebSocket = require('ws');

const url = process.env.SERVER_URL || 'ws://localhost:3000';
const soundName = process.env.SOUND || 'geiler-wecker';

const ws = new WebSocket(url);

ws.on('open', () => {
  console.log('Client verbunden an', url);
  ws.send(JSON.stringify({ sound: soundName }));
  console.log('Nachricht gesendet:', soundName);
  setTimeout(() => ws.close(), 500);
});

ws.on('message', (m) => console.log('Nachricht vom Server:', m.toString()));
ws.on('error', (e) => console.error('Client-Fehler:', e.message));
ws.on('close', () => console.log('Client Verbindung geschlossen'));

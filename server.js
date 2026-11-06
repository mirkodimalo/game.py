const { WebSocketServer, WebSocket } = require('ws');
const { randomUUID } = require('crypto');

const wss = new WebSocketServer({ host: '0.0.0.0', port: 8080 });
const players = new Map();

function broadcastPlayers() {
  const payload = JSON.stringify({
    type: 'players',
    players: Array.from(players.values())
  });

  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  }
}

wss.on('connection', (socket) => {
  const player = {
    id: randomUUID(),
    x: 0.5,
    y: 0.82,
    angle: -Math.PI / 2
  };

  players.set(player.id, player);
  socket.send(JSON.stringify({ type: 'welcome', id: player.id }));
  broadcastPlayers();

  let lastUpdate = 0;

  socket.on('message', (raw) => {
    const now = Date.now();

    if (now - lastUpdate < 30 || raw.length > 1024) return;
    lastUpdate = now;

    let message;
    try {
      message = JSON.parse(raw.toString());
    } catch {
      return;
    }

    if (message.type !== 'move') return;

    const { x, y, angle } = message;
    if (![x, y, angle].every(Number.isFinite)) return;

    player.x = Math.max(0, Math.min(1, x));
    player.y = Math.max(0, Math.min(1, y));
    player.angle = angle;
    broadcastPlayers();
  });

  socket.on('close', () => {
    players.delete(player.id);
    broadcastPlayers();
  });
});

console.log('Galaxy Siege online: ws://localhost:8080');

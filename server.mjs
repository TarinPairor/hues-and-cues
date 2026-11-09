import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { WebSocketServer, WebSocket } from 'ws';
import { Game, SEATS } from './game.mjs';

export function createGameServer() {
  const game = new Game(), players = new Map();
  const root = fileURLToPath(new URL('./public/', import.meta.url));
  const server = http.createServer(async (req, res) => {
    try {
      const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
      const mime = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.woff2': 'font/woff2', '.svg': 'image/svg+xml' }[path.extname(file)];
      if (!file.startsWith(root) || !mime) throw new Error('Not found');
      const data = await readFile(file);
      res.writeHead(200, { 'Content-Type': mime, 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' }); res.end(data);
    } catch { res.writeHead(404); res.end('Not found'); }
  });
  const wss = new WebSocketServer({ noServer: true, maxPayload: 2048 });
  const send = (ws, value) => { if (ws?.readyState === WebSocket.OPEN && ws.bufferedAmount < 1024 * 1024) ws.send(JSON.stringify(value)); };
  const lobbySnapshot = () => {
    const presence = Object.fromEntries(SEATS.map(seat => [seat, players.get(seat)?.ws?.readyState === WebSocket.OPEN]));
    return { type: 'lobby', presence };
  };
  const broadcast = () => {
    for (const client of wss.clients) send(client, lobbySnapshot());
    const presence = Object.fromEntries(SEATS.map(seat => [seat, players.get(seat)?.ws?.readyState === WebSocket.OPEN]));
    for (const [seat, player] of players) if (player.ws) send(player.ws, { ...game.snapshot(seat), presence });
  };
  server.on('upgrade', (req, socket, head) => {
    let sameOrigin = true;
    try { if (req.headers.origin) sameOrigin = new URL(req.headers.origin).host === req.headers.host; } catch { sameOrigin = false; }
    if (req.url !== '/ws' || !sameOrigin || wss.clients.size >= 16) { socket.end('HTTP/1.1 403 Forbidden\r\n\r\n'); return; }
    wss.handleUpgrade(req, socket, head, ws => wss.emit('connection', ws));
  });
  wss.on('connection', ws => {
    ws.alive = true; ws.count = 0; ws.window = Date.now();
    ws.on('pong', () => { ws.alive = true; }); ws.on('error', () => {});
    send(ws, lobbySnapshot());
    ws.on('message', raw => {
      try {
        if (Date.now() - ws.window > 1000) { ws.count = 0; ws.window = Date.now(); }
        if (++ws.count > 30) { ws.close(1008, 'Too many actions'); return; }
        const message = JSON.parse(raw.toString());
        if (!message || typeof message !== 'object') throw new Error('Invalid message.');
        if (message.type === 'join') {
          if (ws.seat) throw new Error('You have already joined the game.');
          let seat;
          if (typeof message.token === 'string' && message.token) {
            seat = SEATS.find(candidate => players.get(candidate)?.token === message.token);
            if (!seat) throw new Error('Your session expired. Enter the password to join again.');
          } else {
            if (message.password !== 'amy') throw new Error('Incorrect password. Try again.');
            seat = SEATS.find(candidate => players.get(candidate)?.ws?.readyState !== WebSocket.OPEN);
            if (!seat) throw new Error('The game is full. Both players have already joined.');
          }
          // A password join takes an offline seat with a fresh reconnect token.
          const existing = message.token ? players.get(seat) : null;
          const player = existing || { token: randomBytes(24).toString('hex'), ws: null };
          if (player.ws && player.ws !== ws) { player.ws.seat = null; player.ws.close(4001, 'Seat opened in another tab'); }
          player.ws = ws; players.set(seat, player); ws.seat = seat;
          send(ws, { type: 'welcome', seat: ws.seat, token: player.token }); broadcast(); return;
        }
        if (!ws.seat) throw new Error('Join a seat first.');
        if (message.type === 'leave') {
          players.delete(ws.seat); ws.seat = null; broadcast(); return;
        }
        if (SEATS.some(seat => players.get(seat)?.ws?.readyState !== WebSocket.OPEN)) throw new Error('Both players need to be connected to play.');
        game.act(ws.seat, message); broadcast();
      } catch (error) { send(ws, { type: 'error', message: error instanceof SyntaxError ? 'Invalid message.' : error.message }); }
    });
    ws.on('close', () => { if (players.get(ws.seat)?.ws === ws) players.get(ws.seat).ws = null; broadcast(); });
  });
  const heartbeat = setInterval(() => {
    for (const ws of wss.clients) { if (!ws.alive) ws.terminate(); else { ws.alive = false; ws.ping(); } }
  }, 15000); heartbeat.unref();
  const shutdown = () => { clearInterval(heartbeat); for (const ws of wss.clients) ws.terminate(); wss.close(); };
  server.on('close', shutdown);
  return { server, wss, game, players, shutdown };
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const port = Number(process.env.PORT || 5173);
  const { server } = createGameServer();
  server.listen(port, '0.0.0.0', () => console.log(`Hues for two is ready at http://localhost:${port}`));
}

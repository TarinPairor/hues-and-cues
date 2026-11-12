import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { WebSocket } from 'ws';
import { createGameServer } from '../server.mjs';

async function client(url) {
  const ws = new WebSocket(url), messages = [], waiters = [];
  ws.on('message', data => {
    const value = JSON.parse(data); messages.push(value);
    for (const waiter of [...waiters]) if (waiter.predicate(value)) { waiters.splice(waiters.indexOf(waiter), 1); clearTimeout(waiter.timer); waiter.resolve(value); }
  });
  const wait = predicate => new Promise((resolve, reject) => {
    const waiter = { predicate, resolve, timer: setTimeout(() => { waiters.splice(waiters.indexOf(waiter), 1); reject(new Error('Message timeout')); }, 3000) };
    waiters.push(waiter);
  });
  await once(ws, 'open');
  return { ws, messages, wait, send: data => ws.send(JSON.stringify(data)) };
}
test('two real WebSocket clients play, protect secrets, reconnect, and reset', async t => {
  const app = createGameServer();
  t.after(() => { app.shutdown(); app.server.close(); });
  const listening = once(app.server, 'listening');
  app.server.listen(0, '127.0.0.1');
  try { await listening; } catch (error) {
    if (error.code === 'EPERM') { t.skip('This environment blocks listening on local sockets.'); return; }
    throw error;
  }
  const port = app.server.address().port, url = `ws://127.0.0.1:${port}/ws`;
  const response = await fetch(`http://127.0.0.1:${port}`); assert.equal(response.status, 200); assert.match(await response.text(), /Hues &amp; Cues|Hues and Cues/);
  assert.equal((await fetch(`http://127.0.0.1:${port}/game.mjs`)).status, 404);
  const a = await client(url), b = await client(url);
  let welcome = a.wait(m => m.type === 'welcome'); a.send({ type: 'join', password: 'amy' }); const identity = await welcome;
  const error = a.wait(m => m.type === 'error'); a.send({ type: 'reroll' }); assert.match((await error).message, /Both players/);
  let update = b.wait(m => m.type === 'state'); b.send({ type: 'join', password: 'amy' }); await update;
  const intruder = await client(url); const rejected = intruder.wait(m => m.type === 'error'); intruder.send({ type: 'join', password: 'amy' }); assert.match((await rejected).message, /full/); intruder.ws.close();
  update = b.wait(m => m.activeGame === 'hues-and-cues'); a.send({type:'select-game',gameId:'hues-and-cues'}); await update;
  const target = app.game.choices[0];
  update = b.wait(m => m.stage === 'hint1'); a.send({ type: 'choose', cell: target }); const hidden = await update;
  assert.equal(hidden.target, null); assert.deepEqual(hidden.choices, []);
  update = b.wait(m => m.stage === 'guess1'); a.send({ type: 'hint', text: 'peach' }); await update;
  update = a.wait(m => m.stage === 'hint2'); b.send({ type: 'guess', cell: target }); await update;
  update = b.wait(m => m.stage === 'guess2'); a.send({ type: 'hint', text: 'ripe peach' }); await update;
  update = b.wait(m => m.stage === 'reveal'); b.send({ type: 'guess', cell: target }); const result = await update;
  assert.equal(result.target, target); assert.equal(result.scores.B, 6);
  const lost = once(a.ws, 'close'); a.ws.close(); await lost;
  const reconnected = await client(url); update = reconnected.wait(m => m.type === 'state'); reconnected.send({ type: 'join', seat: 'A', token: identity.token }); const restored = await update;
  assert.equal(restored.scores.B, 6); assert.equal(restored.stage, 'reveal');
  update = b.wait(m => m.stage === 'choose' && m.round === 2); reconnected.send({ type: 'next' }); assert.equal((await update).giver, 'B');
  update = b.wait(m => m.stage === 'choose' && m.round === 1); b.send({ type: 'restart' }); assert.deepEqual((await update).scores, { A: 0, B: 0 });
  update = reconnected.wait(m => m.type === 'state' && !m.presence.B); b.send({ type: 'leave' }); await update;
  const replacement = await client(url); update = replacement.wait(m => m.type === 'welcome'); replacement.send({ type: 'join', password: 'amy' }); await update;
});

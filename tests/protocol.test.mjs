import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { createGameServer } from '../server.mjs';

// Exercise the actual server connection handler in memory; works even when
// a sandbox prohibits listening on a TCP port. The separate socket test covers ws.
class Peer extends EventEmitter {
  constructor(app) { super(); this.readyState = 1; this.bufferedAmount = 0; this.messages = []; app.wss.clients.add(this); app.wss.emit('connection', this); }
  send(value) { this.messages.push(JSON.parse(value)); }
  act(value) { this.emit('message', JSON.stringify(value)); }
  latest(type = 'state') { return this.messages.findLast(message => message.type === type); }
  close() { if (this.readyState === 3) return; this.readyState = 3; this.emit('close'); }
  terminate() { this.close(); }
  ping() {}
}
test('server protocol enforces seats, private snapshots, presence, tokens and replacement tabs', t => {
  const app = createGameServer(); t.after(() => app.shutdown());
  const a = new Peer(app), b = new Peer(app), outsider = new Peer(app);
  outsider.act({type:'guess',cell:2}); assert.match(outsider.latest('error').message, /Join a seat/);
  a.act({type:'join',password:'amy'}); const token = a.latest('welcome').token;
  assert.equal(a.latest().presence.B, false);
  a.act({type:'reroll'}); assert.match(a.latest('error').message, /Both players/);
  b.act({type:'join',password:'amy'}); assert.equal(a.latest().presence.B, true);
  outsider.act({type:'join',seat:'A',token:'wrong'}); assert.match(outsider.latest('error').message, /expired/);
  const target = a.latest().choices[0]; a.act({type:'choose',cell:target});
  assert.equal(a.latest().target, target); assert.equal(b.latest().target, null);
  assert.deepEqual(b.latest().choices, []);
  b.act({type:'hint',text:'red'}); assert.match(b.latest('error').message, /not your turn/);
  a.act({type:'hint',text:'red'}); b.act({type:'guess',cell:target});
  assert.equal(b.latest().target, null); assert.equal(b.latest().stage, 'hint2');
  a.act({type:'hint',text:'bright red'}); b.act({type:'guess',cell:target});
  assert.equal(b.latest().target, target); assert.equal(b.latest().scores.B, 6);
  assert.equal(b.latest().result.total, 6);
  a.close(); assert.equal(b.latest().presence.A, false);
  b.act({type:'next'}); assert.match(b.latest('error').message, /Both players/);
  const restored = new Peer(app); restored.act({type:'join',seat:'A',token});
  assert.equal(restored.latest().scores.B, 6); assert.equal(restored.latest().stage, 'reveal');
  const replacement = new Peer(app); replacement.act({type:'join',seat:'A',token});
  assert.equal(restored.readyState, 3); assert.equal(replacement.latest().presence.A, true);
  replacement.act({type:'next'}); assert.equal(b.latest().giver, 'B');
  b.act({type:'restart'}); assert.deepEqual(b.latest().scores, {A:0,B:0});
  b.act({type:'leave'}); assert.equal(replacement.latest().presence.B, false);
  outsider.act({type:'join',password:'amy'}); assert.equal(outsider.latest('welcome').seat, 'B');
});
test('HTTP handler serves the app and refuses source and directory traversal', async t => {
  const app = createGameServer(); t.after(() => app.shutdown());
  async function request(url) {
    return new Promise(resolve => {
      const response = {status:200,headers:{},writeHead(code,headers){this.status=code;this.headers=headers;},end(body){resolve({status:this.status,headers:this.headers,body:body?.toString()});}};
      app.server.emit('request',{url},response);
    });
  }
  const page = await request('/'); assert.equal(page.status, 200); assert.match(page.body, /hues/);
  assert.equal(page.headers['Content-Type'], 'text/html');
  const colors = await request('/colors.json'); assert.equal(JSON.parse(colors.body).length, 480);
  for (const url of ['/server.mjs','/game.mjs','/package.json','/../game.mjs','/%2e%2e%2fgame.mjs','/%zz']) {
    assert.equal((await request(url)).status, 404, url);
  }
});

test('password join assigns the first available player and publishes only public presence to the lobby', t => {
  const app = createGameServer(); t.after(() => app.shutdown());
  const visitor = new Peer(app), first = new Peer(app), second = new Peer(app);
  assert.deepEqual(visitor.latest('lobby'), {type:'lobby',presence:{A:false,B:false}});
  for (const message of [{type:'join'}, {type:'join',seat:'A'}, {type:'join',password:'wrong'}, {type:'join',password:'Amy'}]) {
    first.act(message); assert.match(first.latest('error').message, /Incorrect password/);
    assert.equal(app.players.size, 0);
  }
  // A requested seat cannot override the automatic assignment.
  first.act({type:'join',password:'amy',seat:'B'});
  assert.equal(first.latest('welcome').seat, 'A');
  assert.deepEqual(visitor.latest('lobby').presence, {A:true,B:false});
  second.act({type:'join',password:'amy'});
  assert.equal(second.latest('welcome').seat, 'B');
  assert.deepEqual(visitor.latest('lobby').presence, {A:true,B:true});
  visitor.act({type:'join',password:'amy'}); assert.match(visitor.latest('error').message, /full/);
  first.act({type:'choose',cell:app.game.choices[0]});
  assert.equal(visitor.latest(), undefined);
  assert.deepEqual(Object.keys(visitor.latest('lobby')).sort(), ['presence','type']);
  first.close(); assert.deepEqual(visitor.latest('lobby').presence, {A:false,B:true});
  visitor.act({type:'join',password:'amy'}); assert.match(visitor.latest('error').message, /full/);
  second.act({type:'leave'}); assert.deepEqual(visitor.latest('lobby').presence, {A:false,B:false});
  visitor.act({type:'join',password:'amy'}); assert.equal(visitor.latest('welcome').seat, 'B');
});

import { $, escape, playerName } from './ui.js';
import { MINIGAMES } from './games/catalog.js';
import { createHuesView } from './games/hues.js';
let state = null, socket = null, profile = null, welcomed = false;
let retryTimer, retry = 0, joining = false;
let presence = { A: false, B: false };

function notice(text = '', info = false) { $('#notice').textContent = text; $('#notice').hidden = !text; $('#notice').classList.toggle('info', info); }
function connection(text, connected = false) { $('#connection').textContent = text; $('#connection').classList.toggle('connected', connected); }
function joinError(text = '') { $('#join-error').textContent = text; $('#join-error').hidden = !text; $('#join-password').setAttribute('aria-invalid', String(Boolean(text))); }
function updateJoinControls() {
  $('#join-submit').disabled = joining || socket?.readyState !== WebSocket.OPEN;
  $('#join-submit').textContent = joining ? 'Joining…' : 'Join game';
}
function renderPlayers() {
  const seats = ['A', 'B'].filter(seat => presence[seat]);
  $('#joined-count').textContent = `${seats.length} ${seats.length === 1 ? 'player' : 'players'} joined`;
  $('#player-cards').innerHTML = seats.map(seat => `<div class="player-card" data-player="${seat}"><span class="avatar">${seat === 'A' ? 1 : 2}</span><span class="score-name">${playerName(seat)} joined<small>${state ? `${seat === state.seat ? 'You · ' : ''}${state.activeGame ? (seat === state.giver ? 'Clue giver' : 'Guesser') : 'Ready to play'}` : 'Ready to play'}</small></span>${state?.scores ? `<strong>${state.scores[seat]}<small>points</small></strong>` : ''}</div>`).join('');
}
function send(message) {
  if (socket?.readyState !== WebSocket.OPEN || !welcomed) { notice('Connection lost. We’re reconnecting you to the game.'); return false; }
  notice(); socket.send(JSON.stringify(message)); return true;
}
function saveProfile(value) { profile = value; try { if (value) sessionStorage.setItem('hues-seat', JSON.stringify(value)); else sessionStorage.removeItem('hues-seat'); } catch {} }
function join(password) {
  if (joining || socket?.readyState !== WebSocket.OPEN) return;
  joining = true; joinError(); notice(); updateJoinControls();
  socket.send(JSON.stringify({ type: 'join', password }));
}
function openSocket() {
  welcomed = false;
  connection(retry ? 'Reconnecting…' : 'Connecting…');
  const ws = new WebSocket(`${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/ws`);
  socket = ws; updateJoinControls();
  ws.onopen = () => {
    if (socket !== ws) return;
    connection('One shared room', true);
    if (profile?.token) { joining = true; ws.send(JSON.stringify({ type: 'join', token: profile.token })); }
    updateJoinControls();
  };
  ws.onmessage = event => {
    if (socket !== ws) return;
    let message; try { message = JSON.parse(event.data); } catch { return; }
    if (message.type === 'lobby') {
      presence = message.presence; render();
    } else if (message.type === 'welcome') {
      saveProfile({ seat: message.seat, token: message.token }); welcomed = true; joining = false; retry = 0; notice(); joinError();
      $('#join-password').value = ''; $('#join-form').hidden = true; $('#join-open').hidden = false;
      connection(`You are ${playerName(message.seat)}`, true); updateJoinControls();
    } else if (message.type === 'state' && welcomed) {
      state = message; presence = message.presence; render();
    } else if (message.type === 'error') {
      if (!welcomed) {
        joining = false; saveProfile(null); state = null; render();
        $('#join-form').hidden = false; $('#join-open').hidden = true; joinError(message.message); updateJoinControls(); $('#join-password').focus();
      } else notice(message.message);
    }
  };
  ws.onerror = () => {};
  ws.onclose = event => {
    if (socket !== ws) return;
    welcomed = false; joining = false; presence = { A: false, B: false };
    if (event.code === 4001) {
      saveProfile(null); state = null;
      notice('Your game is open in another tab. You can join again here when a place is available.');
    }
    connection('Reconnecting…'); render(); updateJoinControls();
    retryTimer = setTimeout(openSocket, Math.min(5000, 500 * ++retry));
  };
}
const bothHere = () => welcomed && presence.A && presence.B;


const views = new Map([
  ['hues-and-cues', createHuesView({ send: message => send({ ...message, gameId: 'hues-and-cues' }), bothHere })],
]);
function render() {
  const activeGame = state?.activeGame;
  $('#join-panel').hidden = Boolean(state); $('#leave').hidden = !state;
  $('#game-library').hidden = Boolean(activeGame);
  $('#hues-game').hidden = activeGame !== 'hues-and-cues';
  $('#back-to-games').hidden = !activeGame;
  $('#back-to-games').disabled = !bothHere();
  if (activeGame) {
    views.get(activeGame)?.update(state);
  } else {
    for (const view of views.values()) view.deactivate();
    $('#round-label').textContent = 'One room. Two players.';
    $('#headline').textContent = 'What shall we play?';
    $('#subline').textContent = 'Pick a minigame and make a little time for each other.';
    $('#library-status').textContent = !state ? 'Join the room to choose a game.' : !bothHere() ? 'Waiting for both players to connect.' : 'Either of you can choose. You’ll play together.';
  }
  renderPlayers();
  document.querySelectorAll('[data-select-game]').forEach(button => {
    button.disabled = !bothHere();
    button.textContent = state?.savedGames?.includes(button.dataset.selectGame) ? 'Resume game' : 'Play game';
  });
}
$('#game-list').innerHTML = MINIGAMES.map(game => `<article class="minigame-card"><div class="game-cover" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div><div class="game-details"><h2>${escape(game.name)}</h2><p>${escape(game.description)}</p><div class="game-card-footer"><span>${escape(game.category)} · 2 players</span><button class="button primary" data-select-game="${escape(game.id)}" disabled>Play game</button></div></div></article>`).join('');
document.querySelectorAll('[data-select-game]').forEach(button => { button.onclick = () => send({ type: 'select-game', gameId: button.dataset.selectGame }); });
$('#back-to-games').onclick = () => send({ type: 'show-games' });
$('#join-open').onclick = () => {
  $('#join-open').hidden = true; $('#join-form').hidden = false; $('#join-password').focus();
};
$('#join-form').onsubmit = event => { event.preventDefault(); join($('#join-password').value); };
$('#join-password').oninput = () => joinError();
$('#leave').onclick = () => {
  if (socket?.readyState !== WebSocket.OPEN || !welcomed) { notice('Wait for your connection to return before leaving the game.'); return; }
  send({ type: 'leave' }); saveProfile(null); welcomed = false; state = null; render();
  connection('One shared room', true);
};
$('#rules-open').onclick = () => $('#rules-dialog').showModal();
document.querySelectorAll('[data-close]').forEach(button => { button.onclick = () => document.getElementById(button.dataset.close).close(); });
document.querySelectorAll('dialog').forEach(dialog => { dialog.addEventListener('click', event => { if (event.target === dialog) { const rect = dialog.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close(); } }); });
render();
try { const saved = JSON.parse(sessionStorage.getItem('hues-seat')); if (saved?.token) profile = saved; } catch {}
openSocket();

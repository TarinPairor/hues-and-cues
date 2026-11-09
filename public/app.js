const $ = selector => document.querySelector(selector);
const colors = await fetch('/colors.json').then(response => {
  if (!response.ok) throw new Error('Could not load the color board.');
  return response.json();
});
const coord = cell => `${String.fromCharCode(65 + Math.floor(cell / 30))}${cell % 30 + 1}`;
const escape = text => String(text).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const icon = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M4 7h3c5 0 5 10 10 10h3M17 14l3 3-3 3M4 17h3c2 0 3-2 4-4m2-2c1-2 2-4 4-4h3m-3-3 3 3-3 3"/></svg>';
const playerName = seat => `Player ${seat === 'A' ? 1 : 2}`;
let state = null, socket = null, profile = null, welcomed = false;
let retryTimer, retry = 0, selected = null, draft = '', previousTurn = '', joining = false;
let presence = { A: false, B: false };
const cellButtons = [];
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
  $('#player-cards').innerHTML = seats.map(seat => `<div class="player-card" data-player="${seat}"><span class="avatar">${seat === 'A' ? 1 : 2}</span><span class="score-name">${playerName(seat)} joined<small>${state ? `${seat === state.seat ? 'You · ' : ''}${seat === state.giver ? 'Clue giver' : 'Guesser'}` : 'Ready to play'}</small></span>${state ? `<strong>${state.scores[seat]}<small>points</small></strong>` : ''}</div>`).join('');
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
      presence = message.presence; renderPlayers();
    } else if (message.type === 'welcome') {
      saveProfile({ seat: message.seat, token: message.token }); welcomed = true; joining = false; retry = 0; notice(); joinError();
      $('#join-password').value = ''; $('#join-form').hidden = true; $('#join-open').hidden = false;
      connection(`You are ${playerName(message.seat)}`, true); updateJoinControls();
    } else if (message.type === 'state' && welcomed) {
      const turn = `${message.round}:${message.stage}:${message.giver}`;
      if (turn !== previousTurn) { selected = null; draft = ''; }
      previousTurn = turn; state = message; presence = message.presence; render();
    } else if (message.type === 'error') {
      if (!welcomed) {
        joining = false; saveProfile(null); state = null; previousTurn = ''; selected = null; draft = ''; render();
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
const bothHere = () => welcomed && state?.presence.A && state?.presence.B;
const canGuess = () => bothHere() && state.seat === state.guesser && ['guess1', 'guess2'].includes(state.stage);

function buildBoard() {
  const board = $('#board');
  for (let row = -1; row <= 16; row++) {
    for (let column = -1; column <= 30; column++) {
      if (row === -1 || row === 16 || column === -1 || column === 30) {
        const label = document.createElement('span'); label.className = 'axis'; label.setAttribute('aria-hidden', 'true');
        label.textContent = row === -1 || row === 16 ? (column >= 0 && column < 30 ? column + 1 : '') : String.fromCharCode(65 + row);
        board.append(label); continue;
      }
      const cell = row * 30 + column, button = document.createElement('button');
      button.className = 'cell'; button.style.backgroundColor = colors[cell]; button.dataset.cell = cell;
      button.title = coord(cell); button.setAttribute('aria-label', `Color ${coord(cell)}`); button.disabled = true; button.tabIndex = -1;
      button.onmouseenter = () => { $('#hover-coordinate').textContent = `${coord(cell)} · ${colors[cell].toUpperCase()}`; };
      button.onfocus = button.onmouseenter;
      button.onclick = () => {
        if (!canGuess()) return;
        selected = cell; renderBoard(); renderPanel();
      };
      button.onkeydown = event => {
        const moves = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -30, ArrowDown: 30, Home: -(cell % 30), End: 29 - cell % 30 };
        if (!(event.key in moves)) return;
        event.preventDefault();
        const next = Math.max(0, Math.min(479, cell + moves[event.key]));
        button.tabIndex = -1; cellButtons[next].tabIndex = 0; cellButtons[next].focus();
      };
      cellButtons.push(button); board.append(button);
    }
  }
  $('#board').onmouseleave = () => { $('#hover-coordinate').textContent = selected !== null ? `Selected ${coord(selected)}` : 'A1 — P30'; };
  for (let row = -2; row <= 2; row++) for (let column = -2; column <= 2; column++) {
    const square = document.createElement('span'); square.dataset.score = 3 - Math.max(Math.abs(row), Math.abs(column)); $('#mini-scoring').append(square);
  }
}
function renderBoard() {
  const enabled = canGuess();
  cellButtons.forEach((button, cell) => {
    button.disabled = !enabled; button.tabIndex = enabled && cell === (selected ?? 0) ? 0 : -1;
    button.className = `cell${selected === cell ? ' selected' : ''}`; button.replaceChildren();
    let label = `Color ${coord(cell)}`;
    if (state?.target !== null && state?.target !== undefined) {
      if (cell === state.target) {
        button.classList.add('target-cell'); const pin = document.createElement('span'); pin.className = 'pin target'; button.append(pin); label += ', target color';
      }
      if (state.stage === 'reveal') {
        const distance = Math.max(Math.abs(Math.floor(cell / 30) - Math.floor(state.target / 30)), Math.abs(cell % 30 - state.target % 30));
        if (distance === 1 || distance === 2) button.classList.add(`ring-${distance}`);
      }
    }
    state?.guesses.forEach((guess, index) => {
      if (guess !== cell) return;
      label += `, guess ${index + 1}`;
      if (index === 1 && state.guesses[0] === guess) return;
      const pin = document.createElement('span'); pin.className = `pin ${index ? 'second' : 'first'}`;
      pin.textContent = state.guesses.length === 2 && state.guesses[0] === state.guesses[1] ? '1·2' : index + 1; button.append(pin);
    });
    button.setAttribute('aria-label', label); button.setAttribute('aria-pressed', String(selected === cell));
  });
}
const waitingArt = '<div class="waiting-art" aria-hidden="true"><i></i><i></i><i></i><i></i></div>';
function hintList() { return state.hints.length ? `<div class="hint-list">${state.hints.map((hint, i) => `<div class="hint-item"><small>Hint ${i + 1}</small><em>${escape(hint)}</em></div>`).join('')}</div>` : ''; }
function secretColor() { return `<div class="secret-color"><span class="color-chip" style="background:${colors[state.target]}"></span><div>${coord(state.target)}<small>Your secret color · only you can see it</small></div></div>`; }
function stepTrack() {
  const stages = ['choose', 'hint1', 'guess1', 'hint2', 'guess2', 'reveal'], current = stages.indexOf(state.stage);
  return `<div class="step-track" aria-label="Step ${current + 1} of 6">${stages.map((_, i) => `<span class="${i < current ? 'done' : i === current ? 'current' : ''}"></span>`).join('')}</div>`;
}
function renderPanel() {
  const panel = $('#turn-panel');
  if (!state) {
    panel.innerHTML = `<div class="turn-meta"><span>Better together</span><span class="role-tag">2 players</span></div><h2>How well do you<br>think in color?</h2><p class="turn-description">Think “sunshine.” Are you picturing the same yellow?</p>${waitingArt}<p class="waiting-caption">Join the game to find out. One gives the clues, one guesses. Then you swap.</p>`; return;
  }
  const giver = state.seat === state.giver;
  const meta = `<div class="turn-meta"><span>Round ${state.round}</span><span class="role-tag">You’re ${giver ? 'giving clues' : 'guessing'}</span></div>`;
  if (!bothHere()) {
    panel.innerHTML = `${meta}<h2>${welcomed ? 'Waiting for your person.' : 'Reconnecting…'}</h2><p class="turn-description">${welcomed ? `${playerName(state.seat === 'A' ? 'B' : 'A')} needs to join. Your round and scores are saved here while the server is running.` : 'Your round will continue when the connection returns.'}</p>${waitingArt}<p class="waiting-caption">Share this page’s address. On the same computer, use a different browser or a private window.</p>${stepTrack()}`; return;
  }
  let content = '';
  if (state.stage === 'choose') {
    content = giver
      ? `<h2>Pick your secret color.</h2><p class="turn-description">Which one sparks a clue? Choose a swatch, or shuffle for a fresh four.</p><div class="swatches">${state.choices.map(cell => `<button class="swatch" data-choice="${cell}" style="background:${colors[cell]}" aria-label="Choose ${coord(cell)}"><span class="swatch-label">${coord(cell)}</span></button>`).join('')}</div><button class="button quiet" id="reroll">${icon} Shuffle colors</button><p class="private-note">These four colors are visible only to you.</p>`
      : `<h2>A little mystery.</h2><p class="turn-description">${playerName(state.giver)} is choosing a secret color from four swatches.</p>${waitingArt}<p class="waiting-caption">Your first clue is on its way. There are 480 places it could lead.</p>`;
  } else if (['hint1', 'hint2'].includes(state.stage)) {
    const second = state.stage === 'hint2', limit = second ? 2 : 1;
    content = giver
      ? `<h2>${second ? 'A second thought.' : 'Make the connection.'}</h2><p class="turn-description">${second ? 'Help them get closer. Use one or two words.' : 'Describe your color in just one word.'}</p>${secretColor()}${hintList()}${second ? `<div class="guess-summary">Their first guess <strong>${coord(state.guesses[0])}</strong></div>` : ''}<form class="hint-form" id="hint-form"><label for="hint-input">${second ? 'Second hint' : 'First hint'}</label><input id="hint-input" value="${escape(draft)}" placeholder="${second ? 'e.g. summer sky' : 'e.g. sunshine'}" autocomplete="off" maxlength="80" required><div class="input-helper" id="hint-helper"><span>${second ? 'One or two words' : 'Exactly one word'}</span><span id="word-count">0 / ${limit}</span></div><button class="button primary" id="send-hint" type="submit" disabled>Send hint</button></form>`
      : `<h2>${second ? 'One more clue.' : 'The right word takes a moment.'}</h2><p class="turn-description">${playerName(state.giver)} is thinking of ${second ? 'a second hint. One or two words to bring you closer.' : 'your first hint. Just one word to point the way.'}</p>${hintList()}${waitingArt}${second ? `<div class="guess-summary">Your first guess <strong>${coord(state.guesses[0])}</strong></div>` : ''}`;
  } else if (['guess1', 'guess2'].includes(state.stage)) {
    const second = state.stage === 'guess2';
    content = giver
      ? `<h2>Let them find it.</h2><p class="turn-description">${playerName(state.guesser)} is making their ${second ? 'second' : 'first'} guess.</p>${secretColor()}${hintList()}<p class="waiting-caption">${second ? 'Both guesses will be scored after this pick.' : 'You’ll give your second hint once they lock it in.'}</p>`
      : `<h2>${second ? 'Follow the feeling.' : 'What color comes to mind?'}</h2><p class="turn-description">${second ? 'Make your second pick. You can choose the same square again.' : 'Pick a square on the board, then lock in your first guess.'}</p>${hintList()}${second ? `<div class="guess-summary">Your first guess <strong>${coord(state.guesses[0])}</strong></div>` : ''}<div class="selected-preview">${selected !== null ? `<span class="color-chip" style="background:${colors[selected]}"></span><span>Selected <strong>${coord(selected)}</strong></span>` : '<span>No color selected yet</span>'}</div><button id="lock-guess" class="button primary" ${selected === null ? 'disabled' : ''}>Lock in ${second ? 'second' : 'first'} guess</button>`;
  } else if (state.stage === 'reveal') {
    content = `<h2>${state.result.total === 6 ? 'Perfectly in sync.' : state.result.total >= 3 ? 'On the same wavelength.' : 'Now you see it.'}</h2><p class="turn-description">The secret color was <strong>${coord(state.target)}</strong>.</p><div class="secret-color"><span class="color-chip" style="background:${colors[state.target]}"></span><div>${coord(state.target)}<small>${colors[state.target].toUpperCase()}</small></div></div><div class="result-total"><strong>+${state.result.total}</strong><span>points for ${state.guesser === state.seat ? 'you' : `${playerName(state.guesser)}`}</span></div><div class="points-breakdown">${state.guesses.map((cell, i) => `<div><span>Guess ${i + 1} · ${coord(cell)}</span><strong>+${state.result.points[i]}</strong></div>`).join('')}</div><button id="next-round" class="button primary">Next round · swap roles</button><p class="private-note">${playerName(state.guesser)} gives the next clues.</p>`;
  }
  panel.innerHTML = meta + content + stepTrack();
  panel.querySelectorAll('[data-choice]').forEach(button => { button.onclick = () => send({ type: 'choose', cell: Number(button.dataset.choice) }); });
  if ($('#reroll')) $('#reroll').onclick = () => send({ type: 'reroll' });
  if ($('#hint-form')) {
    const input = $('#hint-input'), limit = state.stage === 'hint1' ? 1 : 2;
    const validate = () => {
      draft = input.value;
      const count = (draft.match(/[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu) || []).length;
      const invalid = count > limit || (draft.trim().length > 0 && count === 0);
      $('#word-count').textContent = `${count} / ${limit}`;
      $('#hint-helper').classList.toggle('invalid', invalid); input.setAttribute('aria-invalid', String(invalid));
      input.setAttribute('aria-describedby', 'hint-helper');
      $('#send-hint').disabled = !count || invalid || draft.trim().length > 80;
    };
    input.oninput = validate; validate();
    $('#hint-form').onsubmit = event => { event.preventDefault(); if (!$('#send-hint').disabled) send({ type: 'hint', text: input.value }); };
  }
  if ($('#lock-guess')) $('#lock-guess').onclick = () => { if (selected !== null) send({ type: 'guess', cell: selected }); };
  if ($('#next-round')) $('#next-round').onclick = () => send({ type: 'next' });
}
function render() {
  $('#join-panel').hidden = Boolean(state); $('#leave').hidden = !state;
  $('#restart').disabled = !bothHere();
  if (state) {
    $('#round-label').textContent = `Round ${state.round} · ${state.stage === 'reveal' ? 'The reveal' : `${playerName(state.giver)} gives the clues`}`;
    $('#headline').textContent = state.stage === 'reveal' ? 'A color worth a few words.' : state.seat === state.giver ? 'A color only you know.' : 'A clue. A color. A connection.';
    $('#subline').textContent = state.stage === 'reveal' ? 'Both guesses are in. Here’s where your minds met.' : state.seat === state.giver ? 'Find the words that take your person to the right square.' : 'See where their words take you. Every nearby square counts.';
    $('#history-section').hidden = !state.history.length;
    $('#history').innerHTML = state.history.map(round => `<div class="history-item"><span class="color-chip" style="background:${colors[round.target]}"></span><div><p>${round.hints.map(escape).join(' / ')}</p><small>Round ${round.round} · ${coord(round.target)} · ${playerName(round.guesser)}</small></div><strong>+${round.total}</strong></div>`).join('');
  } else {
    $('#round-label').textContent = 'A meeting of colorful minds'; $('#headline').textContent = 'Same color. Different clues.';
    $('#subline').textContent = 'One of you knows the color. The other connects the dots.';
    $('#history-section').hidden = true;
  }
  renderPlayers(); renderBoard(); renderPanel();
}
$('#join-open').onclick = () => {
  $('#join-open').hidden = true; $('#join-form').hidden = false; $('#join-password').focus();
};
$('#join-form').onsubmit = event => { event.preventDefault(); join($('#join-password').value); };
$('#join-password').oninput = () => joinError();
$('#leave').onclick = () => {
  if (socket?.readyState !== WebSocket.OPEN || !welcomed) { notice('Wait for your connection to return before leaving the game.'); return; }
  send({ type: 'leave' }); saveProfile(null); welcomed = false; state = null; previousTurn = ''; selected = null; draft = ''; render();
  connection('One shared room', true);
};
$('#rules-open').onclick = () => $('#rules-dialog').showModal();
$('#restart').onclick = () => $('#restart-dialog').showModal();
$('#confirm-restart').onclick = () => { if (send({ type: 'restart' })) { selected = null; draft = ''; $('#restart-dialog').close(); } };
document.querySelectorAll('[data-close]').forEach(button => { button.onclick = () => document.getElementById(button.dataset.close).close(); });
document.querySelectorAll('dialog').forEach(dialog => { dialog.addEventListener('click', event => { if (event.target === dialog) { const rect = dialog.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close(); } }); });
buildBoard(); render();
try { const saved = JSON.parse(sessionStorage.getItem('hues-seat')); if (saved?.token) profile = saved; } catch {}
openSocket();

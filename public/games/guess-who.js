import { $, escape, playerName } from '../ui.js';
import { CHARACTERS, characterById, characterTraits, portrait } from './guess-who-characters.js';

export function createGuessWhoView({send,bothHere}) {
  let state, selection = null, guessing = false, draft = '', roundKey = '';
  const opponent = () => state.seat === 'A' ? 'B' : 'A';
  const myTurn = () => bothHere() && state.stage === 'ask' && state.turn === state.seat;
  function render() {
    const choosing = state.stage === 'choose', finished = state.stage === 'reveal';
    const selectingSecret = choosing && !state.secret;
    const secret = characterById(state.secret);
    const selected = characterById(selection);
    const eliminated = new Set(state.eliminated);
    $('#round-label').textContent = `Guess Who · Round ${state.round}`;
    $('#headline').textContent = finished ? `${state.result.winner === state.seat ? 'You found your win.' : 'Mystery solved.'}` : choosing ? 'A familiar face. A little mystery.' : 'Every question narrows it down.';
    $('#subline').textContent = finished ? `${playerName(state.result.winner)} wins this round and earns 1 point.` : 'Famous faces. Questionable poker faces. Find theirs before they find yours.';
    $('#who-board-title').textContent = selectingSecret ? 'Choose your secret character' : guessing ? 'Choose your final guess' : 'Your character board';
    $('#who-count').textContent = `${CHARACTERS.length - eliminated.size} of ${CHARACTERS.length} remaining`;
    $('#who-board-note').textContent = selectingSecret ? 'Choose a character, then lock it in. Only you will see your choice.' : guessing ? 'Select a face, then confirm your final guess in the turn panel.' : finished ? 'Both secret characters are revealed below.' : choosing ? 'Your character is locked. Waiting for the other player.' : 'Tap a character to eliminate or restore it. Your eliminations are private.';
    const canUseBoard = bothHere() && (selectingSecret || ['ask','answer'].includes(state.stage));
    $('#who-grid').innerHTML = CHARACTERS.map(character => {
      const isSelected = selection === character.id && (selectingSecret || guessing);
      return `<button type="button" class="who-card${eliminated.has(character.id) ? ' eliminated' : ''}${isSelected ? ' selected-character' : ''}" data-character="${character.id}" aria-label="${escape(`${character.name}: ${characterTraits(character)}. ${selectingSecret || guessing ? 'Select character' : eliminated.has(character.id) ? 'Restore character' : 'Eliminate character'}`)}" aria-pressed="${selectingSecret || guessing ? isSelected : eliminated.has(character.id)}" ${!canUseBoard ? 'disabled' : ''}>${portrait(character)}<strong>${character.name}</strong><span class="who-traits">${escape(characterTraits(character))}</span>${eliminated.has(character.id) ? '<span class="who-out">Eliminated</span>' : ''}</button>`;
    }).join('');
    $('#who-secret').hidden = !secret;
    $('#who-secret').innerHTML = secret ? `<div class="who-secret-portrait">${portrait(secret)}</div><div><small>Your secret character</small><strong>${secret.name}</strong><p>${escape(characterTraits(secret))}</p></div>` : '';
    $('#who-restart').disabled = !bothHere();
    const meta = `<div class="turn-meta"><span>Round ${state.round}</span><span class="role-tag">${finished ? 'The reveal' : choosing ? 'Choose a face' : state.turn === state.seat ? 'Your question' : 'Their question'}</span></div>`;
    let content;
    if (!bothHere()) {
      content = '<h2>Waiting for your person.</h2><p class="turn-description">Both players need to be connected to continue. Your secret character and board are saved here.</p>';
    } else if (finished) {
      const guessed = characterById(state.result.characterId);
      content = `<h2>${state.result.winner === state.seat ? 'A point for you.' : 'A point for your person.'}</h2><p class="turn-description">${playerName(state.result.guesser)} guessed <strong>${guessed.name}</strong>. ${state.result.correct ? 'That’s the right person!' : 'A wrong final guess gives the other player the win.'}</p><div class="who-reveal">${['A','B'].map(seat => { const character = characterById(state.secrets[seat]); return `<div>${portrait(character)}<small>${playerName(seat)}</small><strong>${character.name}</strong></div>`; }).join('')}</div><button id="who-next" class="button primary">Next round · new secrets</button><p class="private-note">${playerName(state.round % 2 ? 'B' : 'A')} asks first next round.</p>`;
    } else if (choosing) {
      content = state.secret ? `<h2>Your secret is safe.</h2><p class="turn-description">You picked <strong>${secret.name}</strong>. ${playerName(opponent())} is choosing their character.</p>` : `<h2>Who will you be?</h2><p class="turn-description">Pick any face on the board. You’ll answer questions about this person.</p>${selected ? `<div class="who-selected">${portrait(selected)}<strong>${selected.name}</strong><p>${escape(characterTraits(selected))}</p></div>` : '<p class="waiting-caption">No character selected yet.</p>'}<button id="who-lock" class="button primary" ${!selected ? 'disabled' : ''}>Lock secret character</button>`;
    } else if (state.stage === 'answer') {
      content = `<h2>${state.pending.asker === state.seat ? 'Over to your person.' : 'What’s your answer?'}</h2><blockquote class="who-question">${escape(state.pending.text)}</blockquote>${state.pending.asker === state.seat ? `<p class="turn-description">${playerName(opponent())} is checking their secret character. You can eliminate faces while you wait.</p>` : `<p class="turn-description">Answer honestly about your secret character, <strong>${secret.name}</strong>.</p><div class="who-answer-actions"><button id="who-yes" class="button primary">Yes</button><button id="who-no" class="button">No</button></div>`}`;
    } else if (myTurn() && guessing) {
      content = `<h2>Ready to name them?</h2><p class="turn-description">Pick a character on the board, then confirm below.</p>${selected ? `<div class="who-selected">${portrait(selected)}<strong>${selected.name}</strong></div>` : ''}<p class="who-risk">Correct: you win 1 point. Wrong: your person wins 1 point.</p><button id="who-confirm-guess" class="button primary" ${!selected ? 'disabled' : ''}>${selected ? `Guess ${selected.name}` : 'Choose a character'}</button><button id="who-cancel-guess" class="button quiet">Keep asking questions</button>`;
    } else if (myTurn()) {
      content = `<h2>Ask a little. Learn a lot.</h2><p class="turn-description">Ask one yes/no question about their character. They’ll answer before their turn begins.</p><form id="who-ask-form" class="hint-form"><label for="who-question-input">Your question</label><input id="who-question-input" maxlength="160" required autocomplete="off" placeholder="Do they wear glasses?" value="${escape(draft)}"><p class="nutshell-input-note">Try their photo, career, or something they’re known for.</p><button class="button primary" type="submit">Ask question</button></form><button id="who-guess-mode" class="button quiet">Make a final guess</button>`;
    } else {
      content = `<h2>Their turn to wonder.</h2><p class="turn-description">${playerName(opponent())} is thinking of a question. Keep narrowing your board while you wait.</p>`;
    }
    $('#who-panel').innerHTML = meta + content;
    document.querySelectorAll('[data-character]').forEach(button => { button.onclick = () => {
      const id = button.dataset.character;
      if (selectingSecret || (myTurn() && guessing)) { selection = id; render(); }
      else send({type:'toggle-character',characterId:id});
    }; });
    if ($('#who-lock')) $('#who-lock').onclick = () => { if (selection) send({type:'choose-character',characterId:selection}); };
    if ($('#who-next')) $('#who-next').onclick = () => send({type:'next'});
    for (const [selector,answer] of [['#who-yes',true],['#who-no',false]]) if ($(selector)) $(selector).onclick = () => send({type:'answer-question',answer});
    if ($('#who-ask-form')) {
      $('#who-question-input').oninput = event => { draft = event.target.value; };
      $('#who-ask-form').onsubmit = event => { event.preventDefault(); if (draft.trim()) send({type:'ask-question',text:draft}); };
    }
    if ($('#who-guess-mode')) $('#who-guess-mode').onclick = () => { guessing = true; selection = null; render(); };
    if ($('#who-cancel-guess')) $('#who-cancel-guess').onclick = () => { guessing = false; selection = null; render(); };
    if ($('#who-confirm-guess')) $('#who-confirm-guess').onclick = () => { if (selection) send({type:'guess-character',characterId:selection}); };
    $('#who-question-log').innerHTML = state.questions.length ? [...state.questions].reverse().map(question => `<div class="who-log-item"><p>${escape(question.text)}</p><span>${playerName(question.asker)} asked · <strong>${question.answer ? 'Yes' : 'No'}</strong></span></div>`).join('') : '<p class="who-empty-log">Your answered questions will appear here.</p>';
    $('#who-history-section').hidden = !state.history.length;
    $('#who-history').innerHTML = state.history.map(item => `<div class="nutshell-history-item"><div><p>${playerName(item.winner)} won round ${item.round}</p><small>Player 1: ${characterById(item.secrets.A).name} · Player 2: ${characterById(item.secrets.B).name}</small></div><strong>+1</strong></div>`).join('');
  }
  $('#who-photo-credits').innerHTML = CHARACTERS.map(character => `<p><strong>${escape(character.name)}</strong><br>${escape(character.author)} · <a href="${escape(character.source)}" target="_blank" rel="noopener noreferrer">Photo source</a> · <a href="${escape(character.licenseUrl)}" target="_blank" rel="noopener noreferrer">${escape(character.license)}</a></p>`).join('');
  $('#who-restart').onclick = () => $('#who-restart-dialog').showModal();
  $('#who-confirm-restart').onclick = () => { if (send({type:'restart'})) { selection = null; guessing = false; draft = ''; roundKey = ''; $('#who-restart-dialog').close(); } };
  return {
    update(next) {
      const key = `${next.round}:${next.stage}:${next.turn}:${next.secret}`;
      if (key !== roundKey) { selection = null; guessing = false; draft = ''; }
      const focusedCharacter = document.activeElement?.dataset?.character;
      roundKey = key; state = next; render();
      if (focusedCharacter) document.querySelector(`[data-character="${focusedCharacter}"]`)?.focus({preventScroll:true});
    },
    deactivate() { state = null; selection = null; guessing = false; draft = ''; roundKey = ''; $('#who-restart-dialog').close(); },
  };
}

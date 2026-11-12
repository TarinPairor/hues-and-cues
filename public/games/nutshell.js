import { $, escape, playerName } from '../ui.js';

export function createNutshellView({ send, bothHere }) {
  let state, visible = new Set(), draft = '', turn = '';
  const panel = $('#nutshell-panel');
  function render() {
    const picker = state.seat === state.giver, choosing = state.stage === 'pick', finished = state.stage === 'reveal';
    const shown = choosing ? (picker ? visible.size : 0) : state.revealed.length;
    const hidden = state.words.length - shown;
    $('#round-label').textContent = `In a Nutshell · Round ${state.round}`;
    $('#headline').textContent = finished ? (state.result.correct ? 'Cracked it.' : 'A tough nut to crack.') : picker ? 'How little can you give away?' : 'Can you fill in the gaps?';
    $('#subline').textContent = 'A familiar question. Fewer words. A bigger leap.';
    $('#nutshell-board-title').textContent = finished ? 'The whole question' : picker ? 'Your secret question' : 'Your question windows';
    $('#nutshell-word-count').textContent = `${shown} of ${state.words.length} words revealed`;
    $('#nutshell-windows').innerHTML = state.words.map((word, i) => {
      const open = finished || (choosing ? picker && visible.has(i) : state.revealed.includes(i));
      const label = picker && choosing ? `${open ? 'Hide' : 'Reveal'} word ${i + 1}: ${word}` : `Word ${i + 1}: ${word ?? 'hidden'}`;
      return `<${picker && choosing ? 'button' : 'div'} class="word-window ${open ? 'open' : 'covered'}" ${picker && choosing ? `type="button" data-word="${i}" aria-pressed="${open}" ${!bothHere() ? 'disabled' : ''}` : ''} aria-label="${escape(label)}"><span class="word-number">${i + 1}</span><span class="window-slot"><span class="window-text">${escape(word ?? 'Hidden word')}</span><span class="window-slider" aria-hidden="true"></span></span><span class="window-status">${open ? 'Revealed' : 'Hidden'}</span></${picker && choosing ? 'button' : 'div'}>`;
    }).join('');
    $('#nutshell-board-note').textContent = finished ? 'Every word is now revealed.' : picker && choosing ? 'Tap a word to hide or reveal it. Only you can see the full question.' : picker ? 'Your words are locked. Your person gets one answer.' : choosing ? 'The Nut Picker is choosing your words in secret.' : 'Use the visible words to work out the question, then type its answer.';
    $('#nutshell-answer').hidden = !picker && !finished;
    $('#nutshell-answer').textContent = `Answer: ${state.answer ?? ''}`;
    $('#nutshell-restart').disabled = !bothHere();
    const meta = `<div class="turn-meta"><span>Round ${state.round}</span><span class="role-tag">${picker ? 'Nut Picker' : 'Guesser'}</span></div>`;
    if (!bothHere()) {
      panel.innerHTML = `${meta}<h2>Waiting for your person.</h2><p class="turn-description">Both players need to be connected to continue. Your question and scores are saved while the server is running.</p>`;
    } else if (finished) {
      panel.innerHTML = `${meta}<h2>${state.result.correct ? 'They got it!' : 'Not this time.'}</h2><p class="turn-description">${playerName(state.guesser)} answered <strong>${escape(state.result.guess)}</strong>.</p><p class="nutshell-correct-answer">${escape(state.result.answer)}</p><div class="result-total"><strong>+${state.result.points}</strong><span>points for ${playerName(state.result.scorer)}</span></div><p class="turn-description">${state.result.correct ? `${state.result.hidden} hidden words, ${state.result.points} points.` : 'A wrong answer scores 0 points.'}</p><button id="nutshell-next" class="button primary">Next round · swap roles</button>`;
    } else if (choosing && picker) {
      panel.innerHTML = `${meta}<h2>Less is more. Maybe.</h2><p class="turn-description">Hide words your person can do without. Keep at least one revealed.</p><div class="nutshell-stakes"><strong>${hidden}</strong><span>points if they get it right<br>0 if they get it wrong</span></div><p class="turn-description">${shown} ${shown === 1 ? 'word' : 'words'} revealed · ${hidden} hidden</p><button id="nutshell-lock" class="button primary" ${shown < 1 ? 'disabled' : ''}>Lock words for ${playerName(state.guesser)}</button>`;
    } else if (choosing) {
      panel.innerHTML = `${meta}<h2>A question is taking shape.</h2><p class="turn-description">${playerName(state.giver)} is deciding how much to give away. Your words will appear once they lock them in.</p>`;
    } else if (picker) {
      panel.innerHTML = `${meta}<h2>The risk is set.</h2><p class="turn-description">${playerName(state.guesser)} is working out the answer.</p><div class="nutshell-stakes"><strong>${hidden}</strong><span>points on the line<br>One answer decides it.</span></div>`;
    } else {
      panel.innerHTML = `${meta}<h2>What’s the answer?</h2><p class="turn-description">Piece together the question from ${shown} revealed ${shown === 1 ? 'word' : 'words'}. You get one guess.</p><form id="nutshell-answer-form" class="hint-form"><label for="nutshell-guess">Your answer</label><input id="nutshell-guess" maxlength="120" autocomplete="off" required value="${escape(draft)}" placeholder="Type your answer"><p class="nutshell-input-note">Uppercase or lowercase both work.</p><button class="button primary" type="submit">Lock in answer</button></form>`;
    }
    document.querySelectorAll('[data-word]').forEach(button => { button.onclick = () => { const i = Number(button.dataset.word); if (visible.has(i)) visible.delete(i); else visible.add(i); render(); }; });
    if ($('#nutshell-lock')) $('#nutshell-lock').onclick = () => send({ type: 'reveal-words', indices: [...visible] });
    if ($('#nutshell-next')) $('#nutshell-next').onclick = () => send({ type: 'next' });
    if ($('#nutshell-answer-form')) {
      $('#nutshell-guess').oninput = event => { draft = event.target.value; };
      $('#nutshell-answer-form').onsubmit = event => { event.preventDefault(); if (draft.trim()) send({ type: 'answer', text: draft }); };
    }
    $('#nutshell-history-section').hidden = !state.history.length;
    $('#nutshell-history').innerHTML = state.history.map(item => `<div class="nutshell-history-item"><div><p>${escape(item.question)}</p><small>Round ${item.round} · ${escape(item.answer)} · ${playerName(item.scorer)}</small></div><strong>+${item.points}</strong></div>`).join('');
  }
  $('#nutshell-restart').onclick = () => $('#nutshell-restart-dialog').showModal();
  $('#nutshell-confirm-restart').onclick = () => { if (send({ type: 'restart' })) $('#nutshell-restart-dialog').close(); };
  return {
    update(next) {
      const key = `${next.round}:${next.stage}:${next.words.join('|')}`;
      if (key !== turn) { visible = new Set(next.words.map((_, i) => i)); draft = ''; }
      turn = key; state = next; render();
    },
    deactivate() { state = null; turn = ''; draft = ''; visible.clear(); $('#nutshell-restart-dialog').close(); },
  };
}
